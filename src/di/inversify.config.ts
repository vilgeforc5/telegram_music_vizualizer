import "reflect-metadata";
import { Container } from "inversify";
import { globalInjectionTokens } from "@/di/globalInjectionTokens";
import { LoggerService } from "@/logger.service";
import { ConfigService } from "@/config.service";
import { App } from "@/app";
import { telegramModule } from "@/telegram/telegram.module";
import { yandexModule } from "@/yandex/yandex.module";
import { ffmpegModule } from "@/ffmpeg/ffmpeg.module";

export const getAppContainer = async () => {
    const appContainer = new Container({ autoBindInjectable: true, defaultScope: "Singleton" });

    appContainer
        .bind<LoggerService>(globalInjectionTokens.LoggerService)
        .to(LoggerService)
        .inSingletonScope();

    appContainer
        .bind<ConfigService>(globalInjectionTokens.ConfigService)
        .to(ConfigService)
        .inSingletonScope();

    await appContainer.loadAsync(yandexModule);

    appContainer.load(ffmpegModule);
    appContainer.load(telegramModule);
    appContainer.bind<App>(globalInjectionTokens.App).to(App).inSingletonScope();

    return appContainer;
};
