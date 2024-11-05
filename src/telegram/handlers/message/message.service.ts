import { inject, injectable } from "inversify";
import { TelegramEventHandler } from "@/telegram/telegramEventHandler";
import { Message, Metadata } from "node-telegram-bot-api";
import { globalInjectionTokens } from "@/di/globalInjectionTokens";
import { LoggerService } from "@/logger.service";
import { yandexInjectionTokens } from "@/yandex/yandex.tokens";
import { YandexArtService } from "@/yandex/yandexArt.service";
import { telegramInjectionTokens } from "@/telegram/telegramInjectionTokens";
import { BotService } from "@/telegram/bot.service";

/**
 * @description implemented as example that multiInject works
 */
@injectable()
export class MessageService implements TelegramEventHandler<"message"> {
    constructor(
        @inject(globalInjectionTokens.LoggerService)
        private loggerService: LoggerService,

        @inject(yandexInjectionTokens.YandexArtServiceProvider)
        private yandexArtServiceProvider: () => Promise<YandexArtService>,

        @inject(telegramInjectionTokens.BotService)
        private botService: BotService,
    ) {}

    get eventName() {
        return "message" as const;
    }

    async handler(message: Message, metadata: Metadata) {}
}
