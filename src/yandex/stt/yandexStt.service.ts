import { inject, injectable } from 'inversify';
import { yandexInjectionTokens } from '@/yandex/yandex.tokens';
import { YandexAuthService } from '@/yandex/auth/yandexAuth.service';
import { serviceClients } from '@yandex-cloud/nodejs-sdk';
import { globalInjectionTokens } from '@/di/global.tokens';
import { ConfigService } from '@/config.service';
import {
    RecognitionSpec_AudioEncoding,
    StreamingRecognitionRequest,
    StreamingRecognitionResponse,
} from '@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/ai/stt/v2/stt_service';
import { ReadStream } from 'node:fs';
import { getChunkedStream } from '@/utils/getChunkedStream';
import { LoggerService } from '@/logger.service';
import { PassThrough } from 'node:stream';
import { SttService, TextChunk } from '@/types/types';
import _ from 'lodash';

/**
 * @description uses yandex stt.v2 grpc api for streaming
 */
@injectable()
export class YandexSttService implements SttService {
    constructor(
        @inject(yandexInjectionTokens.YandexAuthService)
        private readonly yandexAuthService: YandexAuthService,

        @inject(globalInjectionTokens.LoggerService)
        private readonly loggerService: LoggerService,

        @inject(globalInjectionTokens.ConfigService)
        private readonly configService: ConfigService,
    ) {}

    async *oggToTextStreamed(data: ReadStream | PassThrough) {
        try {
            const folderId = this.configService.folderId;
            const client = this.yandexAuthService.session.client(serviceClients.SttServiceClient);

            async function* createRequest(): AsyncIterable<StreamingRecognitionRequest> {
                yield StreamingRecognitionRequest.fromPartial({
                    config: {
                        specification: {
                            audioEncoding: RecognitionSpec_AudioEncoding.OGG_OPUS,
                            profanityFilter: false,
                            literatureText: false,
                            model: 'general',
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
                const textChunk = this.transformAlternativeToChunk(response);

                yield textChunk;
            }

            this.loggerService.info(`YandexSttService: request ended id:${localOperationId}`);

            yield null;
        } catch (error) {
            this.loggerService.error('YandexSttService error: ', error);

            yield null;
        }
    }

    private transformAlternativeToChunk(response: StreamingRecognitionResponse): TextChunk | null {
        const alternative = _.chain(response.chunks)
            .flatMap((chunk) => _.head(chunk.alternatives))
            .compact()
            .head()
            .value();

        const text = _.get(alternative, 'text');
        const startTime = _.get(_.head(alternative.words), 'startTime.seconds');
        const endTime = _.get(_.last(alternative.words), 'endTime.seconds');

        if (!text || !startTime || !endTime) {
            return null;
        }

        return {
            text,
            startTime,
            endTime,
        };
    }
}
