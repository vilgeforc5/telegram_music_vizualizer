import { injectable } from 'inversify';
import Ffmpeg from 'fluent-ffmpeg';
import { PassThrough, Readable } from 'node:stream';

@injectable()
export class FfmpegService {
    constructor() {}

    audioToOggStream(stream: Readable) {
        const ffmpegCommand = Ffmpeg();

        return ffmpegCommand.input(stream).audioChannels(1).toFormat('ogg').pipe() as PassThrough;
    }
}
