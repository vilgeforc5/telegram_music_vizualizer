import { App } from '@/app';
import { globalInjectionTokens } from '@/di/globalInjectionTokens';
import { getAppContainer } from '@/di/inversify.config';

async function main() {
    const appContainer = await getAppContainer();
    const app: App = appContainer.get<App>(globalInjectionTokens.App);

    await app.init();
}

main();
