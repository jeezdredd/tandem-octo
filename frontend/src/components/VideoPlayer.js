import React, { useRef, useEffect, useState } from 'react';
import wsService from '../services/websocket';
import YouTubePlayer from './YouTubePlayer';
import IframePlayer from './IframePlayer';
import ObutPlayer from './ObutPlayer';

function VideoPlayer({ roomId, videoUrl, videoTitle, onClearVideo, initialRoomState }) {
  const ytPlayerRef = useRef(null);
  const videoRef = useRef(null);
  const iframePlayerRef = useRef(null);
  const isSyncingRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const lastTimeRef = useRef(0);
  const pendingRoomStateRef = useRef(null);
  const initialRoomStateAppliedRef = useRef(false);

  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const isObutSource = (url) => {
    if (!url) return false;
    const obutDomains = ['obrut.show', 'wparty'];
    return obutDomains.some(domain => url.includes(domain));
  };

  const isIframeEmbed = (url) => {
    if (!url) return false;
    const embedDomains = [
      'short.gy',
      'cdnmovies.net',
      'vibix.me',
      'kodik',
      'videocdn',
      'bazon',
      'collaps',
      '2embed',
      'vidsrc',
      'kinobox',
      'hdvb',
      'alloha'
    ];
    return embedDomains.some(domain => url.includes(domain));
  };

  const youtubeId = getYouTubeId(videoUrl);
  const isDirectVideo = videoUrl && (videoUrl.includes('.mp4') || videoUrl.includes('.webm') || videoUrl.includes('.ogg'));
  const isObut = isObutSource(videoUrl);
  const isEmbed = isIframeEmbed(videoUrl);

  const videoType = youtubeId ? 'YouTube' : (isDirectVideo ? 'HTML5' : (isObut ? 'Obut Player' : (isEmbed ? 'Embed Player' : 'Unknown')));


  useEffect(() => {
    console.log('VideoPlayer: videoUrl changed, resetting player refs');
    ytPlayerRef.current = null;
    videoRef.current = null;
    iframePlayerRef.current = null;
    isSyncingRef.current = false;
    lastTimeRef.current = 0;
    pendingRoomStateRef.current = null;
    initialRoomStateAppliedRef.current = false;
    setIsPlaying(false);
    setCurrentTime(0);
  }, [videoUrl]);

  useEffect(() => {
    if (initialRoomState && videoUrl && !initialRoomStateAppliedRef.current) {
      console.log('VideoPlayer: Storing initial room state from prop:', initialRoomState);
      pendingRoomStateRef.current = initialRoomState;
      initialRoomStateAppliedRef.current = false;
    }
  }, [initialRoomState, videoUrl]);

  useEffect(() => {
    if (isDirectVideo && videoRef.current && pendingRoomStateRef.current && !initialRoomStateAppliedRef.current) {
      console.log('Applying pending room state to HTML5 video:', pendingRoomStateRef.current);
      const data = pendingRoomStateRef.current;
      pendingRoomStateRef.current = null;
      initialRoomStateAppliedRef.current = true;

      isSyncingRef.current = true;

      const applyState = () => {
        if (data.current_time !== undefined) {
          videoRef.current.currentTime = data.current_time;
          setCurrentTime(data.current_time);
          lastTimeRef.current = data.current_time;
        }
        if (data.is_playing !== undefined) {
          setIsPlaying(data.is_playing);
          if (data.is_playing) {
            videoRef.current.play().catch(err => console.log('Autoplay prevented:', err));
          } else {
            videoRef.current.pause();
          }
        }
        setTimeout(() => { isSyncingRef.current = false; }, 1000);
      };

      if (videoRef.current.readyState >= 2) {
        applyState();
      } else {
        const handleCanPlay = () => {
          applyState();
          videoRef.current.removeEventListener('canplay', handleCanPlay);
        };
        videoRef.current.addEventListener('canplay', handleCanPlay);
      }
    }
  }, [isDirectVideo]);

  useEffect(() => {
    const handleWSPlay = (data) => {
      console.log('WebSocket: received play event', data);

      isSyncingRef.current = true;
      setIsPlaying(true);
      const time = data.current_time;

      if (youtubeId && ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
        console.log('Calling YouTube player.seekTo and playVideo');
        try {
          ytPlayerRef.current.seekTo(time, true);
          ytPlayerRef.current.playVideo();
          console.log('YouTube play command sent successfully');
        } catch (e) {
          console.error('Error controlling YouTube player:', e);
        }
      } else if ((isObut || isEmbed) && iframePlayerRef.current) {
        console.log('Controlling Obut/Iframe player');
        if (iframePlayerRef.current.seekTo) iframePlayerRef.current.seekTo(time);
        if (iframePlayerRef.current.play) iframePlayerRef.current.play();
      } else if (isDirectVideo && videoRef.current) {
        console.log('Controlling HTML5 video');
        videoRef.current.currentTime = time;
        videoRef.current.play();
      } else {
        console.log('WARNING: No player available!');
      }

      setTimeout(() => { isSyncingRef.current = false; }, 1000);
    };

    const handleWSPause = (data) => {
      console.log('WebSocket: received pause event', data);

      isSyncingRef.current = true;
      setIsPlaying(false);
      const time = data.current_time;

      if (youtubeId && ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        ytPlayerRef.current.seekTo(time, true);
        ytPlayerRef.current.pauseVideo();
      } else if ((isObut || isEmbed) && iframePlayerRef.current) {
        console.log('Controlling Obut/Iframe player pause');
        if (iframePlayerRef.current.seekTo) iframePlayerRef.current.seekTo(time);
        if (iframePlayerRef.current.pause) iframePlayerRef.current.pause();
      } else if (isDirectVideo && videoRef.current) {
        videoRef.current.currentTime = time;
        videoRef.current.pause();
      }

      setTimeout(() => { isSyncingRef.current = false; }, 1000);
    };

    const handleWSSeek = (data) => {
      console.log('WebSocket: received seek event', data);

      isSyncingRef.current = true;
      const time = data.current_time;

      if (youtubeId && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        ytPlayerRef.current.seekTo(time, true);
      } else if ((isObut || isEmbed) && iframePlayerRef.current && iframePlayerRef.current.seekTo) {
        console.log('Controlling Obut/Iframe player seek');
        iframePlayerRef.current.seekTo(time);
      } else if (isDirectVideo && videoRef.current) {
        videoRef.current.currentTime = time;
      }

      setTimeout(() => { isSyncingRef.current = false; }, 1000);
    };

    const handleRoomState = (data) => {
      console.log('VideoPlayer: received room_state', data);

      isSyncingRef.current = true;

      if (data.current_time !== undefined) {
        setCurrentTime(data.current_time);
        lastTimeRef.current = data.current_time;
      }

      if (data.is_playing !== undefined) {
        setIsPlaying(data.is_playing);

        if (youtubeId && ytPlayerRef.current) {
          if (data.current_time !== undefined) {
            ytPlayerRef.current.seekTo(data.current_time, true);
          }
          if (data.is_playing) {
            ytPlayerRef.current.playVideo();
          } else {
            ytPlayerRef.current.pauseVideo();
          }
        } else if ((isObut || isEmbed) && iframePlayerRef.current) {
          console.log('Controlling Obut/Iframe player from room_state');
          if (data.current_time !== undefined && iframePlayerRef.current.seekTo) {
            iframePlayerRef.current.seekTo(data.current_time);
          }
          if (data.is_playing && iframePlayerRef.current.play) {
            iframePlayerRef.current.play();
          } else if (!data.is_playing && iframePlayerRef.current.pause) {
            iframePlayerRef.current.pause();
          }
        } else if (isDirectVideo && videoRef.current) {
          if (data.current_time !== undefined) {
            videoRef.current.currentTime = data.current_time;
          }
          if (data.is_playing) {
            videoRef.current.play();
          } else {
            videoRef.current.pause();
          }
        } else if (youtubeId || isObut || isEmbed) {
          // Player not ready yet, save state for later
          console.log('VideoPlayer: Player not ready, saving room_state for later');
          pendingRoomStateRef.current = data;
        }
      }

      setTimeout(() => { isSyncingRef.current = false; }, 1000);
    };

    wsService.on('play', handleWSPlay);
    wsService.on('pause', handleWSPause);
    wsService.on('seek', handleWSSeek);
    wsService.on('room_state', handleRoomState);

    return () => {
      wsService.off('play', handleWSPlay);
      wsService.off('pause', handleWSPause);
      wsService.off('seek', handleWSSeek);
      wsService.off('room_state', handleRoomState);
    };
  }, [youtubeId, isDirectVideo, isObut, isEmbed]);

  const handleProgress = (time) => {
    if (!isSyncingRef.current) {
      const timeDiff = Math.abs(time - lastTimeRef.current);
      const isForwardProgress = time > lastTimeRef.current && timeDiff <= 2;

      if (timeDiff > 1 && !isForwardProgress) {
        console.log('Seek detected! Sending seek event');
        wsService.sendSeek(time, isPlaying);
      }
    }
    lastTimeRef.current = time;
    setCurrentTime(time);
  };

  const getCurrentPlayerTime = () => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
      const playerTime = ytPlayerRef.current.getCurrentTime();
      if (playerTime === 0 && lastTimeRef.current > 0) {
        return lastTimeRef.current;
      }
      return playerTime;
    } else if (iframePlayerRef.current && typeof iframePlayerRef.current.getCurrentTime === 'function') {
      return iframePlayerRef.current.getCurrentTime();
    } else if (videoRef.current) {
      const playerTime = videoRef.current.currentTime;
      if (playerTime === 0 && lastTimeRef.current > 0) {
        return lastTimeRef.current;
      }
      return playerTime;
    }
    return lastTimeRef.current || currentTime;
  };

  const handlePlay = () => {
    console.log('Player: onPlay fired, isSyncing=', isSyncingRef.current);
    if (!isSyncingRef.current) {
      const time = getCurrentPlayerTime();
      console.log('User play action, sending to WebSocket, time=', time);
      setIsPlaying(true);
      wsService.sendPlay(time);
    } else {
      console.log('Skipping play event - currently syncing');
    }
  };

  const handlePause = () => {
    console.log('Player: onPause fired, isSyncing=', isSyncingRef.current);
    if (!isSyncingRef.current) {
      const time = getCurrentPlayerTime();
      console.log('User pause action, sending to WebSocket, time=', time);
      setIsPlaying(false);
      wsService.sendPause(time);
    } else {
      console.log('Skipping pause event - currently syncing');
    }
  };

  const handleYTReady = (player) => {
    console.log('YouTube player ready, setting ytPlayerRef.current');
    ytPlayerRef.current = player;
    console.log('ytPlayerRef.current is now:', ytPlayerRef.current);

    // Apply pending room state if player wasn't ready when room_state arrived
    if (pendingRoomStateRef.current) {
      console.log('Applying pending room state to YouTube player:', pendingRoomStateRef.current);
      const data = pendingRoomStateRef.current;
      pendingRoomStateRef.current = null;
      initialRoomStateAppliedRef.current = true;

      isSyncingRef.current = true;
      if (data.current_time !== undefined) {
        player.seekTo(data.current_time, true);
        setCurrentTime(data.current_time);
        lastTimeRef.current = data.current_time;
      }
      if (data.is_playing !== undefined) {
        setIsPlaying(data.is_playing);
        if (data.is_playing) {
          player.playVideo();
        } else {
          player.pauseVideo();
        }
      }
      setTimeout(() => { isSyncingRef.current = false; }, 1000);
    }
  };

  const handleIframeReady = () => {
    console.log('Iframe/Obut player ready');

    if (pendingRoomStateRef.current && iframePlayerRef.current) {
      console.log('Applying pending room state to iframe player:', pendingRoomStateRef.current);
      const data = pendingRoomStateRef.current;
      pendingRoomStateRef.current = null;
      initialRoomStateAppliedRef.current = true;

      isSyncingRef.current = true;
      if (data.current_time !== undefined) {
        if (iframePlayerRef.current.seekTo) {
          iframePlayerRef.current.seekTo(data.current_time);
        }
        setCurrentTime(data.current_time);
        lastTimeRef.current = data.current_time;
      }
      if (data.is_playing !== undefined) {
        setIsPlaying(data.is_playing);
        if (data.is_playing && iframePlayerRef.current.play) {
          iframePlayerRef.current.play();
        } else if (!data.is_playing && iframePlayerRef.current.pause) {
          iframePlayerRef.current.pause();
        }
      }
      setTimeout(() => { isSyncingRef.current = false; }, 1000);
    }
  };

  if (!videoUrl) {
    return (
      <div style={styles.placeholder}>
        <p>Видео не выбрано</p>
        <p style={styles.hint}>Введите название фильма для поиска или вставьте ссылку</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div>
        {videoTitle && (
          <div style={styles.videoHeader}>
            <div style={styles.videoInfo}>
              <div style={styles.videoTitle}>{videoTitle}</div>
              <div style={styles.videoSource}>
                <span style={styles.sourceBadge}>{videoType}</span>
                <span style={styles.timeBadge}>⏱ {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')}</span>
              </div>
            </div>
            <button onClick={onClearVideo} style={styles.clearButton} title="Убрать видео">
              ✕
            </button>
          </div>
        )}
        <div style={{ background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
          {isObut ? (
            <ObutPlayer
              ref={iframePlayerRef}
              src={videoUrl}
              onReady={handleIframeReady}
              onPlay={handlePlay}
              onPause={handlePause}
              onProgress={handleProgress}
            />
          ) : isEmbed ? (
            <IframePlayer
              ref={iframePlayerRef}
              src={videoUrl}
              onReady={handleIframeReady}
              onPlay={handlePlay}
              onPause={handlePause}
              onProgress={handleProgress}
            />
          ) : isDirectVideo ? (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              width="100%"
              height="600px"
              style={{ display: 'block' }}
              onPlay={handlePlay}
              onPause={handlePause}
              onTimeUpdate={(e) => handleProgress(e.target.currentTime)}
            />
          ) : youtubeId ? (
            <YouTubePlayer
              videoId={youtubeId}
              onReady={handleYTReady}
              onPlay={handlePlay}
              onPause={handlePause}
              onProgress={handleProgress}
            />
          ) : (
            <div style={styles.placeholder}>
              <p>Неподдерживаемый формат видео</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  videoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    background: '#1a1a1a',
    borderRadius: '8px 8px 0 0',
    marginBottom: '-8px',
    position: 'relative',
    zIndex: 1,
  },
  videoInfo: {
    flex: 1,
    minWidth: 0,
  },
  videoTitle: {
    color: 'white',
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  videoSource: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  sourceBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    background: '#667eea',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    borderRadius: '12px',
  },
  timeBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    background: '#2a2a2a',
    color: '#ccc',
    fontSize: '12px',
    borderRadius: '12px',
  },
  clearButton: {
    background: '#f44336',
    border: 'none',
    color: 'white',
    fontSize: '20px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: '15px',
    transition: 'background 0.2s',
  },
  placeholder: {
    width: '100%',
    height: '500px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1a1a1a',
    borderRadius: '8px',
    color: 'white',
  },
  hint: {
    color: '#888',
    marginTop: '10px',
  },
};

export default VideoPlayer;
