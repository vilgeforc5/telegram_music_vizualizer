import { telegramApiBaseUrl } from "@/static";
import { inject, injectable } from "inversify";
import { globalInjectionTokens } from "@/di/globalInjectionTokens";
import { ConfigService } from "@/config.service";
import { LoggerService } from "@/logger.service";
import _ from "lodash";

@injectable()
export class DownloadService {
    tgBotKey: string;

    constructor(
        @inject(globalInjectionTokens.ConfigService)
        configService: ConfigService,

        @inject(globalInjectionTokens.LoggerService)
        private readonly loggerService: LoggerService,
    ) {
        const configTgBotKey = _.get(configService, "tgBotKey");
        if (!configTgBotKey) {
            const error = new Error("DownloadService: no telegram bot key");
            this.loggerService.error(error);

            throw error;
        }

        this.tgBotKey = configTgBotKey;
    }

    async getFileInfo(file_id: string) {
        this.loggerService.info("DownloadService: getFileInfo", file_id);

        const url = new URL(`/bot${this.tgBotKey}/getFile?file_id=${file_id}`, telegramApiBaseUrl);
        const res = await fetch(url);

        return res.json();
    }

    async getFileResponse(filePath: string) {
        this.loggerService.info("DownloadService: getFile", filePath);

        const url = new URL(`file/bot${this.tgBotKey}/${filePath}`, telegramApiBaseUrl);

        return fetch(url);
    }
}