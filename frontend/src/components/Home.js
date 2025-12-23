import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomAPI } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageSwitch from './LanguageSwitch';

function Home() {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showReturnPopup, setShowReturnPopup] = useState(false);
  const [lastRoom, setLastRoom] = useState(null);

  useEffect(() => {
    // Проверяем есть ли сохраненная комната
    const savedRoom = localStorage.getItem('tandem_last_room');
    if (savedRoom) {
      try {
        const roomData = JSON.parse(savedRoom);
        // Показываем popup только если комната была покинута недавно (в течение часа)
        const hourAgo = Date.now() - 60 * 60 * 1000;
        if (roomData.timestamp > hourAgo) {
          setLastRoom(roomData);
          setShowReturnPopup(true);
        } else {
          // Удаляем старую информацию
          localStorage.removeItem('tandem_last_room');
        }
      } catch (e) {
        console.error('Error parsing saved room:', e);
      }
    }
  }, []);

  const returnToRoom = () => {
    if (lastRoom) {
      navigate(`/room/${lastRoom.roomId}?username=${lastRoom.username}`);
      setShowReturnPopup(false);
    }
  };

  const dismissPopup = () => {
    setShowReturnPopup(false);
    localStorage.removeItem('tandem_last_room');
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      alert(t('home.enterUsername'));
      return;
    }

    setLoading(true);
    try {
      const response = await roomAPI.createRoom({
        host_username: username,
        host_control: false,
      });

      const newRoomId = response.data.id;
      navigate(`/room/${newRoomId}?username=${username}`);
    } catch (error) {
      console.error('Error creating room:', error);
      alert(t('home.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      alert(t('home.enterUsername'));
      return;
    }
    if (!roomId.trim()) {
      alert(t('home.enterRoomId'));
      return;
    }

    navigate(`/room/${roomId}?username=${username}`);
  };

  return (
    <div style={styles.container}>
      {/* Animated Aurora Background */}
      <div style={styles.auroraBackground}></div>

      {/* Language Switch */}
      <div style={styles.languageSwitch}>
        <LanguageSwitch />
      </div>

      {/* Content */}
      <div style={styles.contentWrapper}>
        <div style={styles.header}>
          <h1 style={styles.title}>🎬 {t('home.title')}</h1>
          <p style={styles.subtitle}>{t('home.subtitle')}</p>
        </div>

        <div style={styles.content}>
          <div style={styles.usernameSection}>
            <input
              type="text"
              placeholder={t('home.usernamePlaceholder')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.actionsContainer}>
            <div style={styles.actionCard}>
              <h2 style={styles.actionTitle}>{t('home.createRoom')}</h2>
              <p style={styles.actionDescription}>
                {t('home.createRoomDescription')}
              </p>
              <button
                onClick={handleCreateRoom}
                disabled={loading}
                style={styles.button}
              >
                {loading ? t('home.creating') : t('home.createRoom')}
              </button>
            </div>

            <div style={styles.divider}>{t('home.or')}</div>

            <div style={styles.actionCard}>
              <h2 style={styles.actionTitle}>{t('home.joinRoom')}</h2>
              <p style={styles.actionDescription}>
                {t('home.joinRoomDescription')}
              </p>
              <input
                type="text"
                placeholder={t('home.roomIdPlaceholder')}
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                style={styles.input}
              />
              <button
                onClick={handleJoinRoom}
                style={styles.button}
              >
                {t('home.joinRoom')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Return to Room Popup */}
      {showReturnPopup && lastRoom && (
        <div style={styles.returnPopup}>
          <div style={styles.popupContent}>
            <button onClick={dismissPopup} style={styles.popupClose}>✕</button>
            <div style={styles.popupIcon}>🎬</div>
            <h3 style={styles.popupTitle}>{t('home.returnToRoom')}</h3>
            <p style={styles.popupText}>{t('home.leftRecently')}</p>
            <p style={styles.popupRoomId}>{t('home.roomId')} {lastRoom.roomId}</p>
            <div style={styles.popupButtons}>
              <button onClick={returnToRoom} style={styles.popupButtonPrimary}>
                {t('home.returnButton')}
              </button>
              <button onClick={dismissPopup} style={styles.popupButtonSecondary}>
                {t('home.stayButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inject keyframe animations */}
      <style>{keyframes}</style>
    </div>
  );
}

const keyframes = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes auroraFlow {
    0% {
      background-position: 0% 50%, 50% 0%, 100% 50%, 50% 100%, 50% 50%, 30% 70%, 70% 30%;
      background-size: 300% 300%, 250% 250%, 300% 300%, 250% 250%, 280% 280%, 260% 260%, 240% 240%;
    }
    20% {
      background-position: 25% 25%, 60% 20%, 80% 60%, 40% 80%, 60% 40%, 40% 60%, 80% 40%;
      background-size: 320% 320%, 270% 270%, 280% 280%, 270% 270%, 300% 300%, 280% 280%, 260% 260%;
    }
    40% {
      background-position: 50% 25%, 75% 50%, 50% 75%, 25% 50%, 70% 30%, 50% 50%, 90% 50%;
      background-size: 350% 350%, 300% 300%, 250% 250%, 300% 300%, 320% 320%, 300% 300%, 280% 280%;
    }
    60% {
      background-position: 75% 50%, 90% 80%, 30% 90%, 20% 30%, 80% 20%, 60% 40%, 50% 70%;
      background-size: 330% 330%, 280% 280%, 320% 320%, 280% 280%, 300% 300%, 280% 280%, 260% 260%;
    }
    80% {
      background-position: 100% 50%, 100% 100%, 0% 50%, 0% 0%, 40% 60%, 70% 30%, 30% 90%;
      background-size: 300% 300%, 250% 250%, 300% 300%, 250% 250%, 280% 280%, 260% 260%, 240% 240%;
    }
    100% {
      background-position: 0% 50%, 50% 0%, 100% 50%, 50% 100%, 50% 50%, 30% 70%, 70% 30%;
      background-size: 300% 300%, 250% 250%, 300% 300%, 250% 250%, 280% 280%, 260% 260%, 240% 240%;
    }
  }
`;

const styles = {
  container: {
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px',
  },

  languageSwitch: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    zIndex: 100,
  },

  auroraBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(ellipse at top left, rgba(139, 92, 246, 0.6), transparent 50%),
      radial-gradient(ellipse at top right, rgba(236, 72, 153, 0.5), transparent 50%),
      radial-gradient(ellipse at bottom right, rgba(59, 130, 246, 0.6), transparent 50%),
      radial-gradient(ellipse at bottom left, rgba(168, 85, 247, 0.5), transparent 50%),
      radial-gradient(ellipse at center, rgba(6, 182, 212, 0.4), transparent 60%),
      radial-gradient(ellipse at 30% 70%, rgba(251, 146, 60, 0.35), transparent 50%),
      radial-gradient(ellipse at 70% 30%, rgba(236, 252, 203, 0.2), transparent 50%),
      linear-gradient(135deg,
        #1e1b4b 0%,
        #312e81 15%,
        #4c1d95 30%,
        #581c87 45%,
        #3b0764 60%,
        #1e3a8a 75%,
        #1e1b4b 100%
      )
    `,
    backgroundSize: '300% 300%, 250% 250%, 300% 300%, 250% 250%, 280% 280%, 260% 260%, 240% 240%, 100% 100%',
    animation: 'auroraFlow 20s ease-in-out infinite',
    zIndex: 1,
  },

  contentWrapper: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },

  header: {
    textAlign: 'center',
    color: 'white',
    marginBottom: '40px',
    textShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },

  title: {
    fontSize: '56px',
    margin: '0 0 10px 0',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #ddd6fe 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '0.5px',
  },

  subtitle: {
    fontSize: '18px',
    opacity: 0.95,
    color: '#e0e7ff',
    fontWeight: '400',
  },

  content: {
    maxWidth: '800px',
    width: '100%',
  },

  usernameSection: {
    marginBottom: '30px',
  },

  input: {
    width: '100%',
    padding: '16px 20px',
    fontSize: '16px',
    borderRadius: '12px',
    border: 'none',
    boxSizing: 'border-box',
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
    transition: 'all 0.3s ease',
    outline: 'none',
  },

  actionsContainer: {
    display: 'flex',
    gap: '30px',
    alignItems: 'center',
  },

  actionCard: {
    flex: 1,
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    padding: '32px',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.3s ease',
  },

  actionTitle: {
    margin: '0 0 12px 0',
    fontSize: '24px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },

  actionDescription: {
    color: '#64748b',
    marginBottom: '20px',
    fontSize: '15px',
    lineHeight: '1.6',
  },

  button: {
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
    backgroundSize: '200% 100%',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    marginTop: '10px',
    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  },

  divider: {
    color: 'white',
    fontSize: '20px',
    fontWeight: '700',
    textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    padding: '12px 20px',
    borderRadius: '50px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },

  returnPopup: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 1000,
    animation: 'slideIn 0.3s ease-out',
  },

  popupContent: {
    background: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(20px)',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    minWidth: '300px',
    position: 'relative',
  },

  popupClose: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#666',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'background 0.2s',
  },

  popupIcon: {
    fontSize: '36px',
    textAlign: 'center',
    marginBottom: '12px',
  },

  popupTitle: {
    margin: '0 0 8px 0',
    fontSize: '20px',
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },

  popupText: {
    margin: '0 0 8px 0',
    fontSize: '14px',
    color: '#666',
    textAlign: 'center',
  },

  popupRoomId: {
    margin: '0 0 20px 0',
    fontSize: '13px',
    color: '#999',
    textAlign: 'center',
    fontFamily: 'monospace',
  },

  popupButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  popupButtonPrimary: {
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },

  popupButtonSecondary: {
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
    background: '#f5f5f5',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
};

export default Home;
