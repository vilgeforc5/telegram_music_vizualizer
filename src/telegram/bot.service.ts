import TelegramBot from "node-telegram-bot-api";
import { LoggerService } from "@/logger.service";
import {
    EnumErrorCode,
    EnumInfoCode,
    errorCodeToTextMap,
    infoCodeToTextMap,
} from "@/telegram/operationCodes";
import { decorate, inject, injectable } from "inversify";
import { globalInjectionTokens } from "@/di/globalInjectionTokens";
import { ConfigService } from "@/config.service";
import { Stream } from "node:stream";
import { getRandomInt } from "@/utils/getRandomInt";

decorate(injectable(), TelegramBot);

@injectable()
export class BotService extends TelegramBot {
    constructor(
        @inject(globalInjectionTokens.LoggerService)
        private loggerService: LoggerService,

        @inject(globalInjectionTokens.ConfigService)
        configService: ConfigService,
    ) {
        if (!configService.tgBotKey) {
            throw new Error("no telegram telegram key provided");
        }

        super(configService.tgBotKey, {
            polling: false,
            //@ts-ignore
            request: {
                agentOptions: {
                    keepAlive: true,
                    family: 4,
                },
            },
        });
    }

    sendErrorMessage(chatId: TelegramBot.ChatId, code: EnumErrorCode) {
        this.loggerService.error(code);

        return this.sendMessage(chatId, errorCodeToTextMap[code]);
    }

    sendInfoMessage(chatId: TelegramBot.ChatId, code: EnumInfoCode) {
        this.loggerService.error(code);

        return this.sendMessage(chatId, infoCodeToTextMap[code]);
    }

    sendBase64Image(
        chatId: TelegramBot.ChatId,
        imageData: string,
        options?: TelegramBot.SendPhotoOptions,
    ) {
        return this.sendPhoto(chatId, Buffer.from(imageData, "base64"), options || {}, {
            filename: `${getRandomInt()}.jpg`,
            contentType: "application/octet-stream",
        });
    }

    sendMp4Video(
        chatId: TelegramBot.ChatId,
        videoStream: Stream,
        options?: TelegramBot.SendVideoOptions,
    ) {
        return this.sendVideo(chatId, videoStream, options || {}, {
            filename: `${getRandomInt()}.mp4`,
            contentType: "application/octet-stream",
        });
    }
}
