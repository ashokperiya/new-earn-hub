import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  register: (data: { email: string; password: string; name: string; phone?: string; village?: string; district?: string; state?: string }) =>
    api.post('/auth/register', data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: { name?: string; phone?: string; profile_photo?: string; village?: string; district?: string; state?: string }) =>
    api.put('/auth/profile', data),
};

// Moi System APIs
export const moiAPI = {
  create: (data: {
    person_name: string;
    person_phone?: string;
    event_type: string;
    event_name: string;
    amount: number;
    direction: string;
    date?: string;
    notes?: string;
  }) => api.post('/moi', data),
  getAll: (direction?: string, person_name?: string) => {
    const params = new URLSearchParams();
    if (direction) params.append('direction', direction);
    if (person_name) params.append('person_name', person_name);
    return api.get(`/moi?${params.toString()}`);
  },
  getSummary: () => api.get('/moi/summary'),
  getByPerson: (person_name: string) => api.get(`/moi/person/${encodeURIComponent(person_name)}`),
  delete: (entry_id: string) => api.delete(`/moi/${entry_id}`),
};

// Posts/News APIs
export const postsAPI = {
  create: (data: {
    content: string;
    media?: string;
    media_type?: string;
    category?: string;
    location_level?: string;
    village?: string;
    district?: string;
  }) => api.post('/posts', data),
  getAll: (params?: { category?: string; location_level?: string; village?: string; district?: string; skip?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return api.get(`/posts?${searchParams.toString()}`);
  },
  like: (postId: string) => api.post(`/posts/${postId}/like`),
  comment: (postId: string, content: string) => api.post(`/posts/${postId}/comment?content=${encodeURIComponent(content)}`),
};

// Events APIs
export const eventsAPI = {
  create: (data: {
    title: string;
    description: string;
    event_type: string;
    start_date: string;
    end_date?: string;
    location: string;
    village?: string;
    district?: string;
    image?: string;
  }) => api.post('/events', data),
  getAll: (params?: { event_type?: string; village?: string; district?: string; upcoming?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return api.get(`/events?${searchParams.toString()}`);
  },
  attend: (eventId: string) => api.post(`/events/${eventId}/attend`),
};

// Services/Marketplace APIs
export const servicesAPI = {
  create: (data: {
    name: string;
    category: string;
    description: string;
    phone: string;
    village?: string;
    district?: string;
    price_range?: string;
    image?: string;
  }) => api.post('/services', data),
  getAll: (params?: { category?: string; village?: string; district?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return api.get(`/services?${searchParams.toString()}`);
  },
  review: (serviceId: string, rating: number, comment: string) =>
    api.post(`/services/${serviceId}/review?rating=${rating}&comment=${encodeURIComponent(comment)}`),
};

// Emergency APIs
export const emergencyAPI = {
  send: (alert_type: string, message: string, location?: string) =>
    api.post('/emergency', { alert_type, message, location }),
  getHistory: () => api.get('/emergency/history'),
  resolve: (alertId: string) => api.put(`/emergency/${alertId}/resolve`),
};

// AI Assistant API
export const aiAPI = {
  chat: (message: string) => api.post('/ai/chat', { message }),
};

// Points API
export const pointsAPI = {
  get: () => api.get('/points'),
};

// Search API
export const searchAPI = {
  global: (query: string) => api.get(`/search?query=${encodeURIComponent(query)}`),
};

export default api;
