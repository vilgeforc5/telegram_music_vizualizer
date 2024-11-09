import { inject, injectable } from 'inversify';
import { yandexInjectionTokens } from '@/yandex/yandex.tokens';
import { YandexAuthService } from '@/yandex/auth/yandexAuth.service';
import { globalInjectionTokens } from '@/di/global.tokens';
import { ConfigService } from '@/config.service';
import { delay } from '@/utils/delay';
import _ from 'lodash';
import { yandexFoundationLLmUrl } from '@/static';
import { getRandomInt } from '@/utils/getRandomInt';
import { LoggerService } from '@/logger.service';
import axios from 'axios';
import { ImageGenerationService } from '@/types/types';

/**
 * @description uses yandex stt.v2 grpc api for streaming
 */
@injectable()
export class YandexArtService implements ImageGenerationService {
    constructor(
        @inject(yandexInjectionTokens.YandexAuthService)
        private readonly yandexAuthService: YandexAuthService,

        @inject(globalInjectionTokens.ConfigService)
        private readonly configService: ConfigService,

        @inject(globalInjectionTokens.LoggerService)
        private readonly loggerService: LoggerService,
    ) {}

    async generateImage(prompt: string): Promise<string | undefined> {
        const folderId = this.configService.folderId;
        const body = {
            modelUri: `art://${folderId}/yandex-art/latest`,
            generationOptions: {
                seed: getRandomInt(),
                aspectRatio: {
                    widthRatio: 16,
                    heightRatio: 9,
                },
                mimeType: 'image/jpeg',
            },
            messages: [
                {
                    weight: '1',
                    text: prompt,
                },
            ],
        };

        try {
            const response = await axios.post(
                new URL(
                    '/foundationModels/v1/imageGenerationAsync',
                    yandexFoundationLLmUrl,
                ).toString(),
                JSON.stringify(body),
                {
                    headers: {
                        Authorization: `Bearer ${this.yandexAuthService.iamToken}`,
                    },
                },
            );

            const id = _.get(response, 'data.id');

            if (!id) {
                this.loggerService.info('YandexArtService: no id');
                return undefined;
            }

            this.loggerService.info('YandexArtService: start operation', id);
            const result = await Promise.race([this.waitForOperationResolve(id), delay(60 * 10e3)]);
            this.loggerService.info('YandexArtService: race result', id, {
                isDelay: result === undefined,
            });

            return _.get(result, 'response.image');
        } catch (error) {
            this.loggerService.error('YandexArtService error: ', error);
        }
    }

    private async waitForOperationResolve(operationId: string) {
        const operationApiUrl = new URL(`/operations/${operationId}`, yandexFoundationLLmUrl);
        operationApiUrl.port = '443';

        while (true) {
            try {
                this.loggerService.info('YandexArtService: waitForOperationResolve', operationId);

                const response = await axios.get(operationApiUrl.toString(), {
                    headers: {
                        Authorization: `Bearer ${this.yandexAuthService.iamToken}`,
                    },
                });
                const data = _.get(response, 'data');
                const isDone = _.get(data, 'done');
                this.loggerService.info('YandexArtService: waitForOperationResolve', operationId, {
                    isDone,
                });

                if (isDone) {
                    return data;
                }
            } catch (error) {
                this.loggerService.error('YandexArtService error: ', error);
            }

            await delay(10000);
        }
    }
}
