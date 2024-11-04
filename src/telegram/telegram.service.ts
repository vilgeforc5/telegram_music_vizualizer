import { inject, injectable, multiInject } from "inversify";
import { telegramInjectionTokens } from "@/telegram/telegramInjectionTokens";
import { TelegramEventHandler } from "@/telegram/telegramEventHandler";
import { TelegramEvents } from "node-telegram-bot-api";
import { globalInjectionTokens } from "@/di/globalInjectionTokens";
import { LoggerService } from "@/logger.service";
import { BotService } from "@/telegram/bot.service";
import _ from "lodash";

@injectable()
export class TelegramService {
    constructor(
        @inject(telegramInjectionTokens.BotService)
        private botService: BotService,

        @multiInject(telegramInjectionTokens.EventHandler)
        private eventHandlers: TelegramEventHandler<keyof TelegramEvents>[],

        @inject(globalInjectionTokens.LoggerService)
        private loggerService: LoggerService,
    ) {}

    async init() {
        try {
            this.loggerService.info("Initializing Telegram Bot");
            this.registerEventHandlers();

            if (this.botService.isPolling()) {
                this.loggerService.info("Stopping existing telegram process");
                await this.botService.stopPolling();
            }

            await this.botService.startPolling();
            this.loggerService.info("Bot successfully started");
        } catch (error) {
            this.loggerService.error("Error initializing telegram", error);
        }
    }

    registerEventHandlers() {
        _.forEach(this.eventHandlers, (eventHandler) => {
            this.botService.on(eventHandler.eventName, (...args: unknown[]) => {
                try {
                    //@ts-ignore Telegram types error: Types of parameters query and message are incompatible.
                    eventHandler.handler.apply(eventHandler, args);
                } catch (error) {
                    this.loggerService.error(error);
                }
            });
        });
    }
}
