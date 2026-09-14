/** Minimal structured logger. Shared infrastructure, owns no business rules. */
export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
}

export function createLogger(namespace: string): Logger {
  return {
    info(message, context) {
      const suffix = context ? ` ${JSON.stringify(context)}` : "";
      console.log(`[${namespace}] ${message}${suffix}`);
    },
  };
}
