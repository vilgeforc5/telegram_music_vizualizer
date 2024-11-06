import { TelegramEvents } from 'node-telegram-bot-api';

export interface TelegramEventHandler<T extends keyof TelegramEvents> {
    handler: TelegramEvents[T];
    eventName: T;
}
