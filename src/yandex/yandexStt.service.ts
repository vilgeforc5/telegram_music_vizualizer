import { inject, injectable, interfaces } from "inversify";
import { yandexInjectionTokens } from "@/yandex/yandex.tokens";
import { YandexAuthService } from "@/yandex/yandexAuth.service";
import { serviceClients } from "@yandex-cloud/nodejs-sdk";
import { globalInjectionTokens } from "@/di/globalInjectionTokens";
import { ConfigService } from "@/config.service";
import {
    RecognitionSpec_AudioEncoding,
    StreamingRecognitionRequest,
} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/ai/stt/v2/stt_service";
import { ReadStream } from "node:fs";
import { getChunkedStream } from "@/utils/getChunkedStream";
import { LoggerService } from "@/logger.service";
import { PassThrough } from "node:stream";
import Provider = interfaces.Provider;

/**
 * @description uses yandex stt.v2 grpc api for streaming
 */
@injectable()
export class YandexSttService {
    private _authService: YandexAuthService;

    constructor(
        @inject(yandexInjectionTokens.YandexAuthServiceProvider)
        private readonly yandexAuthServiceProvider: Provider<YandexAuthService>,

        @inject(globalInjectionTokens.LoggerService)
        private readonly loggerService: LoggerService,

        @inject(globalInjectionTokens.ConfigService)
        private readonly configService: ConfigService,
    ) {}

    async *transform(data: ReadStream | PassThrough) {
        try {
            const folderId = this.configService.folderId;
            const authService = await this.getAuthService();
            const client = authService.session.client(serviceClients.SttServiceClient);

            async function* createRequest(): AsyncIterable<StreamingRecognitionRequest> {
                yield StreamingRecognitionRequest.fromPartial({
                    config: {
                        specification: {
                            audioEncoding: RecognitionSpec_AudioEncoding.OGG_OPUS,
                            profanityFilter: false,
                            literatureText: false,
                            model: "general",
                            audioChannelCount: 1,
                        },
                        folderId,
                    },
                });

                for await (const chunk of getChunkedStream(data)) {
                    if (chunk) {
                        yield StreamingRecognitionRequest.fromPartial({
                            audioContent: chunk,
                        });
                    }
                }
            }

            const localOperationId = Math.random();
            this.loggerService.info(`YandexSttService: initiating response id:${localOperationId}`);

            for await (const response of client.streamingRecognize(createRequest())) {
                yield response;
            }

            this.loggerService.info(`YandexSttService: request ended id:${localOperationId}`);

            yield null;
        } catch (error) {
            this.loggerService.error("YandexSttService error: ", error);

            yield null;
        }
    }

    private async getAuthService() {
        if (this._authService) {
            return this._authService;
        }

        this._authService = (await this.yandexAuthServiceProvider()) as YandexAuthService;

        return this._authService;
    }
}
