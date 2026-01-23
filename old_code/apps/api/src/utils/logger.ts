export class Logger {
    constructor(private readonly context: string) { }

    debug(message: string, meta?: unknown) {
        console.debug(this.format('DEBUG', message, meta));
    }

    info(message: string, meta?: unknown) {
        console.info(this.format('INFO', message, meta));
    }

    warn(message: string, meta?: unknown) {
        console.warn(this.format('WARN', message, meta));
    }

    error(message: string, meta?: unknown) {
        console.error(this.format('ERROR', message, meta));
    }

    private format(level: string, message: string, meta?: unknown) {
        const payload = meta === undefined ? '' : ` ${JSON.stringify(meta)}`;
        return `[${level}] ${this.context}: ${message}${payload}`;
    }
}
