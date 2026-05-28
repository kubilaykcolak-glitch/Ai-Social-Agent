export interface Logger {
  info(msg: string, meta?: unknown): void;
  warn(msg: string, meta?: unknown): void;
  error(msg: string, meta?: unknown): void;
}

export const consoleLogger: Logger = {
  info: (m, meta) => console.log(`[info] ${m}`, meta ?? ""),
  warn: (m, meta) => console.warn(`[warn] ${m}`, meta ?? ""),
  error: (m, meta) => console.error(`[error] ${m}`, meta ?? ""),
};
