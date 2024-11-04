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
import streamWeb from "node:stream/web";
import { ffmpegInjectionTokens } from "@/ffmpeg/ffmpeg.tokens";
import { FfmpegService } from "@/ffmpeg/ffmpeg.service";
import { YandexArtService } from "@/yandex/yandexArt.service";

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

        const audioFileResponse = await this.downloadService.getFileResponse(audioPath);

        if (!audioFileResponse.ok || !audioFileResponse.body) {
            await this.botService.sendErrorMessage(chatId, EnumErrorCode.DOWNLOADING_ERROR);

            return;
        }

        // possible bottleneck - telegram seems to convert all audio files to mp3
        // need to manually convert them to ogg / wav as stt.v2 doesn't support mp3 streaming

        const mp3Stream = Readable.fromWeb(audioFileResponse.body as streamWeb.ReadableStream);
        const ffmpegCommandResult = this.ffmpegService.convertToOgg(mp3Stream);
        const oggStream = ffmpegCommandResult.pipe();

        if (!(oggStream instanceof PassThrough)) {
            await this.botService.sendErrorMessage(chatId, EnumErrorCode.PROCESSING_ERROR);

            return;
        }

        const imageGenerationPromises: Promise<string | undefined>[] = [];
        const sttChunkMessageIds: number[] = [];

        const yandexSttService = await this.yandexSttServiceProvider();
        const yandexArtService = await this.yandexArtServiceProvider();

        for await (const chunk of yandexSttService.oggToText(oggStream)) {
            if (!chunk) {
                continue;
            }

            console.log(JSON.stringify(chunk));

            const chunksText = _.chain(chunk.chunks)
                .flatMap((chunk) => _.head(chunk.alternatives))
                .compact()
                .flatMap((alternative) => alternative.text)
                .join(" ")
                .value();
            const sendMessage = await this.botService.sendMessage(chatId, chunksText);

            // imageGenerationPromises.push(yandexArtService.getGeneratedImage(chunksText));
            // sttChunkMessageIds.push(sendMessage.message_id);
        }
        // const resultImages = await Promise.all(imageGenerationPromises);

        // for (const [image, id] of _.zip(_.compact(resultImages), sttChunkMessageIds)) {
        //     if (!image || !id) {
        //         return;
        //     }
        //
        //     await this.botService.sendBase64Image(chatId, image, { reply_to_message_id: id });
        // }
        //
        await this.botService.sendMessage(chatId, "MEGAEND");
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
const obj = {
    $type: "yandex.cloud.ai.stt.v2.StreamingRecognitionResponse",
    chunks: [
        {
            $type: "yandex.cloud.ai.stt.v2.SpeechRecognitionChunk",
            final: true,
            endOfUtterance: true,
            alternatives: [
                {
                    $type: "yandex.cloud.ai.stt.v2.SpeechRecognitionAlternative",
                    text: "Обожжешься змеей вот и удача в конце то концов",
                    confidence: 1,
                    words: [
                        {
                            $type: "yandex.cloud.ai.stt.v2.WordInfo",
                            word: "обожжешься",
                            confidence: 1,
                            startTime: {
                                $type: "google.protobuf.Duration",
                                seconds: 32,
                                nanos: 440000000,
                            },
                            endTime: { $type: "google.protobuf.Duration", seconds: 33, nanos: 0 },
                        },
                        {
                            $type: "yandex.cloud.ai.stt.v2.WordInfo",
                            word: "змеей",
                            confidence: 1,
                            startTime: {
                                $type: "google.protobuf.Duration",
                                seconds: 33,
                                nanos: 100000000,
                            },
                            endTime: {
                                $type: "google.protobuf.Duration",
                                seconds: 33,
                                nanos: 860000000,
                            },
                        },
                        {
                            $type: "yandex.cloud.ai.stt.v2.WordInfo",
                            word: "вот",
                            confidence: 1,
                            startTime: {
                                $type: "google.protobuf.Duration",
                                seconds: 33,
                                nanos: 940000000,
                            },
                            endTime: {
                                $type: "google.protobuf.Duration",
                                seconds: 34,
                                nanos: 138000000,
                            },
                        },
                        {
                            $type: "yandex.cloud.ai.stt.v2.WordInfo",
                            word: "и",
                            confidence: 1,
                            startTime: {
                                $type: "google.protobuf.Duration",
                                seconds: 34,
                                nanos: 200000000,
                            },
                            endTime: {
                                $type: "google.protobuf.Duration",
                                seconds: 34,
                                nanos: 220000000,
                            },
                        },
                        {
                            $type: "yandex.cloud.ai.stt.v2.WordInfo",
                            word: "удача",
                            confidence: 1,
                            startTime: {
                                $type: "google.protobuf.Duration",
                                seconds: 34,
                                nanos: 238000000,
                            },
                            endTime: {
                                $type: "google.protobuf.Duration",
                                seconds: 34,
                                nanos: 640000000,
                            },
                        },
                        {
                            $type: "yandex.cloud.ai.stt.v2.WordInfo",
                            word: "в",
                            confidence: 1,
                            startTime: {
                                $type: "google.protobuf.Duration",
                                seconds: 35,
                                nanos: 120000000,
                            },
                            endTime: {
                                $type: "google.protobuf.Duration",
                                seconds: 35,
                                nanos: 140000000,
                            },
                        },
                        {
                            $type: "yandex.cloud.ai.stt.v2.WordInfo",
                            word: "конце",
                            confidence: 1,
                            startTime: {
                                $type: "google.protobuf.Duration",
                                seconds: 35,
                                nanos: 180000000,
                            },
                            endTime: {
                                $type: "google.protobuf.Duration",
                                seconds: 35,
                                nanos: 580000000,
                            },
                        },
                        {
                            $type: "yandex.cloud.ai.stt.v2.WordInfo",
                            word: "то",
                            confidence: 1,
                            startTime: {
                                $type: "google.protobuf.Duration",
                                seconds: 35,
                                nanos: 680000000,
                            },
                            endTime: {
                                $type: "google.protobuf.Duration",
                                seconds: 35,
                                nanos: 800000000,
                            },
                        },
                        {
                            $type: "yandex.cloud.ai.stt.v2.WordInfo",
                            word: "концов",
                            confidence: 1,
                            startTime: {
                                $type: "google.protobuf.Duration",
                                seconds: 35,
                                nanos: 920000000,
                            },
                            endTime: {
                                $type: "google.protobuf.Duration",
                                seconds: 36,
                                nanos: 300000000,
                            },
                        },
                    ],
                },
            ],
        },
    ],
};
