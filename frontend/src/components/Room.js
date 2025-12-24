import React, { useEffect, useState, useRef } from 'react';
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
  const { t } = useLanguage();
  const navigate = useNavigate();
  const usernameInputRef = useRef(null);

  const [username, setUsername] = useState(() => {
    // Приоритет: 1) localStorage 2) URL параметр 3) генерация нового
    const savedUsername = localStorage.getItem('tandem_username');
    if (savedUsername) {
      return savedUsername;
    }
    const urlUsername = searchParams.get('username');
    if (urlUsername) {
      localStorage.setItem('tandem_username', urlUsername);
      return urlUsername;
    }
    const generated = generateUsername();
    localStorage.setItem('tandem_username', generated);
    return generated;
  });
  const [editingUsername, setEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
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
  }, [roomId]);

  useEffect(() => {
    if (editingUsername && usernameInputRef.current) {
      usernameInputRef.current.focus();
      usernameInputRef.current.select();
    }
  }, [editingUsername]);

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
    localStorage.setItem('tandem_last_room', JSON.stringify({
      roomId,
      username,
      timestamp: Date.now(),
    }));
    navigate('/');
  };

  const startEditingUsername = () => {
    setTempUsername(username || '');
    setEditingUsername(true);
  };

  const saveUsername = () => {
    if (tempUsername.trim() && tempUsername !== username) {
      const newUsername = tempUsername.trim();
      setUsername(newUsername);
      localStorage.setItem('tandem_username', newUsername);
      wsService.sendUsernameChange(newUsername);
    }
    setEditingUsername(false);
  };

  const cancelEditingUsername = () => {
    setTempUsername(username);
    setEditingUsername(false);
  };

  const handleUsernameKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveUsername();
    } else if (e.key === 'Escape') {
      cancelEditingUsername();
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingSpinner} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {reconnecting && (
        <div style={styles.reconnectOverlay}>
          <div style={styles.reconnectBox}>
            <div style={styles.reconnectSpinner} />
            <p style={styles.reconnectText}>{t('room.reconnecting')}</p>
          </div>
        </div>
      )}

      <div style={styles.navbar}>
        <div className="navbar-logo" style={styles.logo} onClick={goHome}>
          <span style={styles.logoText}>Tandem</span>
        </div>
        <div style={styles.navbarRight}>
          <LanguageSwitch />
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.sidebar}>
          <div className="card" style={styles.card}>
            <div style={styles.cardSection}>
              <div style={styles.sectionLabel}>{t('room.roomTitle').replace(':', '')}</div>
              <div style={styles.sectionValue}>{room?.host_username}</div>
            </div>

            <div style={styles.divider} />

            <div style={styles.cardSection}>
              <div style={styles.sectionLabel}>Room ID</div>
              <div style={styles.roomIdValue}>{roomId}</div>
            </div>

            <div style={styles.divider} />

            <div style={styles.cardSection}>
              <div style={styles.sectionLabel}>{t('room.you').replace(':', '')}</div>
              {editingUsername ? (
                <input
                  ref={usernameInputRef}
                  type="text"
                  value={tempUsername}
                  onChange={(e) => setTempUsername(e.target.value)}
                  onKeyDown={handleUsernameKeyDown}
                  onBlur={saveUsername}
                  style={styles.usernameInput}
                  maxLength={30}
                />
              ) : (
                <div
                  className="editable-username"
                  style={styles.editableUsername}
                  onClick={startEditingUsername}
                  title={t('room.editUsername')}
                >
                  {username}
                </div>
              )}
            </div>
          </div>

          <div className="card" style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardHeaderText}>{t('room.participants')}</span>
              <span style={styles.badge}>{connectedUsers.length}</span>
            </div>
            <div style={styles.usersList}>
              {connectedUsers.map((user, index) => (
                <div key={index} style={styles.userItem}>
                  <div style={styles.userAvatar}>
                    {user.charAt(0).toUpperCase()}
                  </div>
                  <span style={styles.userName}>{user}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={styles.statusCard}>
            <div style={styles.statusIndicator}>
              <div style={{
                ...styles.statusDot,
                background: connected ? '#32D74B' : '#FF453A',
              }} />
              <span style={styles.statusText}>
                {connected ? t('room.connected') : t('room.disconnected')}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.mainContent}>
          <div className="controls-container" style={styles.controlsContainer}>
            <div
              className={`controls-content ${!isControlsCollapsed ? 'expanded' : 'collapsed'}`}
              style={{
                ...styles.controlsContent,
                maxHeight: isControlsCollapsed ? '0' : '500px',
                opacity: isControlsCollapsed ? 0 : 1,
                overflow: isControlsCollapsed ? 'hidden' : 'visible',
              }}
            >
              <VideoSearch onSelectVideo={handleSetVideo} />
              <div style={styles.controlsActions}>
                <div style={styles.copyButtonContainer}>
                  <button onClick={copyRoomLink} className="btn-secondary" style={styles.btnSecondary}>
                    {t('home.copyRoomLink')}
                  </button>
                  {showCopyToast && (
                    <div style={styles.toast}>
                      {t('home.linkCopied')}
                    </div>
                  )}
                </div>
                <div style={styles.copyButtonContainer}>
                  <button onClick={copyRoomId} className="btn-secondary" style={styles.btnSecondary}>
                    {t('room.copyRoomId')}
                  </button>
                  {showRoomIdCopyToast && (
                    <div style={styles.toast}>
                      {t('room.idCopied')}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
              className="toggle-btn"
              style={styles.toggleBtn}
              title={isControlsCollapsed ? t('room.showControls') : t('room.hideControls')}
            >
              {isControlsCollapsed ? '⌃' : '⌄'}
            </button>
          </div>

          <VideoPlayer
            roomId={roomId}
            videoUrl={videoUrl}
            videoTitle={videoTitle}
            onClearVideo={handleClearVideo}
          />

          <div style={styles.tip}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={styles.tipIcon}>
              <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM10 15C9.45 15 9 14.55 9 14V10C9 9.45 9.45 9 10 9C10.55 9 11 9.45 11 10V14C11 14.55 10.55 15 10 15ZM11 7H9V5H11V7Z" fill="#8E8E93"/>
            </svg>
            <span style={styles.tipText}>{t('room.tipText')}</span>
          </div>
        </div>
      </div>

      <style>{globalStyles}</style>
    </div>
  );
}

const globalStyles = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .card {
    transition: all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1);
  }

  .navbar-logo:hover {
    opacity: 0.8;
  }

  .navbar-logo:active {
    opacity: 0.6;
  }

  .editable-username:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .btn-secondary:active {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(0.98);
  }

  .toggle-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .toggle-btn:active {
    background: rgba(255, 255, 255, 0.05);
  }

  @media (max-width: 1024px) {
    .content-grid {
      grid-template-columns: 1fr !important;
    }
  }

  @media (max-width: 640px) {
    .controls-actions {
      flex-direction: column !important;
    }
  }
`;

const styles = {
  container: {
    minHeight: '100vh',
    background: '#000000',
    color: '#FFFFFF',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  },
  loading: {
    minHeight: '100vh',
    background: '#000000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    width: '36px',
    height: '36px',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTop: '3px solid #007AFF',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  reconnectOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(20px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  reconnectBox: {
    background: 'rgba(28, 28, 30, 0.95)',
    backdropFilter: 'blur(20px)',
    padding: '32px 40px',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
  reconnectSpinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTop: '3px solid #007AFF',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 16px',
  },
  reconnectText: {
    margin: 0,
    fontSize: '15px',
    color: '#AEAEB2',
    fontWeight: '500',
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 32px',
    background: 'rgba(28, 28, 30, 0.7)',
    backdropFilter: 'blur(20px) saturate(180%)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  logo: {
    fontSize: '20px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease',
    userSelect: 'none',
  },
  logoText: {
    background: 'linear-gradient(135deg, #FFFFFF 0%, #AEAEB2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  navbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    gap: '24px',
    padding: '24px 32px',
    maxWidth: '1600px',
    margin: '0 auto',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  card: {
    background: 'rgba(28, 28, 30, 0.7)',
    backdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  cardSection: {
    padding: '16px 20px',
  },
  sectionLabel: {
    fontSize: '13px',
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  sectionValue: {
    fontSize: '17px',
    color: '#FFFFFF',
    fontWeight: '400',
  },
  roomIdValue: {
    fontSize: '15px',
    color: '#AEAEB2',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontWeight: '500',
  },
  divider: {
    height: '1px',
    background: 'rgba(84, 84, 88, 0.3)',
  },
  editableUsername: {
    fontSize: '17px',
    color: '#007AFF',
    fontWeight: '500',
    cursor: 'pointer',
    padding: '4px 8px',
    margin: '-4px -8px',
    borderRadius: '6px',
    transition: 'background 0.2s ease',
  },
  usernameInput: {
    width: '100%',
    fontSize: '17px',
    color: '#FFFFFF',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid #007AFF',
    borderRadius: '8px',
    padding: '8px 12px',
    fontFamily: 'inherit',
    outline: 'none',
    boxShadow: '0 0 0 3px rgba(0, 122, 255, 0.15)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(84, 84, 88, 0.3)',
  },
  cardHeaderText: {
    fontSize: '15px',
    color: '#FFFFFF',
    fontWeight: '600',
  },
  badge: {
    fontSize: '13px',
    color: '#8E8E93',
    fontWeight: '600',
    background: 'rgba(142, 142, 147, 0.2)',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  usersList: {
    padding: '12px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  userItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'rgba(0, 122, 255, 0.2)',
    color: '#007AFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    flexShrink: 0,
  },
  userName: {
    fontSize: '15px',
    color: '#EBEBF5',
    fontWeight: '400',
  },
  statusCard: {
    padding: '16px 20px',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusText: {
    fontSize: '15px',
    color: '#FFFFFF',
    fontWeight: '500',
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  controlsContainer: {
    background: 'rgba(28, 28, 30, 0.7)',
    backdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  controlsContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    transition: 'max-height 0.4s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.3s ease, margin 0.3s ease',
    marginBottom: '0',
  },
  controlsActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  copyButtonContainer: {
    position: 'relative',
  },
  btnSecondary: {
    padding: '10px 20px',
    fontSize: '15px',
    color: '#FFFFFF',
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  toggleBtn: {
    padding: '8px 16px',
    fontSize: '18px',
    color: '#8E8E93',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.2s ease, transform 0.2s ease',
    alignSelf: 'flex-end',
    marginTop: '-8px',
  },
  toast: {
    position: 'absolute',
    bottom: 'calc(100% + 8px)',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '8px 16px',
    background: '#007AFF',
    color: '#FFFFFF',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 16px rgba(0, 122, 255, 0.3)',
    animation: 'fadeIn 0.2s ease-out',
  },
  tip: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px 20px',
    background: 'rgba(28, 28, 30, 0.5)',
    backdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  tipIcon: {
    flexShrink: 0,
    marginTop: '2px',
  },
  tipText: {
    fontSize: '14px',
    color: '#AEAEB2',
    lineHeight: '1.5',
  },
};

export default Room;
