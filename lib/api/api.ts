import axios from 'axios';

// Для клієнтських запитів до власних Route Handlers завжди використовуємо відносні шляхи
export const nextServer = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Для серверних запитів до зовнішнього бекенду
export const api = axios.create({
  baseURL: 'https://notehub-api.goit.study',
  withCredentials: true,
});

