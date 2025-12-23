import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

const IframePlayer = forwardRef(({ src, onPlay, onPause, onProgress, onReady }, ref) => {
  const iframeRef = useRef(null);
  const lastTimeRef = useRef(0);
  const playerReadyRef = useRef(false);

  useEffect(() => {
    const handleMessage = (event) => {
      const trustedDomains = ['obrut.show', 'short.gy', 'cdnmovies.net', 'vibix.me'];
      const isTrusted = trustedDomains.some(domain => event.origin.includes(domain));
      
      if (!isTrusted) return;

      const data = event.data;
      
      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          handlePlayerEvent(parsed);
        } catch (e) {
          return;
        }
      } else if (typeof data === 'object') {
        handlePlayerEvent(data);
      }
    };

    const handlePlayerEvent = (data) => {
      console.log('IframePlayer event:', data);

      switch (data.event) {
        case 'ready':
          console.log('Player ready');
          playerReadyRef.current = true;
          if (onReady) onReady();
          break;
        
        case 'play':
          console.log('Play event');
          if (onPlay) onPlay();
          break;
        
        case 'pause':
          console.log('Pause event');
          if (onPause) onPause();
          break;
        
        case 'timeupdate':
          if (data.seconds !== undefined) {
            const currentTime = parseFloat(data.seconds);
            if (Math.abs(currentTime - lastTimeRef.current) > 1) {
              console.log('Time update:', currentTime);
              lastTimeRef.current = currentTime;
              if (onProgress) onProgress(currentTime);
            }
          }
          break;
        
        case 'seeked':
          if (data.seconds !== undefined) {
            console.log('Seeked to:', data.seconds);
            lastTimeRef.current = parseFloat(data.seconds);
            if (onProgress) onProgress(parseFloat(data.seconds));
          }
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    const timer = setTimeout(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        console.log('Initializing Player.js');
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ method: 'addEventListener', value: 'ready' }),
          '*'
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ method: 'addEventListener', value: 'play' }),
          '*'
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ method: 'addEventListener', value: 'pause' }),
          '*'
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ method: 'addEventListener', value: 'timeupdate' }),
          '*'
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ method: 'addEventListener', value: 'seeked' }),
          '*'
        );
      }
    }, 1000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timer);
    };
  }, [src]);

  const sendCommand = (method, value) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const message = value !== undefined
        ? JSON.stringify({ method, value })
        : JSON.stringify({ method });

      console.log('Sending command:', message);
      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  };

  useImperativeHandle(ref, () => ({
    play: () => sendCommand('play'),
    pause: () => sendCommand('pause'),
    seekTo: (time) => sendCommand('setCurrentTime', time),
    getCurrentTime: () => lastTimeRef.current
  }));

  return (
    <iframe
      ref={iframeRef}
      src={src}
      width="100%"
      height="600px"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      style={{ display: 'block' }}
    />
  );
});

export default IframePlayer;
