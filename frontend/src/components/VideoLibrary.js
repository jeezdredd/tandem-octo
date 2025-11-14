import React, { useState, useEffect } from 'react';
import { videoAPI } from '../services/api';

function VideoLibrary({ onSelectVideo }) {
  const [videos, setVideos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  useEffect(() => {
    if (showLibrary) {
      loadVideos();
    }
  }, [showLibrary, searchTerm]);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const response = await videoAPI.getVideos(searchTerm);
      setVideos(response.data.results || response.data);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVideo = (video) => {
    if (video.source_url) {
      onSelectVideo(video.source_url, video.title);
      setShowLibrary(false);
    }
  };

  if (!showLibrary) {
    return (
      <button onClick={() => setShowLibrary(true)} style={styles.toggleButton}>
        Выбрать из библиотеки
      </button>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Библиотека видео</h3>
        <button onClick={() => setShowLibrary(false)} style={styles.closeButton}>
          ✕
        </button>
      </div>

      <input
        type="text"
        placeholder="Поиск по названию..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={styles.searchInput}
      />

      {loading ? (
        <div style={styles.loading}>Загрузка...</div>
      ) : (
        <div style={styles.videoList}>
          {videos.length === 0 ? (
            <p style={styles.empty}>Видео не найдены</p>
          ) : (
            videos.map((video) => (
              <div
                key={video.id}
                style={styles.videoCard}
                onClick={() => handleSelectVideo(video)}
              >
                {video.thumbnail && (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    style={styles.thumbnail}
                  />
                )}
                <div style={styles.videoInfo}>
                  <h4 style={styles.videoTitle}>{video.title}</h4>
                  {video.year && <span style={styles.year}>{video.year}</span>}
                  {video.rating && (
                    <span style={styles.rating}>⭐ {video.rating}</span>
                  )}
                  {video.description && (
                    <p style={styles.description}>{video.description}</p>
                  )}
                  <span style={styles.sourceType}>{video.source_type}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  toggleButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'white',
    background: '#4CAF50',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  container: {
    background: '#1a1a1a',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  title: {
    margin: 0,
    color: 'white',
    fontSize: '20px',
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0',
  },
  searchInput: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    borderRadius: '6px',
    border: 'none',
    marginBottom: '15px',
    boxSizing: 'border-box',
  },
  loading: {
    textAlign: 'center',
    color: '#888',
    padding: '20px',
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    padding: '20px',
  },
  videoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  videoCard: {
    display: 'flex',
    gap: '15px',
    background: '#2a2a2a',
    padding: '15px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  thumbnail: {
    width: '120px',
    height: '90px',
    objectFit: 'cover',
    borderRadius: '4px',
  },
  videoInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  videoTitle: {
    margin: 0,
    color: 'white',
    fontSize: '16px',
  },
  year: {
    color: '#888',
    fontSize: '14px',
  },
  rating: {
    color: '#FFD700',
    fontSize: '14px',
  },
  description: {
    margin: 0,
    color: '#ccc',
    fontSize: '13px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  sourceType: {
    color: '#667eea',
    fontSize: '12px',
    textTransform: 'uppercase',
  },
};

export default VideoLibrary;
