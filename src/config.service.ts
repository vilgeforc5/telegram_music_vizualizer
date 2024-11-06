import 'dotenv/config';
import { injectable } from 'inversify';

@injectable()
export class ConfigService {
    get tgBotKey() {
        return process.env.TG_BOT_KEY;
    }

    get folderId() {
        return process.env.YANDEX_FOLDER_ID;
    }
}
