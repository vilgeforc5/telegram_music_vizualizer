import 'reflect-metadata';
import { Container } from 'inversify';
import { globalInjectionTokens } from '@/di/global.tokens';
import { LoggerService } from '@/logger.service';
import { ConfigService } from '@/config.service';
import { App } from '@/app';
import { telegramModule } from '@/telegram/telegram.module';
import { yandexModule } from '@/yandex/yandex.module';
import { ffmpegModule } from '@/ffmpeg/ffmpeg.module';
import { ImageGenerationService, SttService } from '@/types/types';
import { YandexSttService } from '@/yandex/stt/yandexStt.service';
import { YandexArtService } from '@/yandex/art/yandexArt.service';

export const getAppContainer = async () => {
    const appContainer = new Container({ autoBindInjectable: true, defaultScope: 'Singleton' });

    appContainer
        .bind<LoggerService>(globalInjectionTokens.LoggerService)
        .to(LoggerService)
        .inSingletonScope();
    appContainer
        .bind<ConfigService>(globalInjectionTokens.ConfigService)
        .to(ConfigService)
        .inSingletonScope();

    appContainer.load(yandexModule);
    appContainer.bind<SttService>(globalInjectionTokens.SttService).to(YandexSttService);
    appContainer
        .bind<ImageGenerationService>(globalInjectionTokens.ImageGenerationService)
        .to(YandexArtService);

    appContainer.load(ffmpegModule);
    appContainer.load(telegramModule);
    appContainer.bind<App>(globalInjectionTokens.App).to(App).inSingletonScope();

    return appContainer;
};
