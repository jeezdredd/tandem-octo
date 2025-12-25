import React, { useState, useEffect, useRef } from 'react';
import wsService from '../services/websocket';

function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const messagesListRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const MAX_CHARS = 1000;

  useEffect(() => {
    const handleChatHistory = (data) => {
      console.log('Chat history received:', data.messages);
      setMessages(data.messages || []);
    };

    const handleChatMessage = (data) => {
      console.log('Chat message received:', data);
      setMessages((prev) => [...prev, {
        id: data.id,
        username: data.username,
        content: data.content,
        created_at: data.created_at,
      }]);
    };

    const handleChatError = (data) => {
      console.error('Chat error:', data.error);
      setError(data.error);
      setTimeout(() => setError(''), 3000);
    };

    wsService.on('chat_history', handleChatHistory);
    wsService.on('chat_message', handleChatMessage);
    wsService.on('chat_error', handleChatError);

    return () => {
      wsService.off('chat_history', handleChatHistory);
      wsService.off('chat_message', handleChatMessage);
      wsService.off('chat_error', handleChatError);
    };
  }, []);

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  const handleScroll = () => {
    if (!messagesListRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesListRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setAutoScroll(isNearBottom);
  };

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_CHARS) {
      setError(`Сообщение слишком длинное (макс ${MAX_CHARS} символов)`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    const currentUsername = localStorage.getItem('tandem_username') || 'Guest';
    const tempMessage = {
      id: `temp_${Date.now()}`,
      username: currentUsername,
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    wsService.sendChat(trimmed);
    setInputText('');
    setAutoScroll(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getAvatarColor = (username) => {
    const colors = [
      '#007AFF', '#FF453A', '#32D74B', '#FFD60A', '#FF9F0A',
      '#BF5AF2', '#5AC8FA', '#FF375F', '#64D2FF', '#30D158',
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: hoverStyles }} />
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.headerText}>Чат</span>
          <span style={styles.badge}>{messages.length}</span>
        </div>

        <div
          ref={messagesListRef}
          onScroll={handleScroll}
          style={styles.messagesList}
        >
          {messages.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>Пока нет сообщений. Начните беседу!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} style={styles.messageItem}>
                <div
                  style={{
                    ...styles.avatar,
                    background: `${getAvatarColor(msg.username)}33`,
                    color: getAvatarColor(msg.username),
                  }}
                >
                  {msg.username.charAt(0).toUpperCase()}
                </div>
                <div style={styles.messageContent}>
                  <div style={styles.messageHeader}>
                    <span style={styles.messageUsername}>{msg.username}</span>
                    {msg.created_at && (
                      <span style={styles.messageTime}>
                        {formatTime(msg.created_at)}
                      </span>
                    )}
                  </div>
                  <div style={styles.messageText}>{msg.content}</div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.inputContainer}>
          {error && <div style={styles.errorBanner}>{error}</div>}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Введите сообщение..."
            style={styles.textarea}
            maxLength={MAX_CHARS}
            rows={2}
          />
          <div style={styles.inputFooter}>
            <span
              style={{
                ...styles.charCounter,
                color: inputText.length > MAX_CHARS * 0.9 ? '#FF453A' : '#8E8E93',
              }}
            >
              {inputText.length}/{MAX_CHARS}
            </span>
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="send-button"
              style={{
                ...styles.sendButton,
                opacity: inputText.trim() ? 1 : 0.5,
                cursor: inputText.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Отправить
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const hoverStyles = `
  .send-button:hover:not(:disabled) {
    background: #0066CC !important;
  }
  .send-button:active:not(:disabled) {
    background: #0055AA !important;
    transform: scale(0.98);
  }
`;

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'rgba(28, 28, 30, 0.7)',
    backdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(84, 84, 88, 0.3)',
  },
  headerText: {
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
  messagesList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#8E8E93',
    textAlign: 'center',
    margin: 0,
  },
  messageItem: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    flexShrink: 0,
  },
  messageContent: {
    flex: 1,
    minWidth: 0,
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '4px',
    gap: '8px',
  },
  messageUsername: {
    fontSize: '14px',
    color: '#FFFFFF',
    fontWeight: '600',
  },
  messageTime: {
    fontSize: '12px',
    color: '#8E8E93',
    flexShrink: 0,
  },
  messageText: {
    fontSize: '15px',
    color: '#EBEBF5',
    lineHeight: '1.4',
    wordWrap: 'break-word',
    whiteSpace: 'pre-wrap',
  },
  inputContainer: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(84, 84, 88, 0.3)',
    background: 'rgba(28, 28, 30, 0.5)',
  },
  errorBanner: {
    fontSize: '13px',
    color: '#FF453A',
    background: 'rgba(255, 69, 58, 0.1)',
    padding: '8px 12px',
    borderRadius: '8px',
    marginBottom: '12px',
    fontWeight: '500',
  },
  textarea: {
    width: '100%',
    fontSize: '15px',
    color: '#FFFFFF',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    outline: 'none',
    resize: 'none',
    transition: 'border-color 0.2s ease',
  },
  inputFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '12px',
  },
  charCounter: {
    fontSize: '13px',
    fontWeight: '500',
  },
  sendButton: {
    padding: '8px 20px',
    fontSize: '15px',
    color: '#FFFFFF',
    background: '#007AFF',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
};

export default ChatBox;
