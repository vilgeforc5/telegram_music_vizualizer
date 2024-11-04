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

        super(configService.tgBotKey, { polling: false });
    }

    sendErrorMessage(chatId: TelegramBot.ChatId, code: EnumErrorCode) {
        this.loggerService.error(code);

        return this.sendMessage(chatId, errorCodeToTextMap[code]);
    }

    sendInfoMessage(chatId: TelegramBot.ChatId, code: EnumInfoCode) {
        this.loggerService.error(code);

        return this.sendMessage(chatId, infoCodeToTextMap[code]);
    }

    sendBase64Image(chatId: TelegramBot.ChatId, imageData: string) {
        return this.sendPhoto(
            chatId,
            Buffer.from(imageData, "base64"),
            {},
            { filename: "test.jpg", contentType: "application/octet-stream" },
        );
    }
}