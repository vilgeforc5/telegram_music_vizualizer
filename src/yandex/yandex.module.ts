import { AsyncContainerModule, interfaces } from "inversify";
import { YandexAuthService } from "@/yandex/yandexAuth.service";
import { yandexInjectionTokens } from "@/yandex/yandex.tokens";
import { YandexSttService } from "@/yandex/yandexStt.service";
import { YandexArtService } from "@/yandex/yandexArt.service";

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
                    return Promise.resolve(yandexAuthService);
                }

                const _yandexAuthService: YandexAuthService = context.container.get(
                    yandexInjectionTokens.YandexAuthService,
                );

                await _yandexAuthService.init();
                yandexAuthService = _yandexAuthService;

                res(_yandexAuthService);
            });
        };
    });

    bind<YandexSttService>(yandexInjectionTokens.YandexSttService)
        .to(YandexSttService)
        .inSingletonScope();

    bind<YandexArtService>(yandexInjectionTokens.YandexArtService)
        .to(YandexArtService)
        .inSingletonScope();
});
