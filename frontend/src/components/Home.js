import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomAPI } from '../services/api';

function Home() {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      alert('Please enter your username');
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
      alert('Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      alert('Please enter your username');
      return;
    }
    if (!roomId.trim()) {
      alert('Please enter room ID');
      return;
    }

    navigate(`/room/${roomId}?username=${username}`);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🎬 Tandem</h1>
        <p style={styles.subtitle}>Watch videos together in real-time</p>
      </div>

      <div style={styles.content}>
        <div style={styles.usernameSection}>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.actionsContainer}>
          <div style={styles.actionCard}>
            <h2 style={styles.actionTitle}>Create Room</h2>
            <p style={styles.actionDescription}>
              Start a new room and invite friends to watch together
            </p>
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              style={styles.button}
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>

          <div style={styles.divider}>OR</div>

          <div style={styles.actionCard}>
            <h2 style={styles.actionTitle}>Join Room</h2>
            <p style={styles.actionDescription}>
              Enter a room ID to join an existing session
            </p>
            <input
              type="text"
              placeholder="Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              style={styles.input}
            />
            <button
              onClick={handleJoinRoom}
              style={styles.button}
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center',
    color: 'white',
    marginBottom: '40px',
  },
  title: {
    fontSize: '48px',
    margin: '0 0 10px 0',
  },
  subtitle: {
    fontSize: '18px',
    opacity: 0.9,
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
    padding: '15px',
    fontSize: '16px',
    borderRadius: '8px',
    border: 'none',
    boxSizing: 'border-box',
  },
  actionsContainer: {
    display: 'flex',
    gap: '30px',
    alignItems: 'center',
  },
  actionCard: {
    flex: 1,
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  actionTitle: {
    margin: '0 0 10px 0',
    fontSize: '24px',
  },
  actionDescription: {
    color: '#666',
    marginBottom: '20px',
  },
  button: {
    width: '100%',
    padding: '15px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    background: '#667eea',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '10px',
  },
  divider: {
    color: 'white',
    fontSize: '20px',
    fontWeight: 'bold',
  },
};

export default Home;
