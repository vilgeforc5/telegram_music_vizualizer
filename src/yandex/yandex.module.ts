import { AsyncContainerModule, interfaces } from 'inversify';
import { YandexAuthService } from '@/yandex/yandexAuth.service';
import { yandexInjectionTokens } from '@/yandex/yandex.tokens';
import { YandexSttService } from '@/yandex/stt/yandexStt.service';
import { YandexArtService } from '@/yandex/art/yandexArt.service';

//TODO refactor repeated code from inside Provider(...)
export const yandexModule = new AsyncContainerModule(async (bind) => {
    bind<YandexAuthService>(yandexInjectionTokens.YandexAuthService)
        .to(YandexAuthService)
        .inSingletonScope();

    bind<interfaces.Provider<YandexAuthService>>(
        yandexInjectionTokens.YandexAuthServiceProvider,
    ).toProvider<YandexAuthService>((context) => {
        let yandexAuthService: YandexAuthService | null = null;

        return () => {
            return new Promise<YandexAuthService>(async (res) => {
                if (yandexAuthService) {
                    res(yandexAuthService);
                }

                const _yandexAuthService: YandexAuthService = context.container.get(
                    yandexInjectionTokens.YandexAuthService,
                );

                await _yandexAuthService.init();
                yandexAuthService = _yandexAuthService;
                res(yandexAuthService);
            });
        };
    });

    bind<YandexSttService>(yandexInjectionTokens.YandexSttService)
        .to(YandexSttService)
        .inSingletonScope();

    bind<interfaces.Provider<YandexSttService>>(
        yandexInjectionTokens.YandexSttServiceProvider,
    ).toProvider<YandexSttService>((context) => {
        let yandexSttService: YandexSttService | null = null;

        return () => {
            return new Promise<YandexSttService>(async (res) => {
                if (yandexSttService) {
                    res(yandexSttService);
                }

                const _yandexSttService: YandexSttService = context.container.get(
                    yandexInjectionTokens.YandexSttService,
                );

                await _yandexSttService.init();
                yandexSttService = _yandexSttService;

                res(yandexSttService);
            });
        };
    });

    bind<YandexArtService>(yandexInjectionTokens.YandexArtService)
        .to(YandexArtService)
        .inSingletonScope();

    bind<interfaces.Provider<YandexArtService>>(
        yandexInjectionTokens.YandexArtServiceProvider,
    ).toProvider<YandexArtService>((context) => {
        let yandexArtService: YandexArtService | null = null;

        return () => {
            return new Promise<YandexArtService>(async (res) => {
                if (yandexArtService) {
                    res(yandexArtService);
                }

                const _yandexArtService: YandexArtService = context.container.get(
                    yandexInjectionTokens.YandexArtService,
                );

                await _yandexArtService.init();
                yandexArtService = _yandexArtService;

                res(yandexArtService);
            });
        };
    });
});
