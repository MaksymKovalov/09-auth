import axios from 'axios';

const normalizeBaseUrl = (url: string) => url.replace(/\/$/, '');

const getServerBaseUrl = () => {
  // На Vercel не використовуємо localhost URL
  if (process.env.NEXT_PUBLIC_API_URL && !process.env.VERCEL) {
    return `${normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL)}/api`;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (appUrl) {
    return `${normalizeBaseUrl(appUrl)}/api`;
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}/api`;
  }

  const port = process.env.PORT ?? '3000';
  return `http://localhost:${port}/api`;
};

const baseURL = typeof window === 'undefined'
  ? getServerBaseUrl()
  : '/api'; // На клієнті завжди використовуємо відносний URL

export const api = axios.create({
  baseURL,
  withCredentials: true,
});
