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
  }

  connect(roomId, username = 'Guest') {
    this.roomId = roomId;
    this.username = username;
    const url = `${WS_URL}/rooms/${roomId}/`;

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
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

    this.socket.onclose = () => {
      console.log('WebSocket closed');
      this.emit('closed');
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
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.listeners = {};
  }
}

export default new WebSocketService();
