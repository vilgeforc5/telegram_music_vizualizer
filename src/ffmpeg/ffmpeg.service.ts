import { injectable } from "inversify";
import Ffmpeg from "fluent-ffmpeg";
import { Readable } from "node:stream";

@injectable()
export class FfmpegService {
    constructor() {}

    convertToOgg(mp3Stream: Readable) {
        const ffmpegCommand = Ffmpeg();

        return ffmpegCommand.input(mp3Stream).audioChannels(1).toFormat("ogg").concat();
    }
}
ffmpeg -f concat -safe 0 -i input.txt -i audio.mp3 -c:v libx264 -c:a aac output.mp4