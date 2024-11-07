import { AsyncContainerModule } from 'inversify';
import { YandexAuthService } from '@/yandex/auth/yandexAuth.service';
import { yandexInjectionTokens } from '@/yandex/yandex.tokens';
import { YandexSttService } from '@/yandex/stt/yandexStt.service';
import { YandexArtService } from '@/yandex/art/yandexArt.service';
import { YandexAuthLoaderService } from '@/yandex/auth/yandexAuthLoader.service';

//TODO refactor repeated code from inside Provider(...)
export const yandexModule = new AsyncContainerModule(async (bind) => {
    bind<YandexAuthService>(yandexInjectionTokens.YandexAuthService)
        .to(YandexAuthService)
        .inSingletonScope();

    bind<YandexAuthLoaderService>(yandexInjectionTokens.YandexAuthLoaderService).to(
        YandexAuthLoaderService,
    );

    bind<YandexSttService>(yandexInjectionTokens.YandexSttService)
        .to(YandexSttService)
        .inSingletonScope();

    bind<YandexArtService>(yandexInjectionTokens.YandexArtService)
        .to(YandexArtService)
        .inSingletonScope();
});
