import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { roomAPI } from '../services/api';
import wsService from '../services/websocket';
import VideoPlayer from './VideoPlayer';
import VideoSearch from './VideoSearch';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageSwitch from './LanguageSwitch';

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
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [showRoomIdCopyToast, setShowRoomIdCopyToast] = useState(false);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);

  useEffect(() => {
    loadRoom();
  }, [roomId]);

  useEffect(() => {
    // Автоматически сворачиваем контролы когда есть видео
    if (videoUrl) {
      setIsControlsCollapsed(true);
    } else {
      setIsControlsCollapsed(false);
    }
  }, [videoUrl]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      console.log('Cleaning up WebSocket connection');
      wsService.disconnect();
    };
  }, [roomId]); // Убрал username из зависимостей

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
      setReconnecting(false);
    });

    wsService.on('closed', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    wsService.on('reconnecting', () => {
      console.log('WebSocket reconnecting...');
      setReconnecting(true);
    });

    wsService.on('room_state', (data) => {
      console.log('Initial room state:', data);
      if (data.video_url) {
        console.log('Setting video from room state:', data.video_url);
        setVideoUrl(data.video_url);
        setInputUrl(data.video_url);
        setVideoTitle(t('room.currentVideo'));
      }
    });

    wsService.on('user_list', (data) => {
      console.log('Connected users:', data.users);
      setConnectedUsers(data.users || []);
    });

    wsService.on('video_changed', (data) => {
      console.log('Video changed event received:', data.video_url);
      if (data.video_url) {
        setVideoUrl(data.video_url);
        setInputUrl(data.video_url);
        setVideoTitle(t('room.fromOtherUser'));
      } else {
        setVideoUrl('');
        setInputUrl('');
        setVideoTitle('');
      }
    });
  };

  const handleSetVideo = (url, title) => {
    if (url && url.trim()) {
      console.log('Setting video:', url, title);
      setVideoUrl(url);
      setVideoTitle(title || t('room.nowPlaying'));
      setInputUrl(url);
      wsService.sendVideoChange(url);
    }
  };

  const handleClearVideo = () => {
    setVideoUrl('');
    setVideoTitle('');
    setInputUrl('');
    wsService.sendVideoChange('');
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setShowRoomIdCopyToast(true);
    setTimeout(() => setShowRoomIdCopyToast(false), 2000);
  };

  const goHome = () => {
    // Сохраняем информацию о комнате перед уходом
    localStorage.setItem('tandem_last_room', JSON.stringify({
      roomId,
      username,
      timestamp: Date.now(),
    }));
    navigate('/');
  };

  if (loading) {
    return <div style={styles.loading}>Loading room...</div>;
  }

  return (
    <div style={styles.container}>
      {reconnecting && (
        <div style={styles.reconnectOverlay}>
          <div style={styles.reconnectBox}>
            <div style={styles.spinner} />
            <p style={styles.reconnectText}>{t('room.reconnecting')}</p>
          </div>
        </div>
      )}

      <div style={styles.logoContainer}>
        <div style={styles.logo} onClick={goHome}>
          <span style={styles.logoIcon}>🎬</span>
          <span style={styles.logoText}>Tandem</span>
        </div>
        <div style={styles.logoLanguageSwitch}>
          <LanguageSwitch />
        </div>
      </div>

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{t('room.roomTitle')} {room?.host_username}</h1>
          <p style={styles.username}>{t('room.you')} {username}</p>
        </div>
        <div style={styles.rightSection}>
          <div style={styles.usersSection}>
            <div style={styles.usersHeader}>
              {t('room.participants')} ({connectedUsers.length})
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
            {connected ? t('room.connected') : t('room.disconnected')}
          </div>
        </div>
      </div>

      <div style={isControlsCollapsed ? styles.controlsCollapsed : styles.controls}>
        {!isControlsCollapsed && (
          <>
            <VideoSearch onSelectVideo={handleSetVideo} />
            <div style={styles.copyButtons}>
              <div style={styles.copyButtonContainer}>
                <button onClick={copyRoomLink} style={styles.buttonSecondary}>
                  {t('home.copyRoomLink')}
                </button>
                {showCopyToast && (
                  <div style={styles.copyToast}>
                    {t('home.linkCopied')}
                  </div>
                )}
              </div>
              <div style={styles.copyButtonContainer}>
                <button onClick={copyRoomId} style={styles.buttonSecondary}>
                  {t('room.copyRoomId')}
                </button>
                {showRoomIdCopyToast && (
                  <div style={styles.copyToast}>
                    {t('room.idCopied')}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        <button
          onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
          style={styles.toggleButton}
          title={isControlsCollapsed ? t('room.showControls') : t('room.hideControls')}
        >
          {isControlsCollapsed ? '▼' : '▲'}
        </button>
      </div>

      <VideoPlayer
        roomId={roomId}
        videoUrl={videoUrl}
        videoTitle={videoTitle}
        onClearVideo={handleClearVideo}
      />

      <div style={styles.info}>
        <p style={styles.infoText}>
          💡 <strong>{t('room.tip')}</strong> {t('room.tipText')}
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
    position: 'relative',
  },
  logoContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '20px',
    position: 'relative',
  },
  logoLanguageSwitch: {
    position: 'absolute',
    right: '20px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '28px',
    fontWeight: 'bold',
    background: 'linear-gradient(270deg, #667eea, #764ba2, #f093fb, #4facfe, #667eea)',
    backgroundSize: '400% 400%',
    animation: 'gradientShift 8s ease infinite',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    userSelect: 'none',
  },
  logoIcon: {
    fontSize: '32px',
    filter: 'drop-shadow(0 2px 4px rgba(102, 126, 234, 0.3))',
    animation: 'iconPulse 3s ease-in-out infinite',
  },
  logoText: {
    letterSpacing: '2px',
  },
  reconnectOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  reconnectBox: {
    background: '#1a1a1a',
    padding: '40px',
    borderRadius: '12px',
    textAlign: 'center',
    border: '1px solid #333',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #333',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
  },
  reconnectText: {
    margin: 0,
    fontSize: '16px',
    color: '#ccc',
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
    padding: '3px 0',
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
    alignItems: 'center',
    marginBottom: '20px',
    padding: '20px',
    background: '#1a1a1a',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
  },
  controlsCollapsed: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '8px',
    background: '#1a1a1a',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
  },
  toggleButton: {
    padding: '8px 12px',
    fontSize: '16px',
    color: '#888',
    background: 'transparent',
    border: '1px solid #333',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginLeft: 'auto',
  },
  copyButtons: {
    display: 'flex',
    gap: '10px',
  },
  copyButtonContainer: {
    position: 'relative',
  },
  copyToast: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: '10px',
    padding: '8px 16px',
    background: '#4CAF50',
    color: 'white',
    borderRadius: '6px',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    animation: 'fadeIn 0.2s ease-in',
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
