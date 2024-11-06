import { injectable } from 'inversify';
import { TelegramEventHandler } from '@/telegram/telegramEventHandler';

/**
 * @description implemented as example that multiInject works
 */
@injectable()
export class MessageService implements TelegramEventHandler<'message'> {
    constructor() {}

    get eventName() {
        return 'message' as const;
    }

    async handler() {}
}
