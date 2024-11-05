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
import { LoggerService } from "@/logger.service";
import axios from "axios";

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

        @inject(globalInjectionTokens.LoggerService)
        private readonly loggerService: LoggerService,
    ) {
        super(yandexAuthServiceProvider);
    }

    async getGeneratedImage(prompt: string): Promise<string | undefined> {
        const folderId = this.configService.folderId;
        const authService = await this.getAuthService();
        const body = {
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
        };

        try {
            const response = await axios.post(
                new URL(
                    "/foundationModels/v1/imageGenerationAsync",
                    yandexFoundationLLmUrl,
                ).toString(),
                JSON.stringify(body),
                {
                    headers: {
                        Authorization: `Bearer ${authService.iamToken}`,
                    },
                },
            );

            const id = _.get(response, "data.id");

            if (!id) {
                return undefined;
            }

            const result = await Promise.race([this.waitForOperationResolve(id), delay(60 * 10e3)]);

            return _.get(result, "response.image");
        } catch (error) {
            this.loggerService.error("YandexArtService error: ", error);
        }
    }

    private async waitForOperationResolve(operationId: string) {
        const authService = await this.getAuthService();

        const operationApiUrl = new URL(`/operations/${operationId}`, yandexFoundationLLmUrl);
        operationApiUrl.port = "443";

        while (true) {
            try {
                const response = await axios.get(operationApiUrl.toString(), {
                    headers: {
                        Authorization: `Bearer ${authService.iamToken}`,
                    },
                });
                const data = _.get(response, "data");

                if (data.done) {
                    return data;
                }
            } catch (error) {
                this.loggerService.error("YandexArtService error: ", error);
            }

            await delay(5000);
        }
    }

    async init() {
        return this.getAuthService();
    }
}
