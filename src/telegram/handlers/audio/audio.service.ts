import { TelegramEventHandler } from "@/telegram/telegramEventHandler";
import TelegramBot, { Message } from "node-telegram-bot-api";
import { inject, injectable } from "inversify";
import { globalInjectionTokens } from "@/di/globalInjectionTokens";
import { LoggerService } from "@/logger.service";
import _ from "lodash";
import { telegramInjectionTokens } from "@/telegram/telegramInjectionTokens";
import { BotService } from "@/telegram/bot.service";
import { EnumErrorCode, EnumInfoCode } from "@/telegram/operationCodes";
import { DownloadService } from "@/telegram/download.service";
import { yandexInjectionTokens } from "@/yandex/yandex.tokens";
import { YandexSttService } from "@/yandex/yandexStt.service";
import { PassThrough, Readable } from "node:stream";
import { ffmpegInjectionTokens } from "@/ffmpeg/ffmpeg.tokens";
import { FfmpegService } from "@/ffmpeg/ffmpeg.service";
import { YandexArtService } from "@/yandex/yandexArt.service";
import { SpeechRecognitionAlternative } from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/ai/stt/v2/stt_service";
import { pipeline } from "stream/promises";
import { getRandomInt } from "@/utils/getRandomInt";
import fsExtra from "fs-extra";
//@ts-ignore
import awaitSpawn from "await-spawn";
import path from "node:path";
import * as os from "node:os";

@injectable()
export class AudioService implements TelegramEventHandler<"audio"> {
    constructor(
        @inject(globalInjectionTokens.LoggerService)
        private loggerService: LoggerService,

        @inject(telegramInjectionTokens.BotService)
        private botService: BotService,

        @inject(telegramInjectionTokens.DownloadService)
        private downloadService: DownloadService,

        @inject(ffmpegInjectionTokens.FFMpegService)
        private ffmpegService: FfmpegService,

        @inject(yandexInjectionTokens.YandexSttServiceProvider)
        private yandexSttServiceProvider: () => Promise<YandexSttService>,

        @inject(yandexInjectionTokens.YandexArtServiceProvider)
        private yandexArtServiceProvider: () => Promise<YandexArtService>,
    ) {}

    get eventName() {
        return "audio" as const;
    }

    async handler(message: Message) {
        const chatId = _.get(message, "chat.id");
        const audio = _.get(message, "audio");
        const { code, ok } = this.precheckAudio(audio);

        if (!ok) {
            await this.botService.sendErrorMessage(chatId, code);

            return;
        }

        await this.botService.sendInfoMessage(chatId, code);
        const fileId = _.get(audio, "file_id");

        if (!fileId) {
            await this.botService.sendErrorMessage(chatId, EnumErrorCode.DOWNLOADING_ERROR);

            return;
        }

        const audioInfo = await this.downloadService.getFileInfo(fileId);
        const audioPath = _.get(audioInfo, "result.file_path");

        if (!audioPath || _.isEmpty(audioPath)) {
            await this.botService.sendErrorMessage(chatId, EnumErrorCode.DOWNLOADING_ERROR);

            return;
        }

        const audioResponseStream = await this.downloadService.getFileStream(audioPath);

        if (!audioResponseStream) {
            await this.botService.sendErrorMessage(chatId, EnumErrorCode.DOWNLOADING_ERROR);

            return;
        }

        const directory = fsExtra.mkdtempSync(path.join(os.tmpdir(), "tgaudiobot"));
        console.log({ directory });
        const file = fsExtra.createWriteStream(path.join(directory, "file.mp3"));

        await pipeline(audioResponseStream, file);

        const fileStream = fsExtra.createReadStream(path.join(directory, "file.mp3"));
        const oggStream = await this.getOggStream(fileStream);

        if (!oggStream) {
            await this.botService.sendErrorMessage(chatId, EnumErrorCode.PROCESSING_ERROR);

            return;
        }

        const textChunks = await this.handleSttTransform(oggStream, async (alternative) => {
            await this.botService.sendMessage(chatId, alternative.text);
        });

        await this.botService.sendMessage(
            chatId,
            "Successfully processed stt: \n" + textChunks.map((item) => item.text).join("\n"),
        );

        const imageChunkMap = await this.getGeneratedImages(textChunks);
        await this.botService.sendMessage(chatId, "Successfully process image generation");

        const imageExtension = ".jpg";
        const resultGenerationMap = _.chain(textChunks)
            .sortBy((item) => item.startTime)
            .map((item) => ({
                ...item,
                imageData: imageChunkMap.get(item.text),
                duration: item.endTime - item.startTime,
                uniqueId: getRandomInt(),
            }))
            .value();

        const ffmpegConcatInput = _.reduce(
            resultGenerationMap,
            (accum, chunk, index) => {
                const getFileInfoLine = (filename: string | number, duration: number) =>
                    "file " +
                    "'" +
                    filename +
                    imageExtension +
                    "'" +
                    "\n" +
                    "duration " +
                    duration +
                    "\n";

                let imageInfo: string = "";

                if (index === resultGenerationMap.length - 1) {
                    const totalDuration = _.reduce(
                        resultGenerationMap,
                        (accum, { duration }) => accum + duration,
                        0,
                    );

                    imageInfo = getFileInfoLine(chunk.uniqueId, totalDuration);
                } else {
                    imageInfo = getFileInfoLine(chunk.uniqueId, chunk.duration);
                }

                return accum + imageInfo;
            },
            "",
        );

        await fsExtra.writeFile(path.join(directory, "input.txt"), ffmpegConcatInput);

        for (const data of resultGenerationMap.values()) {
            if (!data.imageData) {
                continue;
            }

            await fsExtra.writeFile(
                path.join(directory, data.uniqueId.toString() + imageExtension),
                data.imageData,
                {
                    encoding: "base64",
                },
            );
        }

        await this.botService.sendMessage(chatId, "Start generating video...");
        await awaitSpawn(
            "ffmpeg",
            [
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                "input.txt",
                "-i",
                "file.mp3",
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "aac",
                "-shortest",
                "output.mp4",
            ],
            { cwd: directory },
        );
        await this.botService.sendMessage(
            chatId,
            "Video successfully generated. Wait for upload...",
        );

        const outputFile = fsExtra.createReadStream(path.join(directory, "output.mp4"));
        await this.botService.sendMp4Video(chatId, outputFile);
    }

