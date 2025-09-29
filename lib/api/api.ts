import axios from 'axios';

const normalizeBaseUrl = (url: string) => url.replace(/\/$/, '');
const appendApiSuffix = (url: string) => `${normalizeBaseUrl(url)}/api`;

const adjustLocalPort = (url: string) => {
  try {
    const parsed = new URL(url);
    const desiredPort = process.env.PORT;

    if (
      desiredPort &&
      desiredPort !== parsed.port &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      parsed.port = desiredPort;
      return parsed.toString().replace(/\/$/, '');
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[api] adjustLocalPort failed for url', url, error);
    }
  }

  return url;
};

const getServerBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    const normalizedApiUrl = normalizeBaseUrl(
      adjustLocalPort(process.env.NEXT_PUBLIC_API_URL),
    );
    const normalizedAppUrl = process.env.NEXT_PUBLIC_APP_URL
      ? normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL)
      : undefined;

    const shouldAppendSuffix =
      normalizedApiUrl === normalizedAppUrl || normalizedApiUrl.includes('localhost');

    return shouldAppendSuffix ? appendApiSuffix(normalizedApiUrl) : normalizedApiUrl;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (appUrl) {
    return appendApiSuffix(appUrl);
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return appendApiSuffix(`https://${vercelUrl}`);
  }

  const port = process.env.PORT ?? '3000';
  return appendApiSuffix(`http://localhost:${port}`);
};

const baseURL = typeof window === 'undefined' ? getServerBaseUrl() : '/api';

if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
  console.debug('[api] baseURL resolved to', baseURL);
}

export const api = axios.create({
  baseURL,
  withCredentials: true,
});
