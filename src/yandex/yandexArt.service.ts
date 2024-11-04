import { inject, injectable, interfaces } from "inversify";
import { yandexInjectionTokens } from "@/yandex/yandex.tokens";
import { YandexAuthService } from "@/yandex/yandexAuth.service";
import { globalInjectionTokens } from "@/di/globalInjectionTokens";
import { ConfigService } from "@/config.service";
import { delay } from "@/utils/delay";
import _ from "lodash";
import { yandexFoundationLLmUrl } from "@/static";
import { getRandomInt } from "@/utils/getRandomInt";
import { YandexAbstractAuthService } from "@/yandex/yandexAbstractAuth.service";

/**
 * @description uses yandex stt.v2 grpc api for streaming
 */
@injectable()
export class YandexArtService extends YandexAbstractAuthService {
    constructor(
        @inject(yandexInjectionTokens.YandexAuthServiceProvider)
        yandexAuthServiceProvider: interfaces.Provider<YandexAuthService>,

        @inject(globalInjectionTokens.ConfigService)
        private readonly configService: ConfigService,
    ) {
        super(yandexAuthServiceProvider);
    }

    async getGeneratedImage(prompt: string): Promise<string | undefined> {
        const folderId = this.configService.folderId;
        const authService = await this.getAuthService();

        const response = await fetch(
            new URL("/foundationModels/v1/imageGenerationAsync", yandexFoundationLLmUrl),
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${authService.iamToken}`,
                },
                body: JSON.stringify({
                    modelUri: `art://${folderId}/yandex-art/latest`,
                    generationOptions: {
                        seed: getRandomInt(),
                        aspectRatio: {
                            widthRatio: 16,
                            heightRatio: 9,
                        },
                        mimeType: "image/jpeg",
                    },
                    messages: [
                        {
                            weight: "1",
                            text: prompt,
                        },
                    ],
                }),
            },
        );

        const json = await response.json();
        const id = _.get(json, "id");

        if (!id) {
            return undefined;
        }

        const result = await Promise.race([this.waitForOperationResolve(id), delay(60 * 10e3)]);

        return _.get(result, "response.image");
    }

    private async waitForOperationResolve(operationId: string) {
        const authService = await this.getAuthService();

        const operationApiUrl = new URL(`/operations/${operationId}`, yandexFoundationLLmUrl);
        operationApiUrl.port = "443";

        while (true) {
            const response = await fetch(operationApiUrl, {
                headers: {
                    Authorization: `Bearer ${authService.iamToken}`,
                },
            });
            const json = await response.json();

            if (json.done) {
                return json;
            }

            await delay(1000);
        }
    }
}
