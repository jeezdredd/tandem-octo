import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const roomAPI = {
  createRoom: (data) => api.post('/rooms/', data),
  getRoom: (roomId) => api.get(`/rooms/${roomId}/`),
  getRoomState: (roomId) => api.get(`/rooms/${roomId}/state/`),
  updateRoomState: (roomId, data) => api.patch(`/rooms/${roomId}/state/`, data),
};

export const videoAPI = {
  getVideos: (search = '') => api.get(`/videos/`, { params: { search } }),
  getVideo: (videoId) => api.get(`/videos/${videoId}/`),
  createVideo: (data) => api.post('/videos/', data),
};

export default api;
