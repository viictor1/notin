import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL;

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        setAccessToken(data.token);
        processQueue(null, data.token);
        originalRequest.headers.Authorization = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        setAccessToken(null);
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
export const authService = {
  login: (password: string) => api.post('/auth/login', { password }),
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh', {}, { withCredentials: true }),
};

export const notesService = {
  list: () => api.get('/notes'),
  get: (id: string) => api.get(`/notes/${id}`),
  create: (title: string | null, content: string) =>
    api.post('/notes', { title, content }),
  update: (id: string, title: string | null, content: string) =>
    api.put(`/notes/${id}`, { title, content }),
  delete: (id: string) => api.delete(`/notes/${id}`),
};
