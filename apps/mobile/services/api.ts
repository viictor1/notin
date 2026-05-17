import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const REFRESH_TOKEN_KEY = 'refreshToken';

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const saveRefreshToken = (token: string) =>
  SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);

export const getRefreshToken = () =>
  SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

export const deleteRefreshToken = () =>
  SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);

export const api = axios.create({
  baseURL: BASE_URL,
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
        const refreshToken = await getRefreshToken();

        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        setAccessToken(data.accessToken);
        await saveRefreshToken(data.refreshToken);
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        setAccessToken(null);
        await deleteRefreshToken();
        router.replace('/login');
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  login: (credential: { password: string }) =>
    api.post('/auth/login', credential),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken: string) =>
    axios.post(`${BASE_URL}/auth/refresh`, { refreshToken }),
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
