export class Logger {
    context;
    constructor(context) {
        this.context = context;
    }
    debug(message, meta) {
        console.debug(this.format('DEBUG', message, meta));
    }
    info(message, meta) {
        console.info(this.format('INFO', message, meta));
    }
    warn(message, meta) {
        console.warn(this.format('WARN', message, meta));
    }
    error(message, meta) {
        console.error(this.format('ERROR', message, meta));
    }
    format(level, message, meta) {
        const payload = meta === undefined ? '' : ` ${JSON.stringify(meta)}`;
        return `[${level}] ${this.context}: ${message}${payload}`;
    }
}
//# sourceMappingURL=logger.js.map