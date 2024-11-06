import { injectable } from 'inversify';
import Ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'node:stream';

@injectable()
export class FfmpegService {
    constructor() {}

    convertToOgg(mp3Stream: Readable) {
        const ffmpegCommand = Ffmpeg();

        return ffmpegCommand.input(mp3Stream).audioChannels(1).toFormat('ogg');
    }
}
