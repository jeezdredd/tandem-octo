const getWsUrl = () => {
  // If env variable is set and not localhost, use it
  if (process.env.REACT_APP_WS_URL && !process.env.REACT_APP_WS_URL.includes('localhost')) {
    return process.env.REACT_APP_WS_URL;
  }
  
  // Auto-detect based on current page URL (for production)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use backend URL from env or construct from API URL
    const apiUrl = process.env.REACT_APP_API_URL;
    if (apiUrl && !apiUrl.includes('localhost')) {
      const backendHost = apiUrl.replace(/^https?:\/\//, '').replace('/api', '');
      return `${protocol}//${backendHost}`;
    }
  }
  
  // Fallback to localhost for development
  return 'ws://localhost:8000/ws';
};

const WS_URL = getWsUrl();

class WebSocketService {
  constructor() {
    this.socket = null;
    this.roomId = null;
    this.username = null;
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.shouldReconnect = true;
  }

  connect(roomId, username = 'Guest') {
    // Prevent rapid reconnects
    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
      console.log('WebSocket already connecting, skipping...');
      return;
    }

    // Close existing connection if any WITHOUT triggering reconnect
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      console.log('Closing existing WebSocket before reconnect');
      this.shouldReconnect = false; // Отключаем автореконнект перед закрытием
      this.socket.close();
      // Даём время на закрытие
      setTimeout(() => this._createConnection(roomId, username), 100);
      return;
    }

    this._createConnection(roomId, username);
  }

  _createConnection(roomId, username) {
    this.roomId = roomId;
    this.username = username;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    const url = `${WS_URL}/rooms/${roomId}/`;

    console.log('WebSocket connecting to:', url);
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.socket.send(JSON.stringify({
        type: 'join',
        username: this.username,
      }));
      this.emit('connected');
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket message:', data);
      this.emit('message', data);

      if (data.type) {
        this.emit(data.type, data);
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket closed, code:', event.code, 'reason:', event.reason);
      this.emit('closed');
      
      // Auto-reconnect if not intentionally disconnected
      if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;
        console.log(`WebSocket reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.emit('reconnecting', { attempt: this.reconnectAttempts, maxAttempts: this.maxReconnectAttempts });
        setTimeout(() => {
          if (this.shouldReconnect) {
            this.connect(this.roomId, this.username);
          }
        }, delay);
      }
    };
  }

  sendPlay(currentTime) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocketService: Sending play event, time:', currentTime);
      this.socket.send(JSON.stringify({
        type: 'play',
        current_time: currentTime,
      }));
    } else {
      console.error('WebSocketService: Cannot send play - socket not ready', this.socket?.readyState);
    }
  }

  sendPause(currentTime) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocketService: Sending pause event, time:', currentTime);
      this.socket.send(JSON.stringify({
        type: 'pause',
        current_time: currentTime,
      }));
    } else {
      console.error('WebSocketService: Cannot send pause - socket not ready', this.socket?.readyState);
    }
  }

  sendSeek(currentTime, isPlaying) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocketService: Sending seek event, time:', currentTime);
      this.socket.send(JSON.stringify({
        type: 'seek',
        current_time: currentTime,
        is_playing: isPlaying,
      }));
    } else {
      console.error('WebSocketService: Cannot send seek - socket not ready', this.socket?.readyState);
    }
  }

  sendVideoChange(videoUrl) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocketService: Sending video_change event, url:', videoUrl);
      this.socket.send(JSON.stringify({
        type: 'video_change',
        video_url: videoUrl,
      }));
    } else {
      console.error('WebSocketService: Cannot send video_change - socket not ready', this.socket?.readyState);
    }
  }

  sendUsernameChange(newUsername) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocketService: Sending username_change event, username:', newUsername);
      this.username = newUsername;
      this.socket.send(JSON.stringify({
        type: 'username_change',
        username: newUsername,
      }));
    } else {
      console.error('WebSocketService: Cannot send username_change - socket not ready', this.socket?.readyState);
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.listeners = {};
  }
}

export default new WebSocketService();
