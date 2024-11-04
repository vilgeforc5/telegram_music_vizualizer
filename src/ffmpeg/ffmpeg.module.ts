import { ContainerModule } from "inversify";
import { ffmpegInjectionTokens } from "@/ffmpeg/ffmpeg.tokens";
import { FfmpegService } from "@/ffmpeg/ffmpeg.service";

export const ffmpegModule = new ContainerModule((bind) => {
    bind(ffmpegInjectionTokens.FFMpegService).to(FfmpegService).inSingletonScope();
});
