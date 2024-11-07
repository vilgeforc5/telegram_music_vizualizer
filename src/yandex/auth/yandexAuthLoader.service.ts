import { inject, injectable } from 'inversify';
import { yandexInjectionTokens } from '@/yandex/yandex.tokens';
import { YandexAuthService } from '@/yandex/auth/yandexAuth.service';

@injectable()
export class YandexAuthLoaderService {
    constructor(
        @inject(yandexInjectionTokens.YandexAuthService)
        private readonly authService: YandexAuthService,
    ) {}

    async load() {
        return this.authService.init();
    }
}
