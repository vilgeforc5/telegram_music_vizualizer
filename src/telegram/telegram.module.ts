import { ContainerModule } from "inversify";
import { BotService } from "@/telegram/bot.service";
import { telegramInjectionTokens } from "@/telegram/telegramInjectionTokens";
import { TelegramEventHandler } from "@/telegram/telegramEventHandler";
import { AudioService } from "@/telegram/handlers/audio/audio.service";
import { TelegramEvents } from "node-telegram-bot-api";
import { DownloadService } from "@/telegram/download.service";
import { TelegramService } from "@/telegram/telegram.service";
import { MessageService } from "@/telegram/handlers/message/message.service";
import _ from "lodash";

export const telegramModule = new ContainerModule((bind) => {
    bind<BotService>(telegramInjectionTokens.BotService).to(BotService).inSingletonScope();

    bind<DownloadService>(telegramInjectionTokens.DownloadService)
        .to(DownloadService)
        .inSingletonScope();

    const serviceHandlers = [MessageService, AudioService];

    // multiple handlers can be injected via @multiInject
    _.forEach(serviceHandlers, (service) => {
        bind<TelegramEventHandler<keyof TelegramEvents>>(telegramInjectionTokens.EventHandler)
            .to(service)
            .inSingletonScope();
    });

    bind<TelegramService>(telegramInjectionTokens.TelegramService)
        .to(TelegramService)
        .inSingletonScope();
});
