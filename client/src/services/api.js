import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Restore token from storage on init
const token = localStorage.getItem('cq_token');
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cq_token');
      delete api.defaults.headers.common['Authorization'];
      if (window.location.pathname !== '/login' && window.location.pathname !== '/patient-status') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
