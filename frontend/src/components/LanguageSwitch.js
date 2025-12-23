import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

function LanguageSwitch() {
  const { language, switchLanguage } = useLanguage();

  return (
    <div style={styles.container}>
      <button
        onClick={() => switchLanguage('en')}
        style={{
          ...styles.button,
          ...(language === 'en' ? styles.activeButton : {}),
        }}
        title="English"
      >
        <span style={styles.flag}>🇬🇧</span>
      </button>
      <button
        onClick={() => switchLanguage('ru')}
        style={{
          ...styles.button,
          ...(language === 'ru' ? styles.activeButton : {}),
        }}
        title="Русский"
      >
        <span style={styles.flag}>🇷🇺</span>
      </button>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    gap: '8px',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    padding: '6px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  button: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  flag: {
    fontSize: '24px',
    display: 'block',
    lineHeight: 1,
  },
};

export default LanguageSwitch;
