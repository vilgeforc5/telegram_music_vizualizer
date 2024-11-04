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

        @inject(yandexInjectionTokens.YandexSttService)
        private yandexSttService: YandexSttService,

        @inject(ffmpegInjectionTokens.FFMpegService)
        private ffmpegService: FfmpegService,

        @inject(yandexInjectionTokens.YandexArtService)
        private yandexArtService: YandexArtService,
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
        const ffmpegCommandResult = this.ffmpegService.convertMp3ToOgg(mp3Stream);
        const oggStream = ffmpegCommandResult.pipe();

        if (!(oggStream instanceof PassThrough)) {
            await this.botService.sendErrorMessage(chatId, EnumErrorCode.PROCESSING_ERROR);

            return;
        }

        const imageGenerationPromises: Promise<string | undefined>[] = [];

        for await (const chunk of this.yandexSttService.transform(oggStream)) {
            if (!chunk) {
                continue;
            }

            const chunksText = _.chain(chunk.chunks)
                .flatMap((chunk) => _.head(chunk.alternatives))
                .compact()
                .flatMap((alternative) => alternative.text)
                .join(" ")
                .value();

            imageGenerationPromises.push(this.yandexArtService.getGeneratedImage(chunksText));

            await this.botService.sendMessage(chatId, chunksText);
        }

        const result = await Promise.all(imageGenerationPromises);
        for (const item of _.compact(result)) {
            await this.botService.sendBase64Image(chatId, item);
        }

        await this.botService.sendMessage(chatId, "ura ura");
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
