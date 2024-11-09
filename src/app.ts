import { inject, injectable } from 'inversify';
import { globalInjectionTokens } from '@/di/global.tokens';
import { LoggerService } from '@/logger.service';
import { telegramInjectionTokens } from '@/telegram/telegram.tokens';
import { TelegramService } from '@/telegram/telegram.service';

@injectable()
export class App {
    constructor(
        @inject(telegramInjectionTokens.TelegramService)
        private telegramService: TelegramService,

        @inject(globalInjectionTokens.LoggerService)
        private loggerService: LoggerService,
    ) {}

    async init() {
        try {
            this.loggerService.info('Staring app');

            await this.telegramService.init();
        } catch (error) {
            this.loggerService.error('Error starting app', error);
        }
    }
}
