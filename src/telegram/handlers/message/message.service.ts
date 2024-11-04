import { inject, injectable } from "inversify";
import { TelegramEventHandler } from "@/telegram/telegramEventHandler";
import { Message, Metadata } from "node-telegram-bot-api";
import { globalInjectionTokens } from "@/di/globalInjectionTokens";
import { LoggerService } from "@/logger.service";
import { yandexInjectionTokens } from "@/yandex/yandex.tokens";
import { YandexArtService } from "@/yandex/yandexArt.service";
import { telegramInjectionTokens } from "@/telegram/telegramInjectionTokens";
import { BotService } from "@/telegram/bot.service";
import _ from "lodash";

/**
 * @description implemented as example that multiInject works
 */
@injectable()
export class MessageService implements TelegramEventHandler<"message"> {
    constructor(
        @inject(globalInjectionTokens.LoggerService)
        private loggerService: LoggerService,

        @inject(yandexInjectionTokens.YandexArtService)
        private yandexArtService: YandexArtService,

        @inject(telegramInjectionTokens.BotService)
        private botService: BotService,
    ) {}

    get eventName() {
        return "message" as const;
    }

    async handler(message: Message, metadata: Metadata) {
        const chatId = _.get(message, "chat.id");
        this.loggerService.info("MessageService:", message, metadata);

        if (!message.text) {
            return;
        }

        const result = await Promise.all([
            this.yandexArtService.getGeneratedImage("cat"),
            this.yandexArtService.getGeneratedImage("dog"),
        ]);

        for (const image of _.compact(result)) {
            await this.botService.sendBase64Image(chatId, image);
        }
    }
}
