import { inject, injectable } from "inversify";
import { globalInjectionTokens } from "@/di/globalInjectionTokens";
import { Session } from "@yandex-cloud/nodejs-sdk";
import { LoggerService } from "@/logger.service";
import { yandexIamApiUrl } from "@/static";
import { CronJob } from "cron";
import fs from "node:fs";
import jose from "node-jose";
import axios from "axios";
import _ from "lodash";

@injectable()
export class YandexAuthService {
    iamToken: string = "";
    private isInitiated = false;

    constructor(
        @inject(globalInjectionTokens.LoggerService)
        private readonly loggerService: LoggerService,
    ) {}

    private _session: Session;

    get session() {
        return this._session;
    }

    async init() {
        if (this.isInitiated) {
            return;
        }

        await this.registerIamTokenUpdate();
        this._session = new Session({
            iamToken: this.iamToken,
        });
        this.isInitiated = true;
    }

    async getJwtKey() {
        const fileData = fs.readFileSync("./authorized_key.json");
        const authorizedKey = JSON.parse(fileData.toString("utf-8"));
        const now = Math.floor(new Date().getTime() / 1000);

        const payload = {
            aud: yandexIamApiUrl,
            iss: authorizedKey.service_account_id,
            iat: now,
            exp: now + 3600,
        };

        const key = await jose.JWK.asKey(authorizedKey.private_key, "pem", {
            kid: authorizedKey.id,
            alg: "PS256",
        });

        const signedKey = await jose.JWS.createSign({ format: "compact" }, key)
            .update(JSON.stringify(payload))
            .final();

        return signedKey;
    }

    private async updateIamToken() {
        const jwt = await this.getJwtKey();
        const response = await axios.post(
            yandexIamApiUrl,
            JSON.stringify({
                jwt,
            }),
        );

        const responseToken = _.get(response, "data.iamToken");
        if (!responseToken) {
            this.loggerService.error("YandexAuth: updateIamToken error updating token");
        }
        this.iamToken = responseToken;
        this.loggerService.info("YandexAuthService: update iamToken");
    }

    private async registerIamTokenUpdate() {
        await this.updateIamToken();

        CronJob.from({
            start: true,
            cronTime: "0 * * * *",
            onTick: this.updateIamToken.bind(this),
        });
    }
}
