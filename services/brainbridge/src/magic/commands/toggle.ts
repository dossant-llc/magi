/**
 * mAGIc Toggle Command
 * Toggle connection methods (ngrok, bp, bx) in magi repl
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

interface ConnectionMethods {
  ngrok: {
    enabled: boolean;
    description: string;
  };
  brainProxy: {
    enabled: boolean;
    description: string;
  };
  brainXchange: {
    enabled: boolean;
    description: string;
  };
}

interface Preferences {
  connectionMethods: ConnectionMethods;
  lastUpdated: string;
  updatedBy: string;
}

export class ToggleCommand {
  private prefsPath: string;

  constructor() {
    this.prefsPath = path.join(process.cwd(), 'data', 'memories', 'profiles', 'default', 'preferences.json');
  }

  async execute(method?: string): Promise<void> {
    if (!method) {
      await this.showStatus();
      return;
    }

    const methodLower = method.toLowerCase();

    switch (methodLower) {
      case 'ngrok':
      case 'ng':
        await this.toggle('ngrok');
        break;
      case 'brainproxy':
      case 'bp':
        await this.toggle('brainProxy');
        break;
      case 'brainxchange':
      case 'bx':
        await this.toggle('brainXchange');
        break;
      case 'status':
      case 's':
        await this.showStatus();
        break;
      default:
        console.log(chalk.red(`❌ Unknown method: ${method}`));
        console.log(chalk.gray('Available: ngrok (ng), brainproxy (bp), brainxchange (bx), status (s)'));
    }
  }

  private async toggle(method: keyof ConnectionMethods): Promise<void> {
    try {
      const preferences = this.loadPreferences();
      const currentState = preferences.connectionMethods[method].enabled;
      const newState = !currentState;

      preferences.connectionMethods[method].enabled = newState;
      preferences.lastUpdated = new Date().toISOString();
      preferences.updatedBy = 'magi-repl';

      this.savePreferences(preferences);

      const methodNames = {
        ngrok: 'Ngrok Tunnel',
        brainProxy: 'Brain Proxy',
        brainXchange: 'BrainXchange'
      };

      const statusColor = newState ? chalk.green : chalk.red;
      const statusText = newState ? 'ENABLED' : 'DISABLED';

      console.log(chalk.cyan(`🔧 ${methodNames[method]} ${statusColor(statusText)}`));

      if (newState) {
        console.log(chalk.yellow('⚠️  Restart required: Run `magi restart` to apply changes'));
      }

    } catch (error: any) {
      console.error(chalk.red(`❌ Error toggling ${method}:`, error.message));
    }
  }

  private async showStatus(): Promise<void> {
    try {
      const preferences = this.loadPreferences();

      console.log(chalk.cyan('🔧 Connection Methods Status'));
      console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

      Object.entries(preferences.connectionMethods).forEach(([key, config]) => {
        const statusColor = config.enabled ? chalk.green : chalk.red;
        const statusIcon = config.enabled ? '●' : '○';
        const statusText = config.enabled ? 'ENABLED' : 'DISABLED';

        console.log(`  ${statusColor(statusIcon)} ${key.padEnd(12)} ${statusColor(statusText.padEnd(8))} ${chalk.gray(config.description)}`);
      });

      console.log(chalk.blue('\nCommands:'));
      console.log('  magi toggle ngrok     (ng)  - Toggle ngrok tunnel');
      console.log('  magi toggle brainproxy (bp) - Toggle Brain Proxy');
      console.log('  magi toggle brainxchange (bx) - Toggle BrainXchange');
      console.log('  magi toggle status    (s)   - Show this status');

      console.log(chalk.gray(`\nLast updated: ${preferences.lastUpdated} by ${preferences.updatedBy}`));

    } catch (error: any) {
      console.error(chalk.red('❌ Error reading status:', error.message));
    }
  }

  private loadPreferences(): Preferences {
    const defaultPrefs: Preferences = {
      connectionMethods: {
        ngrok: {
          enabled: false,
          description: "Direct ChatGPT connection via ngrok tunnel"
        },
        brainProxy: {
          enabled: true,
          description: "Connection via Brain Proxy (bp)"
        },
        brainXchange: {
          enabled: false,
          description: "P2P Memory Sharing (bx)"
        }
      },
      lastUpdated: new Date().toISOString(),
      updatedBy: 'system'
    };

    try {
      if (fs.existsSync(this.prefsPath)) {
        const content = fs.readFileSync(this.prefsPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Could not load preferences, using defaults'));
    }

    // Create default preferences file
    this.savePreferences(defaultPrefs);
    return defaultPrefs;
  }

  private savePreferences(preferences: Preferences): void {
    const content = JSON.stringify(preferences, null, 2);
    fs.writeFileSync(this.prefsPath, content, 'utf8');
  }
}

export async function toggleCommand(method?: string) {
  const command = new ToggleCommand();
  await command.execute(method);
}