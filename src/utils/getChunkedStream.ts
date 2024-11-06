import { PassThrough, Readable } from 'node:stream';
import { delay } from './delay';

export async function* getChunkedStream(
    stream: PassThrough | Readable,
    chunkSize = Math.pow(2, 10) * 32,
    frequency = 400,
) {
    while (true) {
        if (stream.readableEnded) {
            return;
        }

        yield stream.read(chunkSize);
        await delay(frequency);
    }
}
