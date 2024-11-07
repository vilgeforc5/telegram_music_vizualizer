import { App } from '@/app';
import { globalInjectionTokens } from '@/di/globalInjectionTokens';
import { getAppContainer } from '@/di/inversify.config';
import { YandexAuthLoaderService } from '@/yandex/auth/yandexAuthLoader.service';
import { yandexInjectionTokens } from '@/yandex/yandex.tokens';

async function main() {
    const appContainer = await getAppContainer();

    const yandexAuthLoader = appContainer.get<YandexAuthLoaderService>(
        yandexInjectionTokens.YandexAuthLoaderService,
    );
    const appService: App = appContainer.get<App>(globalInjectionTokens.App);

    await yandexAuthLoader.load();
    await appService.init();
}

main();
