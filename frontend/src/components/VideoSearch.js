import React, { useState, useRef } from 'react';
import axios from 'axios';

const VIDEO_SOURCES = [
  { 
    id: 'turbo', 
    name: 'Turbo', 
    url: (kpId) => `https://ec85aef9.obrut.show/embed/czM/kinopoisk/${kpId}?api=1` 
  },
  { 
    id: 'alloha', 
    name: 'AllohaTV', 
    url: (kpId) => `https://4h0y.short.gy/alloha/index.html?kp=${kpId}` 
  },
  { 
    id: 'cdnmovies', 
    name: 'CDN Movies', 
    url: (kpId) => `https://cdnmovies.net/embed/kinopoisk/${kpId}` 
  },
  { 
    id: 'vibix', 
    name: 'Vibix', 
    url: (kpId) => `https://tr.vibix.me/kinopoisk.php?token=6a8f28b98bdb6c67a32e38f0f5438c52&kinopoisk=${kpId}` 
  },
];

function VideoSearch({ onSelectVideo }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showSourceSelect, setShowSourceSelect] = useState(false);
  const [selectedFilm, setSelectedFilm] = useState(null);
  const searchTimeoutRef = useRef(null);

  const isUrl = (text) => {
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  };

  const searchMovies = async (query) => {
    setLoading(true);
    try {
      // Используем unofficial Kinopoisk API
      const response = await axios.get(
        `https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword?keyword=${encodeURIComponent(query)}`,
        {
          headers: {
            'X-API-KEY': 'e30ffed0-76ab-4dd6-b41f-4c9da2b2735b', // Публичный ключ для тестов
          },
        }
      );

      const films = response.data.films || [];
      setSearchResults(films.slice(0, 10)); // Первые 10 результатов
      setShowResults(true);
    } catch (error) {
      console.error('Error searching movies:', error);
      alert('Ошибка поиска. Попробуйте ещё раз.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!value.trim()) {
      setShowResults(false);
      setSearchResults([]);
      return;
    }

    if (isUrl(value)) {
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchMovies(value);
    }, 500);
  };

  const handleSearch = () => {
    const query = searchQuery.trim();
    if (!query) return;

    // Если это URL - сразу загружаем
    if (isUrl(query)) {
      onSelectVideo(query, 'Direct Link');
      setSearchQuery('');
      setShowResults(false);
    } else {
      // Иначе ищем по названию
      searchMovies(query);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const selectMovie = (film) => {
    setSelectedFilm(film);
    setShowSourceSelect(true);
    setShowResults(false);
  };

  const selectSource = (source) => {
    const kinopoiskId = selectedFilm.filmId || selectedFilm.kinopoiskId;
    const embedUrl = source.url(kinopoiskId);
    
    onSelectVideo(embedUrl, `${selectedFilm.nameRu || selectedFilm.nameEn} (${source.name})`);
    setSearchQuery('');
    setShowResults(false);
    setShowSourceSelect(false);
    setSelectedFilm(null);
    setSearchResults([]);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: hoverStyles }} />
      <div style={styles.container}>
        <div style={styles.searchBox}>
        <input
          type="text"
          placeholder="Введите название фильма или вставьте ссылку..."
          value={searchQuery}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          style={styles.input}
        />
        {loading && <div style={styles.loadingIndicator}>⏳</div>}
      </div>

      {showSourceSelect && selectedFilm && (
        <div style={styles.results}>
          <div style={styles.resultsHeader}>
            <span>Выберите источник для: {selectedFilm.nameRu || selectedFilm.nameEn}</span>
            <button className="close-button" onClick={() => { setShowSourceSelect(false); setSelectedFilm(null); }} style={styles.closeButton}>
              ✕
            </button>
          </div>
          <div style={styles.sourceList}>
            {VIDEO_SOURCES.map((source) => (
              <div
                key={source.id}
                className="source-item"
                style={styles.sourceItem}
                onClick={() => selectSource(source)}
              >
                <span style={styles.sourceName}>{source.name}</span>
                <span style={styles.sourceArrow}>→</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showResults && searchResults.length > 0 && (
        <div style={styles.results}>
          <div style={styles.resultsHeader}>
            <span>Найдено: {searchResults.length}</span>
            <button className="close-button" onClick={() => setShowResults(false)} style={styles.closeButton}>
              ✕
            </button>
          </div>
          <div style={styles.resultsList}>
            {searchResults.map((film) => (
              <div
                key={film.filmId}
                className="result-item"
                style={styles.resultItem}
                onClick={() => selectMovie(film)}
              >
                {film.posterUrlPreview && (
                  <img
                    src={film.posterUrlPreview}
                    alt={film.nameRu}
                    style={styles.poster}
                    onError={(e) => (e.target.style.display = 'none')}
                  />
                )}
                <div style={styles.movieInfo}>
                  <div style={styles.movieTitle}>
                    {film.nameRu || film.nameEn}
                  </div>
                  {film.year && (
                    <div style={styles.movieYear}>{film.year}</div>
                  )}
                  {film.rating && (
                    <div style={styles.movieRating}>⭐ {film.rating}</div>
                  )}
                  {film.genres && film.genres.length > 0 && (
                    <div style={styles.movieGenres}>
                      {film.genres.map((g) => g.genre).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showResults && searchResults.length === 0 && !loading && (
        <div style={styles.noResults}>
          <p>Ничего не найдено. Попробуйте другой запрос.</p>
        </div>
      )}
    </div>
    </>
  );
}

const hoverStyles = `
  .result-item:hover {
    background: rgba(255, 255, 255, 0.05) !important;
  }
  .source-item:hover {
    background: rgba(255, 255, 255, 0.12) !important;
  }
  .close-button:hover {
    color: #FFFFFF !important;
  }
`;

const styles = {
  container: {
    position: 'relative',
    width: '100%',
  },
  searchBox: {
    display: 'flex',
    gap: '10px',
    width: '100%',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '15px',
    borderRadius: '8px',
    border: 'none',
    outline: 'none',
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#FFFFFF',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  },
  loadingIndicator: {
    position: 'absolute',
    right: '15px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '18px',
  },
  results: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '12px',
    background: 'rgba(28, 28, 30, 0.95)',
    backdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    maxHeight: '500px',
    overflow: 'hidden',
    zIndex: 100,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
  },
  resultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(84, 84, 88, 0.3)',
    color: '#FFFFFF',
    fontSize: '15px',
    fontWeight: '600',
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#8E8E93',
    fontSize: '22px',
    cursor: 'pointer',
    padding: '4px',
    transition: 'color 0.2s ease',
  },
  resultsList: {
    maxHeight: '440px',
    overflowY: 'auto',
  },
  resultItem: {
    display: 'flex',
    gap: '16px',
    padding: '16px 20px',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
    borderBottom: '1px solid rgba(84, 84, 88, 0.2)',
  },
  poster: {
    width: '60px',
    height: '90px',
    objectFit: 'cover',
    borderRadius: '4px',
    flexShrink: 0,
  },
  movieInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  movieTitle: {
    color: '#FFFFFF',
    fontSize: '16px',
    fontWeight: '600',
  },
  movieYear: {
    color: '#8E8E93',
    fontSize: '14px',
  },
  movieRating: {
    color: '#FFD700',
    fontSize: '14px',
    fontWeight: '500',
  },
  movieGenres: {
    color: '#AEAEB2',
    fontSize: '13px',
  },
  noResults: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '12px',
    padding: '32px 20px',
    background: 'rgba(28, 28, 30, 0.95)',
    backdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#8E8E93',
    textAlign: 'center',
    zIndex: 100,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
  },
  sourceList: {
    padding: '12px 16px',
  },
  sourceItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  sourceName: {
    color: '#FFFFFF',
    fontSize: '16px',
    fontWeight: '600',
  },
  sourceArrow: {
    color: '#007AFF',
    fontSize: '20px',
  },
};

export default VideoSearch;
