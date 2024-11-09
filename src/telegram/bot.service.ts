import TelegramBot from 'node-telegram-bot-api';
import { LoggerService } from '@/logger.service';
import {
    EnumErrorCode,
    EnumInfoCode,
    errorCodeToTextMap,
    infoCodeToTextMap,
} from '@/telegram/operationCodes';
import { decorate, inject, injectable } from 'inversify';
import { globalInjectionTokens } from '@/di/global.tokens';
import { ConfigService } from '@/config.service';

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
            throw new Error('no telegram telegram key provided');
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
        this.loggerService.error('BotService: sendErrorMessage', code);

        return this.sendMessage(chatId, errorCodeToTextMap[code]);
    }

    sendInfoMessage(chatId: TelegramBot.ChatId, code: EnumInfoCode) {
        this.loggerService.error('BotService: sendInfoMessage', code);

        return this.sendMessage(chatId, infoCodeToTextMap[code]);
    }
}
