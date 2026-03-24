const normalizeUrl = (value?: string): string => (value || '').trim().replace(/\/+$/, '');

const configuredBackendUrl =
  process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL || '';

const inferredWsBaseUrl = configuredBackendUrl
  ? configuredBackendUrl.replace(/^http/, (protocol) => (protocol === 'https' ? 'wss' : 'ws'))
  : '';

export const BACKEND_URL = normalizeUrl(
  configuredBackendUrl
);

export const WS_BASE_URL = normalizeUrl(
  process.env.REACT_APP_WS_BASE_URL || inferredWsBaseUrl
);

export const API_CONFIG = {
  BASE_URL: BACKEND_URL,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
};

