import { ReadStream } from 'node:fs';
import { PassThrough } from 'node:stream';

export interface TextChunk {
    text: string;
    startTime: number;
    endTime: number;
}

export interface SttService {
    oggToTextStreamed: (stream: ReadStream | PassThrough) => AsyncGenerator<TextChunk | null>;
}

export interface ImageGenerationService {
    generateImage: (prompt: string) => Promise<string | undefined>;
}
