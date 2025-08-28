"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.magiExchange = exports.MagiExchangeService = void 0;
const ws_1 = require("ws");
const events_1 = require("events");
class MagiExchangeService extends events_1.EventEmitter {
    ws = null;
    serverUrl;
    clientId = null;
    connectionId = null;
    isConnected = false;
    reconnectAttempts = 0;
    maxReconnectAttempts = 5;
    constructor(serverUrl = 'ws://m3u.dossant.com:8082') {
        super();
        this.serverUrl = serverUrl;
    }
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new ws_1.WebSocket(this.serverUrl);
                this.ws.on('open', () => {
                    console.log('✅ Connected to Magi Exchange Server');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                });
                this.ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        this.handleMessage(message);
                    }
                    catch (error) {
                        console.error('Error parsing message:', error);
                    }
                });
                this.ws.on('close', () => {
                    console.log('Disconnected from Magi Exchange Server');
                    this.isConnected = false;
                    this.handleReconnect();
                });
                this.ws.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    this.emit('error', error);
                });
                // Wait for connected message
                this.once('connected', (msg) => {
                    this.clientId = msg.clientId || null;
                    resolve(this.clientId || '');
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => {
                this.connect().catch(console.error);
            }, 3000 * this.reconnectAttempts);
        }
    }
    async createInvite() {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('Not connected to server'));
                return;
            }
            this.send({ type: 'create_invite' });
            const timeout = setTimeout(() => {
                reject(new Error('Timeout waiting for invitation'));
            }, 10000);
            this.once('invite_created', (msg) => {
                clearTimeout(timeout);
                resolve({
                    code: msg.code || '',
                    expiresIn: msg.expiresIn || '30 minutes'
                });
            });
            this.once('error', (msg) => {
                clearTimeout(timeout);
                reject(new Error(msg.message || 'Unknown error'));
            });
        });
    }
    async connectWithCode(code) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('Not connected to server'));
                return;
            }
            this.send({
                type: 'connect',
                code: code
            });
            const timeout = setTimeout(() => {
                reject(new Error('Timeout connecting with code'));
            }, 10000);
            this.once('connected_to_friend', (msg) => {
                clearTimeout(timeout);
                this.connectionId = msg.connectionId || null;
                resolve(msg.connectionId || '');
            });
            this.once('error', (msg) => {
                clearTimeout(timeout);
                reject(new Error(msg.message || 'Invalid code'));
            });
        });
    }
    async ask(question) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('Not connected to server'));
                return;
            }
            this.send({
                type: 'ask',
                content: question
            });
            const timeout = setTimeout(() => {
                reject(new Error('Timeout sending question'));
            }, 10000);
            this.once('question_sent', () => {
                clearTimeout(timeout);
                resolve();
            });
            this.once('error', (msg) => {
                clearTimeout(timeout);
                reject(new Error(msg.message || 'Failed to send question'));
            });
        });
    }
    async answer(answer) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('Not connected to server'));
                return;
            }
            this.send({
                type: 'answer',
                content: answer
            });
            const timeout = setTimeout(() => {
                reject(new Error('Timeout sending answer'));
            }, 10000);
            this.once('answer_sent', () => {
                clearTimeout(timeout);
                resolve();
            });
            this.once('error', (msg) => {
                clearTimeout(timeout);
                reject(new Error(msg.message || 'Failed to send answer'));
            });
        });
    }
    onQuestion(handler) {
        this.on('question', (msg) => {
            handler(msg.content || '', msg.from || '');
        });
    }
    onAnswer(handler) {
        this.on('answer', (msg) => {
            handler(msg.content || '', msg.from || '');
        });
    }
    onFriendConnected(handler) {
        this.on('friend_connected', handler);
    }
    onFriendDisconnected(handler) {
        this.on('friend_disconnected', handler);
    }
    send(message) {
        if (this.ws && this.ws.readyState === ws_1.WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
    handleMessage(message) {
        this.emit(message.type, message);
    }
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.isConnected = false;
        }
    }
    get connected() {
        return this.isConnected;
    }
    get currentClientId() {
        return this.clientId;
    }
    get currentConnectionId() {
        return this.connectionId;
    }
}
exports.MagiExchangeService = MagiExchangeService;
// Singleton instance for the app
exports.magiExchange = new MagiExchangeService();
