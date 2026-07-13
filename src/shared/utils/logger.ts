type LogContext = unknown;

const isDevelopment = process.env.NODE_ENV !== "production";

function serializeContext(context: LogContext): string {
    if (context === undefined) return "";
    if (context instanceof Error) {
        return JSON.stringify({
            name: context.name,
            message: context.message,
            ...(isDevelopment && context.stack ? { stack: context.stack } : {}),
        });
    }
    if (typeof context === "string") return context;
    try {
        return JSON.stringify(context);
    } catch {
        return "[unserializable context]";
    }
}

function write(level: "INFO" | "WARN" | "ERROR", message: string, context?: LogContext): void {
    const suffix = context === undefined ? "" : ` ${serializeContext(context)}`;
    const line = `${new Date().toISOString()} ${level} ${message}${suffix}\n`;
    (level === "INFO" ? process.stdout : process.stderr).write(line);
}

export const logger = {
    info(message: string, context?: LogContext): void {
        if (isDevelopment) write("INFO", message, context);
    },
    warn(message: string, context?: LogContext): void {
        if (isDevelopment) write("WARN", message, context);
    },
    error(message: string, context?: LogContext): void {
        write("ERROR", message, context);
    },
};