    private async handleSttTransform(
        oggStream: PassThrough,
        onChunkReceive?: (alternative: SpeechRecognitionAlternative) => Promise<void> | void,
    ) {
        const totalTextChunks: TextChunk[] = [];
        let bufferedChunk: TextChunk | undefined;
        const yandexSttService = await this.yandexSttServiceProvider();

        for await (const chunk of yandexSttService.oggToText(oggStream)) {
            if (!chunk) {
                continue;
            }

            const sttAlternative = _.chain(chunk.chunks)
                .flatMap((chunk) => _.head(chunk.alternatives))
                .compact()
                .head()
                .value();

            if (_.isFunction(onChunkReceive)) {
                await onChunkReceive(sttAlternative);
            }

            const text = _.get(sttAlternative, "text");
            const startTime = _.get(_.head(sttAlternative.words), "startTime.seconds");
            const endTime = _.get(_.last(sttAlternative.words), "endTime.seconds");

            if (!startTime || !endTime) {
                continue;
            }

            const currentChunk: TextChunk = {
                text,
                startTime,
                endTime,
            };

            if (bufferedChunk) {
                currentChunk.text = `${bufferedChunk.text} ${currentChunk.text}`;
                currentChunk.startTime = bufferedChunk.startTime;
            }

            if (currentChunk.text.length < 50) {
                bufferedChunk = currentChunk;

                continue;
            }

            totalTextChunks.push(currentChunk);
            bufferedChunk = undefined;
        }

        const lastItem = _.last(totalTextChunks);
        if (bufferedChunk && lastItem) {
            lastItem.text = `${bufferedChunk.text} ${lastItem.text}`;
            lastItem.startTime = bufferedChunk.startTime;
        }

        return totalTextChunks;
    }

    private async getGeneratedImages(textChunks: TextChunk[]) {
        const artService = await this.yandexArtServiceProvider();
        const chunkToImageMap = new Map<string, string>();

        await Promise.all(
            _.map(
                textChunks,
                (chunk) =>
                    new Promise(async (res) => {
                        const data = await artService.getGeneratedImage(chunk.text);

                        if (data) {
                            chunkToImageMap.set(chunk.text, data);
                        }

                        res(void 0);
                    }),
            ),
        );

        return chunkToImageMap;
    }

    // possible bottleneck - telegram seems to convert all audio files to mp3
    // need to manually convert them to ogg / wav as stt.v2 doesn't support mp3 streaming
    private async getOggStream(mp3WebStream: Readable) {
        const ffmpegCommandResult = this.ffmpegService.convertToOgg(mp3WebStream);
        const oggStream = ffmpegCommandResult.pipe();

        if (!(oggStream instanceof PassThrough)) {
            return undefined;
        }

        return oggStream;
    }

    private precheckAudio(
        audio?: TelegramBot.Audio,
    ): { ok: false; code: EnumErrorCode } | { ok: true; code: EnumInfoCode } {
        if (!audio) {
            return {
                ok: false,
                code: EnumErrorCode.NO_AUDIO_PROVIDED,
            };
        }

        if (audio.duration > 250) {
            return {
                ok: false,
                code: EnumErrorCode.TOO_LONG_FILE,
            };
        }

        if (!audio.mime_type) {
            return {
                ok: false,
                code: EnumErrorCode.UNSUPPORTED_CODEC,
            };
        }

        return {
            ok: true,
            code: EnumInfoCode.START_OPERATION,
        };
    }
}

interface TextChunk {
    text: string;
    startTime: number;
    endTime: number;
}
