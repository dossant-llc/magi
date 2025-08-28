"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.brainXchange = exports.BrainXchangeService = void 0;
const ws_1 = require("ws");
const events_1 = require("events");
class BrainXchangeService extends events_1.EventEmitter {
    ws = null;
    serverUrl;
    clientId = null;
    connectionId = null;
    username = null;
    nickname = null;
    connectedFriends = new Map();
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
                    console.log('✅ Connected to BrainXchange Server');
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
                    console.log('Disconnected from BrainXchange Server');
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
    async identify(username, nickname) {
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
            this.once('identified', (msg) => {
                clearTimeout(timeout);
                this.username = msg.username || null;
                this.nickname = msg.nickname || null;
                resolve({
                    username: this.username || '',
                    nickname: this.nickname || ''
                });
            });
            this.once('error', (msg) => {
                clearTimeout(timeout);
                reject(new Error(msg.message || 'Identification failed'));
            });
        });
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
                    from: msg.from,
                    expiresIn: msg.expiresIn || '30 minutes'
                });
            });
            this.once('error', (msg) => {
                clearTimeout(timeout);
                reject(new Error(msg.message || 'Unknown error'));
            });
        });
    }
    async connectWithCode(code, username, nickname) {
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
            this.once('connected_to_friend', (msg) => {
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
            this.once('error', (msg) => {
                clearTimeout(timeout);
                reject(new Error(msg.message || 'Invalid code'));
            });
        });
    }
    async ask(question, targetUsername) {
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
            this.once('error', (msg) => {
                clearTimeout(timeout);
                reject(new Error(msg.message || 'Failed to send question'));
            });
        });
    }
    async answer(answer, targetUsername) {
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
            this.once('error', (msg) => {
                clearTimeout(timeout);
                reject(new Error(msg.message || 'Failed to send answer'));
            });
        });
    }
    onQuestion(handler) {
        this.on('question', (msg) => {
            handler(msg.content || '', msg.from || '', msg.fromNickname);
        });
    }
    onAnswer(handler) {
        this.on('answer', (msg) => {
            handler(msg.content || '', msg.from || '', msg.fromNickname);
        });
    }
    onFriendConnected(handler) {
        this.on('friend_connected', (msg) => {
            if (msg.friend) {
                this.connectedFriends.set(msg.friend.username, msg.friend);
            }
            handler(msg.friend);
        });
    }
    onFriendDisconnected(handler) {
        this.on('friend_disconnected', (msg) => {
            if (msg.friend) {
                this.connectedFriends.delete(msg.friend.username);
            }
            handler(msg.friend);
        });
    }
    getConnectedFriends() {
        return Array.from(this.connectedFriends.values());
    }
    getCurrentUser() {
        return {
            username: this.username,
            nickname: this.nickname,
            clientId: this.clientId
        };
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
exports.BrainXchangeService = BrainXchangeService;
// Singleton instance for the app
exports.brainXchange = new BrainXchangeService();
