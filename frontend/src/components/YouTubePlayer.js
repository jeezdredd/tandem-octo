import React, { useEffect, useRef } from 'react';

function YouTubePlayer({ videoId, onReady, onPlay, onPause, onProgress }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const progressIntervalRef = useRef(null);

  useEffect(() => {
    const loadYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        console.log('YouTube API already loaded, initializing player');
        initPlayer();
      } else if (!window.YT_loading) {
        console.log('Loading YouTube IFrame API');
        window.YT_loading = true;
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        const originalCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          console.log('YouTube IFrame API loaded');
          window.YT_loading = false;
          if (originalCallback) originalCallback();
          initPlayer();
        };
      } else {
        console.log('YouTube API is loading, waiting...');
        const checkInterval = setInterval(() => {
          if (window.YT && window.YT.Player) {
            console.log('YouTube API now available');
            clearInterval(checkInterval);
            initPlayer();
          }
        }, 100);

        setTimeout(() => clearInterval(checkInterval), 10000);
      }
    };

    loadYouTubeAPI();

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error('Error destroying player:', e);
        }
      }
    };
  }, [videoId]);

  const initPlayer = () => {
    if (!containerRef.current || !videoId) return;

    if (playerRef.current) {
      playerRef.current.destroy();
    }

    playerRef.current = new window.YT.Player(containerRef.current, {
      height: '600',
      width: '100%',
      videoId: videoId,
      playerVars: {
        controls: 1,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: handleReady,
        onStateChange: handleStateChange,
      },
    });
  };

  const handleReady = (event) => {
    console.log('YouTube player ready');
    if (onReady) {
      onReady(playerRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const time = playerRef.current.getCurrentTime();
        if (onProgress) {
          onProgress(time);
        }
      }
    }, 100);
  };

  const handleStateChange = (event) => {
    console.log('YouTube state change:', event.data);

    if (event.data === window.YT.PlayerState.PLAYING) {
      console.log('YouTube: playing');
      if (onPlay) {
        onPlay();
      }
    } else if (event.data === window.YT.PlayerState.PAUSED) {
      console.log('YouTube: paused');
      if (onPause) {
        onPause();
      }
    }
  };

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '600px', background: '#000', borderRadius: '8px' }}
    />
  );
}

export default YouTubePlayer;
