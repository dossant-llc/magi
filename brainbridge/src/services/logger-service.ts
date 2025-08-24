import * as fs from 'fs';
import * as path from 'path';

export class LoggerService {
  private logFile: string;

  constructor(logFile: string) {
    this.logFile = logFile;
  }

  log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp}: ${message}\n`;
    
    try {
      // Ensure logs directory exists
      const logDir = path.dirname(this.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.appendFileSync(this.logFile, logMessage);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
}