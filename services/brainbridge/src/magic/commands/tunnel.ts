/**
 * Tunnel Command - Ngrok tunnel management for direct ChatGPT connection
 */

import chalk from 'chalk';
import { LoggerService } from '../../services/index.js';
import { NgrokConnector, NgrokConfig } from '../../services/ngrok-connector.js';

const appConfig = require('../../../../../config.js');

export class TunnelCommand {
  private loggerService: LoggerService;
  private ngrokConnector: NgrokConnector | null = null;

  constructor(loggerService: LoggerService) {
    this.loggerService = loggerService;
  }

  async execute(action: string = 'status'): Promise<void> {
    switch (action.toLowerCase()) {
      case 'start':
        await this.startTunnel();
        break;
      case 'stop':
        await this.stopTunnel();
        break;
      case 'restart':
        await this.stopTunnel();
        await this.startTunnel();
        break;
      case 'url':
        await this.showUrl();
        break;
      case 'status':
      default:
        await this.showStatus();
        break;
    }
  }

  private async startTunnel(): Promise<void> {
    if (this.ngrokConnector?.isConnected()) {
      console.log(chalk.yellow('🌐 Ngrok tunnel already running'));
      return;
    }

    const ngrokConfig: NgrokConfig = {
      enabled: true, // Force enabled for manual start
      region: appConfig.server.ngrok.region,
      port: appConfig.server.ngrok.port,
      subdomain: appConfig.server.ngrok.subdomain,
      staticDomain: appConfig.server.ngrok.staticDomain,
      authToken: process.env.NGROK_AUTH_TOKEN
    };

    console.log(chalk.blue('🚀 Starting ngrok tunnel...'));

    try {
      this.ngrokConnector = new NgrokConnector(ngrokConfig, this.loggerService);
      const status = await this.ngrokConnector.start();

      if (status.connected && status.url) {
        console.log(chalk.green('✅ Ngrok tunnel established!'));
        console.log(chalk.cyan(`🌐 Public URL: ${status.url}`));
        console.log(chalk.cyan(`📍 Region: ${status.region}`));
        console.log(chalk.cyan(`🔌 Local Port: ${status.port}`));

        // Show auth info if enabled
        const config = require('../../../../config.js');
        if (config.server.ngrok.basicAuth?.enabled) {
          console.log(chalk.magenta(`🔐 Authentication: Basic (${config.server.ngrok.basicAuth.username})`));
        }

        console.log('');
        console.log(chalk.yellow('🤖 ChatGPT Configuration:'));
        console.log(chalk.white(`   Use this URL in ChatGPT: ${status.url}/mcp`));

        if (config.server.ngrok.basicAuth?.enabled) {
          console.log(chalk.white(`   Username: ${config.server.ngrok.basicAuth.username}`));
          console.log(chalk.white(`   Password: ${config.server.ngrok.basicAuth.password}`));
        }
      } else {
        console.log(chalk.red(`❌ Failed to establish tunnel: ${status.error}`));
      }
    } catch (error: any) {
      console.log(chalk.red(`❌ Error starting tunnel: ${error.message}`));
    }
  }

  private async stopTunnel(): Promise<void> {
    if (!this.ngrokConnector || !this.ngrokConnector.isConnected()) {
      console.log(chalk.yellow('🌐 No active tunnel to stop'));
      return;
    }

    console.log(chalk.blue('🛑 Stopping ngrok tunnel...'));
    await this.ngrokConnector.stop();
    this.ngrokConnector = null;
    console.log(chalk.green('✅ Tunnel stopped'));
  }

  private async showUrl(): Promise<void> {
    if (!this.ngrokConnector || !this.ngrokConnector.isConnected()) {
      console.log(chalk.red('❌ No active tunnel'));
      console.log(chalk.gray('   Run `magi tunnel start` to create a tunnel'));
      return;
    }

    const status = this.ngrokConnector.getStatus();
    if (status.url) {
      console.log(chalk.green('🌐 Active Tunnel URL:'));
      console.log(chalk.white(`   Public URL: ${status.url}`));
      console.log(chalk.white(`   ChatGPT URL: ${status.url}/mcp`));
    } else {
      console.log(chalk.red('❌ Tunnel not properly connected'));
    }
  }

  private async showStatus(): Promise<void> {
    console.log(chalk.cyan('🌐 Ngrok Tunnel Status'));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    // Configuration
    const config = appConfig.server.ngrok;
    console.log(chalk.blue('Configuration:'));
    console.log(`  Enabled: ${config.enabled ? chalk.green('Yes') : chalk.red('No')}`);
    console.log(`  Region: ${chalk.yellow(config.region)}`);
    console.log(`  Port: ${chalk.yellow(config.port)}`);

    // Show basic auth status
    if (config.basicAuth?.enabled) {
      console.log(`  Authentication: ${chalk.green('Basic Auth Enabled')}`);
      console.log(`  Username: ${chalk.yellow(config.basicAuth.username || 'not set')}`);
    } else {
      console.log(`  Authentication: ${chalk.gray('Disabled')}`);
    }

    if (config.subdomain) {
      console.log(`  Subdomain: ${chalk.yellow(config.subdomain)}`);
    }

    if (config.staticDomain) {
      console.log(`  Static Domain: ${chalk.yellow(config.staticDomain)}`);
    }

    // Runtime status
    if (this.ngrokConnector) {
      const status = this.ngrokConnector.getStatus();
      console.log(chalk.blue('\nRuntime Status:'));

      if (status.connected && status.url) {
        console.log(`  Status: ${chalk.green('Connected')}`);
        console.log(`  Public URL: ${chalk.cyan(status.url)}`);
        console.log(`  ChatGPT URL: ${chalk.cyan(status.url + '/mcp')}`);

        if (status.startTime) {
          const uptime = Math.floor((Date.now() - status.startTime.getTime()) / 1000);
          const hours = Math.floor(uptime / 3600);
          const minutes = Math.floor((uptime % 3600) / 60);
          const seconds = uptime % 60;
          console.log(`  Uptime: ${chalk.yellow(`${hours}h ${minutes}m ${seconds}s`)}`);
        }
      } else {
        console.log(`  Status: ${chalk.red('Disconnected')}`);
        if (status.error) {
          console.log(`  Error: ${chalk.red(status.error)}`);
        }
      }
    } else {
      console.log(chalk.blue('\nRuntime Status:'));
      console.log(`  Status: ${chalk.gray('Not initialized')}`);
    }

    console.log(chalk.blue('\nCommands:'));
    console.log('  magi tunnel start   - Start ngrok tunnel');
    console.log('  magi tunnel stop    - Stop ngrok tunnel');
    console.log('  magi tunnel restart - Restart ngrok tunnel');
    console.log('  magi tunnel url     - Show tunnel URL');
    console.log('  magi tunnel status  - Show this status');
  }
}

export async function tunnelCommand(args: string[], loggerService: LoggerService): Promise<void> {
  const tunnel = new TunnelCommand(loggerService);
  const action = args[0] || 'status';
  await tunnel.execute(action);
}