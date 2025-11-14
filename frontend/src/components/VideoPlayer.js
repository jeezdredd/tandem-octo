import React, { useRef, useEffect, useState } from 'react';
import wsService from '../services/websocket';
import YouTubePlayer from './YouTubePlayer';

function VideoPlayer({ roomId, videoUrl }) {
  const ytPlayerRef = useRef(null);
  const videoRef = useRef(null);
  const isSyncingRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const lastTimeRef = useRef(0);

  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const youtubeId = getYouTubeId(videoUrl);
  const isDirectVideo = videoUrl && (videoUrl.includes('.mp4') || videoUrl.includes('.webm') || videoUrl.includes('.ogg'));
  const videoType = youtubeId ? 'YouTube' : (isDirectVideo ? 'HTML5' : 'Unknown');

  useEffect(() => {
    console.log('VideoPlayer: videoUrl changed, resetting player refs');
    ytPlayerRef.current = null;
    videoRef.current = null;
    isSyncingRef.current = false;
    lastTimeRef.current = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  }, [videoUrl]);

  useEffect(() => {
    const handleWSPlay = (data) => {
      console.log('WebSocket: received play event', data);
      console.log('Current state: youtubeId=', youtubeId, 'ytPlayerRef.current=', ytPlayerRef.current);

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
      } else if (isDirectVideo && videoRef.current) {
        console.log('Controlling HTML5 video');
        videoRef.current.currentTime = time;
        videoRef.current.play();
      } else {
        console.log('WARNING: No player available! youtubeId=', youtubeId, 'ytPlayerRef.current=', ytPlayerRef.current);
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
        } else if (isDirectVideo && videoRef.current) {
          if (data.current_time !== undefined) {
            videoRef.current.currentTime = data.current_time;
          }
          if (data.is_playing) {
            videoRef.current.play();
          } else {
            videoRef.current.pause();
          }
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
  }, [youtubeId, isDirectVideo]);

  const handleProgress = (time) => {
    if (!isSyncingRef.current) {
      const timeDiff = Math.abs(time - lastTimeRef.current);
      if (timeDiff > 1) {
        console.log('Seek detected! Sending seek event');
        wsService.sendSeek(time, isPlaying);
      }
    }
    lastTimeRef.current = time;
    setCurrentTime(time);
  };

  const getCurrentPlayerTime = () => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
      return ytPlayerRef.current.getCurrentTime();
    } else if (videoRef.current) {
      return videoRef.current.currentTime;
    }
    return currentTime;
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
  };

  if (!videoUrl) {
    return (
      <div style={styles.placeholder}>
        <p>Видео не выбрано</p>
        <p style={styles.hint}>Вставьте ссылку на YouTube или прямую ссылку на видео (.mp4, .webm)</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div>
        <p style={{color: 'white', marginBottom: '10px'}}>
          Тип: {videoType} | Время: {currentTime.toFixed(1)}с
        </p>
        <div style={{ background: '#000', borderRadius: '8px' }}>
          {isDirectVideo ? (
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
