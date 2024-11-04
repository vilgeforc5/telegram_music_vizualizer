import { injectable } from "inversify";

@injectable()
export class LoggerService {
    constructor() {
        // pino || winston
    }

    info(...messages: unknown[]): void {
        console.log(...messages);
    }

    warning(...messages: unknown[]): void {
        console.warn(...messages);
    }

    error(...messages: unknown[]): void {
        console.error(...messages);
    }
}
