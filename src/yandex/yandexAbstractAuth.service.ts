import { YandexAuthService } from "@/yandex/yandexAuth.service";
import { injectable, interfaces } from "inversify";

@injectable()
export abstract class YandexAbstractAuthService {
    private _authService: YandexAuthService;

    constructor(
        private readonly yandexAuthServiceProvider: interfaces.Provider<YandexAuthService>,
    ) {}

    protected async getAuthService() {
        if (this._authService) {
            return this._authService;
        }

        this._authService = (await this.yandexAuthServiceProvider()) as YandexAuthService;
        return this._authService;
    }
}
