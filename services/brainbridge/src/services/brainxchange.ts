import { WebSocket } from 'ws';
import { EventEmitter } from 'events';

interface MagiMessage {
  type: string;
  content?: string;
  code?: string;
  from?: string;
  fromNickname?: string;
  clientId?: string;
  connectionId?: string;
  message?: string;
  expiresIn?: string;
  username?: string;
  nickname?: string;
  friend?: {username: string, nickname: string};
  to?: string;
}

export class BrainXchangeService extends EventEmitter {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private clientId: string | null = null;
  private connectionId: string | null = null;
  private username: string | null = null;
  private nickname: string | null = null;
  private connectedFriends: Map<string, {username: string, nickname: string}> = new Map();
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private connecting: boolean = false;

  constructor(serverUrl?: string) {
    super();
    // Always get fresh environment variable, don't cache at module load time
    const defaultDomain = process.env.AGIFORME_SERVER_DOMAIN || 'localhost';
    this.serverUrl = serverUrl || process.env.BRAINXCHANGE_SERVER || `ws://${defaultDomain}:9025/bx`;
  }

  async connect(): Promise<string> {
    // Prevent multiple simultaneous connection attempts
    if (this.connecting) {
      console.log('⏳ BrainXchange connection already in progress');
      return '';
    }
    
    this.connecting = true;
    
    return new Promise((resolve, reject) => {
      try {
        // Close existing connection if any
        if (this.ws && this.ws.readyState === this.ws.OPEN) {
          console.log('🔄 Closing existing BrainXchange connection');
          this.ws.close();
        }
        
        if (process.env.DEBUG_BRAINXCHANGE) {
          console.log('🔗 Attempting to connect to:', this.serverUrl);
          console.log('🔧 Environment BRAINXCHANGE_SERVER:', process.env.BRAINXCHANGE_SERVER);
        }
        this.ws = new WebSocket(this.serverUrl);

        this.ws.on('open', () => {
          console.log('✅ Connected to BrainXchange Server');
          this.isConnected = true;
          this.connecting = false;
          this.reconnectAttempts = 0;
        });

        this.ws.on('message', (data) => {
          try {
            const message: MagiMessage = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        });

        this.ws.on('close', () => {
          if (process.env.DEBUG_BRAINXCHANGE) {
            console.log('Disconnected from BrainXchange Server');
          }
          this.isConnected = false;
          this.handleReconnect();
        });

        this.ws.on('error', (error) => {
          // Suppress verbose WebSocket connection errors - only log if debugging
          if (process.env.DEBUG_BRAINXCHANGE) {
            console.error('WebSocket error:', error);
          }
          this.isConnected = false;
          this.connecting = false;
          // Don't emit error to prevent crash - just log and continue
          reject(error);
        });

        // Wait for connected message
        this.once('connected', (msg: MagiMessage) => {
          this.clientId = msg.clientId || null;
          resolve(this.clientId || '');
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      if (process.env.DEBUG_BRAINXCHANGE) {
        console.log(`Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      }
      setTimeout(() => {
        this.connect().catch(() => {
          // Suppress connection errors - only log if debugging
          if (process.env.DEBUG_BRAINXCHANGE) {
            console.error('BrainXchange reconnection failed');
          }
        });
      }, 3000 * this.reconnectAttempts);
    }
  }

  async identify(username: string, nickname?: string): Promise<{username: string, nickname: string}> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.send({ 
        type: 'identify',
        username,
        nickname 
      });

      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for identification'));
      }, 10000);

      this.once('identified', (msg: MagiMessage) => {
        clearTimeout(timeout);
        this.username = msg.username || null;
        this.nickname = msg.nickname || null;
        resolve({
          username: this.username || '',
          nickname: this.nickname || ''
        });
      });

      this.once('error', (msg: MagiMessage) => {
        clearTimeout(timeout);
        reject(new Error(msg.message || 'Identification failed'));
      });
    });
  }

  async createInvite(): Promise<{ code: string; from?: string; expiresIn: string }> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.send({ type: 'create_invite' });

      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for invitation'));
      }, 10000);

      this.once('invite_created', (msg: MagiMessage) => {
        clearTimeout(timeout);
        resolve({
          code: msg.code || '',
          from: msg.from,
          expiresIn: msg.expiresIn || '30 minutes'
        });
      });

      this.once('error', (msg: MagiMessage) => {
        clearTimeout(timeout);
        reject(new Error(msg.message || 'Unknown error'));
      });
    });
  }

  async connectWithCode(code: string, username?: string, nickname?: string): Promise<{connectionId: string, friend?: {username: string, nickname: string}}> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.send({ 
        type: 'connect',
        code: code,
        username,
        nickname
      });

      const timeout = setTimeout(() => {
        reject(new Error('Timeout connecting with code'));
      }, 10000);

      this.once('connected_to_friend', (msg: MagiMessage) => {
        clearTimeout(timeout);
        this.connectionId = msg.connectionId || null;
        
        if (msg.friend) {
          this.connectedFriends.set(msg.friend.username, msg.friend);
        }
        
        resolve({
          connectionId: msg.connectionId || '',
          friend: msg.friend
        });
      });

      this.once('error', (msg: MagiMessage) => {
        clearTimeout(timeout);
        reject(new Error(msg.message || 'Invalid code'));
      });
    });
  }

  async ask(question: string, targetUsername?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.send({
        type: 'ask',
        content: question,
        to: targetUsername
      });

      const timeout = setTimeout(() => {
        reject(new Error('Timeout sending question'));
      }, 10000);

      this.once('question_sent', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.once('error', (msg: MagiMessage) => {
        clearTimeout(timeout);
        reject(new Error(msg.message || 'Failed to send question'));
      });
    });
  }

  async answer(answer: string, targetUsername?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.send({
        type: 'answer',
        content: answer,
        to: targetUsername
      });

      const timeout = setTimeout(() => {
        reject(new Error('Timeout sending answer'));
      }, 10000);

      this.once('answer_sent', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.once('error', (msg: MagiMessage) => {
        clearTimeout(timeout);
        reject(new Error(msg.message || 'Failed to send answer'));
      });
    });
  }

  onQuestion(handler: (content: string, from: string, fromNickname?: string) => void): void {
    this.on('question', (msg: MagiMessage) => {
      handler(msg.content || '', msg.from || '', msg.fromNickname);
    });
  }

  onAnswer(handler: (content: string, from: string, fromNickname?: string) => void): void {
    this.on('answer', (msg: MagiMessage) => {
      handler(msg.content || '', msg.from || '', msg.fromNickname);
    });
  }

  onFriendConnected(handler: (friend?: {username: string, nickname: string}) => void): void {
    this.on('friend_connected', (msg: MagiMessage) => {
      if (msg.friend) {
        this.connectedFriends.set(msg.friend.username, msg.friend);
      }
      handler(msg.friend);
    });
  }

  onFriendDisconnected(handler: (friend?: {username: string, nickname: string}) => void): void {
    this.on('friend_disconnected', (msg: MagiMessage) => {
      if (msg.friend) {
        this.connectedFriends.delete(msg.friend.username);
      }
      handler(msg.friend);
    });
  }

  getConnectedFriends(): Array<{username: string, nickname: string}> {
    return Array.from(this.connectedFriends.values());
  }

  getCurrentUser(): {username: string | null, nickname: string | null, clientId: string | null} {
    return {
      username: this.username,
      nickname: this.nickname,
      clientId: this.clientId
    };
  }

  private send(message: MagiMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleMessage(message: MagiMessage): void {
    this.emit(message.type, message);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }

  get currentClientId(): string | null {
    return this.clientId;
  }

  get currentConnectionId(): string | null {
    return this.connectionId;
  }
}

// Singleton instance for the app
export const brainXchange = new BrainXchangeService();