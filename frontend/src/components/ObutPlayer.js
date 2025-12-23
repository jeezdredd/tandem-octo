import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

const ObutPlayer = forwardRef(({ src, onPlay, onPause, onProgress, onReady }, ref) => {
  const iframeRef = useRef(null);
  const lastTimeRef = useRef(0);
  const playerReadyRef = useRef(false);
  const lastPlayEventRef = useRef(0);
  const lastPauseEventRef = useRef(0);

  useEffect(() => {
    const handleMessage = (event) => {
      const trustedDomains = ['obrut.show', 'wparty.space', 'hdvb.to', 'kinobox.tv'];
      const isTrusted = trustedDomains.some(domain => event.origin.includes(domain));

      if (!isTrusted) return;

      const data = event.data;
      console.log('ObutPlayer RAW message from iframe:', event.origin, data);

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
      console.log('ObutPlayer event:', data);

      switch (data.event) {
        case 'ready':
        case 'inited':
          console.log('Obut Player ready');
          playerReadyRef.current = true;
          if (onReady) onReady();
          break;

        case 'play':
        case 'resumed':
          console.log('Obut Play event, time:', data.time);
          if (data.time !== undefined) {
            lastTimeRef.current = parseFloat(data.time);
          }
          const nowPlay = Date.now();
          if (nowPlay - lastPlayEventRef.current > 300) {
            lastPlayEventRef.current = nowPlay;
            if (onPlay) onPlay();
          } else {
            console.log('Skipping duplicate play event');
          }
          break;

        case 'pause':
        case 'paused':
          console.log('Obut Pause event, time:', data.time);
          if (data.time !== undefined) {
            lastTimeRef.current = parseFloat(data.time);
          }
          const nowPause = Date.now();
          if (nowPause - lastPauseEventRef.current > 300) {
            lastPauseEventRef.current = nowPause;
            if (onPause) onPause();
          } else {
            console.log('Skipping duplicate pause event');
          }
          break;

        case 'time':
          if (data.time !== undefined) {
            const currentTime = parseFloat(data.time);
            if (Math.abs(currentTime - lastTimeRef.current) > 1) {
              console.log('Obut Time update:', currentTime);
              lastTimeRef.current = currentTime;
              if (onProgress) onProgress(currentTime);
            }
          }
          break;

        case 'seek':
        case 'rewound':
        case 'forwarded':
          if (data.time !== undefined) {
            const seekTime = parseFloat(data.time);
            console.log('Obut Seeked to:', seekTime);
            lastTimeRef.current = seekTime;
            if (onProgress) onProgress(seekTime);
          }
          break;

        case 'duration':
          console.log('Obut Video duration:', data.duration);
          break;

        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    const timer = setTimeout(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        console.log('Initializing Obut Player API');
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
          JSON.stringify({ method: 'addEventListener', value: 'time' }),
          '*'
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ method: 'addEventListener', value: 'seek' }),
          '*'
        );
      }
    }, 1000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timer);
    };
  }, [src]);

  useImperativeHandle(ref, () => ({
    play: () => {
      console.log('ObutPlayer: play() called');
      if (iframeRef.current && iframeRef.current.contentWindow) {
        console.log('Sending {api: "play"} to iframe');
        iframeRef.current.contentWindow.postMessage({api: 'play'}, '*');
      }
    },
    pause: () => {
      console.log('ObutPlayer: pause() called');
      if (iframeRef.current && iframeRef.current.contentWindow) {
        console.log('Sending {api: "pause"} to iframe');
        iframeRef.current.contentWindow.postMessage({api: 'pause'}, '*');
      }
    },
    seekTo: (time) => {
      console.log('ObutPlayer: seekTo() called, time:', time);
      if (iframeRef.current && iframeRef.current.contentWindow) {
        console.log('Sending {api: "seek", time:', time, '} to iframe');
        iframeRef.current.contentWindow.postMessage({api: 'seek', time: time}, '*');
      }
    },
    getCurrentTime: () => {
      console.log('ObutPlayer: getCurrentTime() called, returning:', lastTimeRef.current);
      return lastTimeRef.current;
    }
  }));

  return (
    <iframe
      ref={iframeRef}
      src={src}
      width="100%"
      height="600px"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      style={{ display: 'block', border: 0 }}
    />
  );
});

export default ObutPlayer;
