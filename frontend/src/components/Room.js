import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { roomAPI } from '../services/api';
import wsService from '../services/websocket';
import VideoPlayer from './VideoPlayer';
import VideoLibrary from './VideoLibrary';

const generateUsername = () => {
  const adjectives = ['Red', 'Blue', 'Green', 'Purple', 'Orange', 'Yellow', 'Pink', 'Cyan', 'Magenta', 'Lime', 'Indigo', 'Violet'];
  const animals = ['Octopus', 'Whale', 'Dolphin', 'Shark', 'Turtle', 'Penguin', 'Seal', 'Otter', 'Jellyfish', 'Starfish', 'Squid', 'Crab'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adj} ${animal}`;
};

const getOrCreateUsername = () => {
  let username = localStorage.getItem('tandem_username');
  if (!username) {
    username = generateUsername();
    localStorage.setItem('tandem_username', username);
  }
  return username;
};

function Room() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const username = searchParams.get('username') || getOrCreateUsername();

  const [room, setRoom] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);

  useEffect(() => {
    loadRoom();
    connectWebSocket();

    return () => {
      wsService.disconnect();
    };
  }, [roomId]);

  const loadRoom = async () => {
    try {
      const response = await roomAPI.getRoom(roomId);
      setRoom(response.data);

      if (response.data.video_url) {
        setVideoUrl(response.data.video_url);
        setInputUrl(response.data.video_url);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading room:', error);
      alert('Room not found');
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    wsService.connect(roomId, username);

    wsService.on('connected', () => {
      console.log('WebSocket connected');
      setConnected(true);
    });

    wsService.on('closed', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    wsService.on('room_state', (data) => {
      console.log('Initial room state:', data);
      if (data.video_url) {
        console.log('Setting video from room state:', data.video_url);
        setVideoUrl(data.video_url);
        setInputUrl(data.video_url);
      }
    });

    wsService.on('user_list', (data) => {
      console.log('Connected users:', data.users);
      setConnectedUsers(data.users || []);
    });

    wsService.on('video_changed', (data) => {
      console.log('Video changed event received:', data.video_url);
      setVideoUrl(data.video_url);
      setInputUrl(data.video_url);
    });
  };

  const handleSetVideo = () => {
    if (inputUrl.trim()) {
      setVideoUrl(inputUrl);
      wsService.sendVideoChange(inputUrl);
    }
  };

  const handleSelectFromLibrary = (url, title) => {
    setVideoUrl(url);
    setInputUrl(url);
    wsService.sendVideoChange(url);
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link);
    alert('Ссылка на комнату скопирована!');
  };

  if (loading) {
    return <div style={styles.loading}>Loading room...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Комната: {room?.host_username}</h1>
          <p style={styles.username}>Вы: {username}</p>
        </div>
        <div style={styles.rightSection}>
          <div style={styles.usersSection}>
            <div style={styles.usersHeader}>
              👥 Участники ({connectedUsers.length})
            </div>
            <div style={styles.usersList}>
              {connectedUsers.map((user, index) => (
                <div key={index} style={styles.userItem}>
                  <span style={styles.userDot} />
                  {user}
                </div>
              ))}
            </div>
          </div>
          <div style={styles.status}>
            <span style={{ ...styles.statusDot, background: connected ? '#4CAF50' : '#f44336' }} />
            {connected ? 'Подключено' : 'Отключено'}
          </div>
        </div>
      </div>

      <div style={styles.controls}>
        <input
          type="text"
          placeholder="Paste video URL (e.g., .mp4, YouTube link)"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          style={styles.input}
        />
        <button onClick={handleSetVideo} style={styles.button}>
          Load Video
        </button>
        <VideoLibrary onSelectVideo={handleSelectFromLibrary} />
        <button onClick={copyRoomLink} style={styles.buttonSecondary}>
          📋 Copy Room Link
        </button>
      </div>

      <VideoPlayer roomId={roomId} videoUrl={videoUrl} />

      <div style={styles.info}>
        <p style={styles.infoText}>
          💡 <strong>Tip:</strong> Share the room link with friends to watch together!
          Play, pause, and seek will be synced automatically.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: 'white',
    padding: '20px',
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: 'white',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    padding: '20px',
    background: '#1a1a1a',
    borderRadius: '8px',
  },
  title: {
    margin: '0 0 5px 0',
    fontSize: '24px',
  },
  username: {
    margin: 0,
    color: '#888',
  },
  rightSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '10px',
  },
  usersSection: {
    background: '#2a2a2a',
    padding: '10px',
    borderRadius: '8px',
    minWidth: '200px',
  },
  usersHeader: {
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#667eea',
  },
  usersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#ccc',
  },
  userDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#4CAF50',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  controls: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    padding: '20px',
    background: '#1a1a1a',
    borderRadius: '8px',
  },
  input: {
    flex: 1,
    padding: '12px',
    fontSize: '14px',
    borderRadius: '6px',
    border: 'none',
  },
  button: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'white',
    background: '#667eea',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  buttonSecondary: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'white',
    background: '#444',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  info: {
    marginTop: '20px',
    padding: '20px',
    background: '#1a1a1a',
    borderRadius: '8px',
  },
  infoText: {
    margin: 0,
    color: '#ccc',
  },
};

export default Room;
