const WebSocket = require('ws');

class BrainXchangeClient {
  constructor(serverUrl = process.env.BRAINXCHANGE_SERVER || `wss://${process.env.AGIFORME_SERVER_DOMAIN || 'localhost'}/bx`) {
    this.serverUrl = serverUrl;
    this.ws = null;
    this.clientId = null;
    this.connectionId = null;
    this.username = null;
    this.nickname = null;
    this.connectedFriends = new Map(); // username -> {username, nickname}
    this.messageHandlers = new Map();
    this.isConnected = false;
  }

  // Connect to the exchange server
  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.on('open', () => {
          console.log('✅ Connected to BrainXchange Server');
          this.isConnected = true;
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        });

        this.ws.on('close', () => {
          console.log('Disconnected from BrainXchange Server');
          this.isConnected = false;
        });

        this.ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        });

        // Wait for connected message
        this.once('connected', (msg) => {
          this.clientId = msg.clientId;
          resolve(this.clientId);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  // Identify yourself with username and nickname
  identify(username, nickname) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.send({ 
        type: 'identify',
        username: username,
        nickname: nickname 
      });

      this.once('identified', (msg) => {
        this.username = msg.username;
        this.nickname = msg.nickname;
        resolve({
          username: msg.username,
          nickname: msg.nickname
        });
      });

      this.once('error', (msg) => {
        reject(new Error(msg.message));
      });
    });
  }

  // Create an invitation code
  createInvite() {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.send({ type: 'create_invite' });

      this.once('invite_created', (msg) => {
        resolve({
          code: msg.code,
          from: msg.from,
          expiresIn: msg.expiresIn
        });
      });

      this.once('error', (msg) => {
        reject(new Error(msg.message));
      });
    });
  }

  // Connect using an invitation code  
  connectWithCode(code, username, nickname) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.send({ 
        type: 'connect',
        code: code,
        username: username,
        nickname: nickname
      });

      this.once('connected_to_friend', (msg) => {
        this.connectionId = msg.connectionId;
        if (msg.friend) {
          this.connectedFriends.set(msg.friend.username, msg.friend);
        }
        resolve({
          connectionId: msg.connectionId,
          friend: msg.friend
        });
      });

      this.once('error', (msg) => {
        reject(new Error(msg.message));
      });
    });
  }

  // Send a question to a specific friend or any connected friend
  ask(question, targetUsername = null) {
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

      this.once('question_sent', (msg) => {
        resolve(msg);
      });

      this.once('error', (msg) => {
        reject(new Error(msg.message));
      });
    });
  }

  // Send an answer to a specific friend or any connected friend
  answer(answer, targetUsername = null) {
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

      this.once('answer_sent', (msg) => {
        resolve(msg);
      });

      this.once('error', (msg) => {
        reject(new Error(msg.message));
      });
    });
  }

  // Register a handler for incoming questions
  onQuestion(handler) {
    this.on('question', (msg) => {
      handler(msg.content, msg.from, msg.fromNickname);
    });
  }

  // Register a handler for incoming answers
  onAnswer(handler) {
    this.on('answer', (msg) => {
      handler(msg.content, msg.from, msg.fromNickname);
    });
  }

  // Register a handler for friend connection events
  onFriendConnected(handler) {
    this.on('friend_connected', (msg) => {
      if (msg.friend) {
        this.connectedFriends.set(msg.friend.username, msg.friend);
      }
      handler(msg.friend);
    });
  }

  // Register a handler for friend disconnection events
  onFriendDisconnected(handler) {
    this.on('friend_disconnected', (msg) => {
      if (msg.friend) {
        this.connectedFriends.delete(msg.friend.username);
      }
      handler(msg.friend);
    });
  }

  // Get list of connected friends
  getConnectedFriends() {
    return Array.from(this.connectedFriends.values());
  }

  // Get current user info
  getCurrentUser() {
    return {
      username: this.username,
      nickname: this.nickname,
      clientId: this.clientId
    };
  }

  // Send message to server
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // Handle incoming messages
  handleMessage(message) {
    const { type } = message;
    
    // Trigger any registered handlers for this message type
    const handlers = this.messageHandlers.get(type) || [];
    handlers.forEach(handler => handler(message));
  }

  // Event emitter functions
  on(event, handler) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event).push(handler);
  }

  once(event, handler) {
    const onceHandler = (message) => {
      handler(message);
      // Remove the handler after it's called once
      const handlers = this.messageHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(onceHandler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
    this.on(event, onceHandler);
  }

  // Disconnect from server
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
}

module.exports = BrainXchangeClient;