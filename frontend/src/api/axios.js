import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4006/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let refreshRequestPromise = null;
let sessionExpiredEventEmitted = false;

/**
 * =========================
 * CONTROL GLOBAL OFFLINE / NETWORK FAIL
 * =========================
 */
let offlineEventEmitted = false;

const emitOfflineOnce = () => {
  if (offlineEventEmitted) return;
  offlineEventEmitted = true;
  window.dispatchEvent(new Event('APP_OFFLINE'));
};

const emitSessionExpiredOnce = () => {
  if (sessionExpiredEventEmitted) return;
  sessionExpiredEventEmitted = true;
  window.dispatchEvent(new Event('SESSION_EXPIRED'));
};

/**
 * REQUEST INTERCEPTOR
 * - Corta requests si no hay internet
 */
client.interceptors.request.use(
  (config) => {
    if (!navigator.onLine) {
      emitOfflineOnce();
      return Promise.reject({ isOffline: true });
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * =========================
 * RESPONSE INTERCEPTOR
 * =========================
 */
client.interceptors.response.use(
  (response) => {
    offlineEventEmitted = false;
    sessionExpiredEventEmitted = false;
    return response;
  },
  async (error) => {
    // Network error (sin respuesta del server): tratamos como offline
    if (!error?.response && (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error')) {
      emitOfflineOnce();
      error.isOffline = true;
      return Promise.reject(error);
    }

    // Error por estar offline (ya manejado arriba)
    if (error?.isOffline) {
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    // =========================
    // TOKEN EXPIRADO → REFRESH
    // =========================
    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh-token')
    ) {
      originalRequest._retry = true;

      try {
        if (!refreshRequestPromise) {
          refreshRequestPromise = client.post('/auth/refresh-token');
        }

        await refreshRequestPromise;
        return client(originalRequest);
      } catch (refreshError) {
        // Solo consideramos "sesión expirada" si el server respondió 401/403.
        // Si falla por red/timeout, NO deslogueamos al usuario.
        const status = refreshError?.response?.status;
        if (status === 401 || status === 403) {
          emitSessionExpiredOnce();
        }
        return Promise.reject(refreshError);
      } finally {
        refreshRequestPromise = null;
      }
    }

    return Promise.reject(error);
  }
);

export default client;
