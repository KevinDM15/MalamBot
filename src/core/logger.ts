export class Logger {
  private static formatDate(): string {
    return new Date().toISOString();
  }

  static info(message: string): void {
    console.log(`[${this.formatDate()}] [INFO] ${message}`);
  }

  static error(message: string, error?: Error): void {
    console.error(`[${this.formatDate()}] [ERROR] ${message}`);
    if (error) {
      console.error(error);
    }
  }

  static warn(message: string): void {
    console.warn(`[${this.formatDate()}] [WARN] ${message}`);
  }

  static debug(message: string): void {
    console.debug(`[${this.formatDate()}] [DEBUG] ${message}`);
  }
}
