/**
 * Ngrok Connector Service - Direct ChatGPT Connection
 *
 * Manages ngrok tunnel for bypassing Brain Proxy and providing
 * direct access to BrainBridge from ChatGPT
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface NgrokSecurityConfig {
  allowedIPs: string[];
  oauth: {
    enabled: boolean;
    provider: string;
    allowedEmails: string[];
    allowedDomains: string[];
  };
  jwt: {
    enabled: boolean;
    secret?: string;
    issuer?: string;
  };
  webhook: {
    enabled: boolean;
    secret?: string;
  };
  oidc: {
    enabled: boolean;
    issuer?: string;
    clientId?: string;
    clientSecret?: string;
  };
  mutualTls: {
    enabled: boolean;
    caCert?: string;
  };
}

export interface NgrokConfig {
  enabled: boolean;
  region: string;
  port: number;
  subdomain?: string;
  staticDomain?: string;
  authToken?: string;
  basicAuth?: {
    enabled: boolean;
    username?: string;
    password?: string;
  };
  security?: NgrokSecurityConfig;
}

export interface NgrokStatus {
  connected: boolean;
  url?: string;
  region: string;
  port: number;
  error?: string;
  startTime?: Date;
}

export class NgrokConnector extends EventEmitter {
  private config: NgrokConfig;
  private process: ChildProcess | null = null;
  private status: NgrokStatus;
  private loggerService: any;

  constructor(config: NgrokConfig, loggerService: any) {
    super();
    this.config = config;
    this.loggerService = loggerService;
    this.status = {
      connected: false,
      region: config.region,
      port: config.port
    };
  }

  async start(): Promise<NgrokStatus> {
    if (this.process) {
      this.loggerService.winston.warn('Ngrok tunnel already running', {
        component: 'NgrokConnector',
        action: 'start_attempt_duplicate'
      });
      return this.status;
    }

    if (!this.config.enabled) {
      this.loggerService.winston.info('Ngrok tunnel disabled in config', {
        component: 'NgrokConnector',
        action: 'start_disabled'
      });
      return this.status;
    }

    try {
      this.loggerService.winston.info('Starting ngrok tunnel', {
        component: 'NgrokConnector',
        action: 'start',
        port: this.config.port,
        region: this.config.region
      });

      // Build ngrok command
      const args = [
        'http',
        this.config.port.toString(),
        '--region', this.config.region,
        '--log', 'stdout',
        '--log-format', 'json'
      ];

      // Add optional parameters
      if (this.config.subdomain) {
        args.push('--subdomain', this.config.subdomain);
      }

      if (this.config.staticDomain) {
        args.push('--domain', this.config.staticDomain);
      }

      // Add basic authentication
      if (this.config.basicAuth?.enabled && this.config.basicAuth.username && this.config.basicAuth.password) {
        args.push('--basic-auth', `${this.config.basicAuth.username}:${this.config.basicAuth.password}`);
      }

      // Add traffic policy for security features
      if (this.config.security) {
        const policy = this.generateTrafficPolicy();
        if (policy) {
          args.push('--policy', policy);
        }
      }

      // Start ngrok process
      this.process = spawn('ngrok', args);
      this.status.startTime = new Date();

      // Handle process events
      this.process.stdout?.on('data', (data) => {
        this.handleOutput(data.toString());
      });

      this.process.stderr?.on('data', (data) => {
        this.loggerService.winston.error('Ngrok stderr', {
          component: 'NgrokConnector',
          action: 'stderr',
          data: data.toString()
        });
      });

      this.process.on('exit', (code) => {
        this.loggerService.winston.info('Ngrok process exited', {
          component: 'NgrokConnector',
          action: 'exit',
          code
        });
        this.cleanup();
      });

      this.process.on('error', (error) => {
        this.loggerService.winston.error('Ngrok process error', {
          component: 'NgrokConnector',
          action: 'error',
          error: error.message
        });
        this.status.error = error.message;
        this.cleanup();
      });

      // Wait for tunnel establishment (with timeout)
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Ngrok tunnel startup timeout'));
        }, 30000);

        this.once('connected', () => {
          clearTimeout(timeout);
          resolve(this.status);
        });

        this.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

    } catch (error: any) {
      this.status.error = error.message;
      this.loggerService.winston.error('Failed to start ngrok tunnel', {
        component: 'NgrokConnector',
        action: 'start_error',
        error: error.message
      });
      return this.status;
    }
  }

  async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    this.loggerService.winston.info('Stopping ngrok tunnel', {
      component: 'NgrokConnector',
      action: 'stop'
    });

    this.process.kill('SIGTERM');
    this.cleanup();
  }

  getStatus(): NgrokStatus {
    return { ...this.status };
  }

  isConnected(): boolean {
    return this.status.connected;
  }

  getPublicUrl(): string | undefined {
    return this.status.url;
  }

  private handleOutput(output: string): void {
    const lines = output.trim().split('\n');

    for (const line of lines) {
      try {
        // Try to parse JSON log format
        const logData = JSON.parse(line);

        if (logData.msg === 'started tunnel' && logData.url) {
          this.status.connected = true;
          this.status.url = logData.url;
          this.status.error = undefined;

          this.loggerService.winston.info('Ngrok tunnel established', {
            component: 'NgrokConnector',
            action: 'connected',
            url: this.status.url,
            region: this.config.region,
            port: this.config.port
          });

          this.emit('connected', this.status);
        }

        if (logData.lvl === 'eror' || logData.err) {
          const errorMsg = logData.msg || logData.err;
          this.status.error = errorMsg;

          this.loggerService.winston.error('Ngrok tunnel error', {
            component: 'NgrokConnector',
            action: 'tunnel_error',
            error: errorMsg
          });

          this.emit('error', new Error(errorMsg));
        }

      } catch (parseError) {
        // Not JSON, might be plain text output
        if (line.includes('ERROR') || line.includes('error')) {
          this.status.error = line;
          this.loggerService.winston.error('Ngrok error (plain text)', {
            component: 'NgrokConnector',
            action: 'plain_error',
            error: line
          });
        }
      }
    }
  }

  private generateTrafficPolicy(): string | null {
    if (!this.config.security) return null;

    const policy: any = {
      inbound: []
    };

    // IP Restrictions (Free)
    if (this.config.security.allowedIPs.length > 0) {
      policy.inbound.push({
        name: 'ip-restriction',
        actions: [{
          type: 'ip-restriction',
          config: {
            allow: this.config.security.allowedIPs,
            deny: []
          }
        }]
      });
    }

    // OAuth (Free)
    if (this.config.security.oauth.enabled) {
      const oauthConfig: any = {
        provider: this.config.security.oauth.provider
      };

      if (this.config.security.oauth.allowedEmails.length > 0) {
        oauthConfig.allowed_emails = this.config.security.oauth.allowedEmails;
      }

      if (this.config.security.oauth.allowedDomains.length > 0) {
        oauthConfig.allowed_domains = this.config.security.oauth.allowedDomains;
      }

      policy.inbound.push({
        name: 'oauth',
        actions: [{
          type: 'oauth',
          config: oauthConfig
        }]
      });
    }

    // JWT Validation (Free)
    if (this.config.security.jwt.enabled && this.config.security.jwt.secret) {
      policy.inbound.push({
        name: 'jwt-validation',
        actions: [{
          type: 'jwt-validation',
          config: {
            secret: this.config.security.jwt.secret,
            issuer: this.config.security.jwt.issuer
          }
        }]
      });
    }

    // Webhook Verification (Free)
    if (this.config.security.webhook.enabled && this.config.security.webhook.secret) {
      policy.inbound.push({
        name: 'webhook-verification',
        actions: [{
          type: 'webhook-verification',
          config: {
            secret: this.config.security.webhook.secret
          }
        }]
      });
    }

    // OIDC (Free)
    if (this.config.security.oidc.enabled) {
      policy.inbound.push({
        name: 'oidc',
        actions: [{
          type: 'oidc',
          config: {
            issuer: this.config.security.oidc.issuer,
            client_id: this.config.security.oidc.clientId,
            client_secret: this.config.security.oidc.clientSecret
          }
        }]
      });
    }

    // Mutual TLS (Paid)
    if (this.config.security.mutualTls.enabled && this.config.security.mutualTls.caCert) {
      policy.inbound.push({
        name: 'mutual-tls',
        actions: [{
          type: 'mutual-tls',
          config: {
            ca_cert: this.config.security.mutualTls.caCert
          }
        }]
      });
    }

    // Return policy as JSON string if we have rules
    return policy.inbound.length > 0 ? JSON.stringify(policy) : null;
  }

  private cleanup(): void {
    if (this.process) {
      this.process.removeAllListeners();
      this.process = null;
    }

    this.status.connected = false;
    this.status.url = undefined;
    this.emit('disconnected');
  }
}