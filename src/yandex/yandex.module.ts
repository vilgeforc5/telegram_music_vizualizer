import { ContainerModule } from 'inversify';
import { YandexAuthService } from '@/yandex/auth/yandexAuth.service';
import { yandexInjectionTokens } from '@/yandex/yandex.tokens';
import { YandexAuthLoaderService } from '@/yandex/auth/yandexAuthLoader.service';

export const yandexModule = new ContainerModule(async (bind) => {
    bind<YandexAuthService>(yandexInjectionTokens.YandexAuthService)
        .to(YandexAuthService)
        .inSingletonScope();

    bind<YandexAuthLoaderService>(yandexInjectionTokens.YandexAuthLoaderService).to(
        YandexAuthLoaderService,
    );
});
