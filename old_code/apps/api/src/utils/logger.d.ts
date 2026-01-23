export declare class Logger {
    private readonly context;
    constructor(context: string);
    debug(message: string, meta?: unknown): void;
    info(message: string, meta?: unknown): void;
    warn(message: string, meta?: unknown): void;
    error(message: string, meta?: unknown): void;
    private format;
}
//# sourceMappingURL=logger.d.ts.map