import type { AxiosRequestConfig } from 'axios';
import { cookies } from 'next/headers';
import { api } from './api';
import {
  fetchNotesRequest,
  fetchNoteByIdRequest,
  createNoteRequest,
  updateNoteRequest,
  deleteNoteRequest,
  type FetchNotesParams,
} from './clientApi';
import type { CreateNoteRequest } from '@/types/note';
import type { UpdateUserRequest } from '@/types/auth';
import type { User } from '@/types/user';

const mergeConfigs = async (config?: AxiosRequestConfig): Promise<AxiosRequestConfig> => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const baseHeaders = cookieHeader ? { Cookie: cookieHeader } : undefined;

  return {
    ...config,
    headers: {
      ...baseHeaders,
      ...(config?.headers ?? {}),
    },
  };
};

export const fetchNotesServer = async (params?: FetchNotesParams) =>
  fetchNotesRequest(params, await mergeConfigs());

export const fetchNoteByIdServer = async (id: string) =>
  fetchNoteByIdRequest(id, await mergeConfigs());

export const createNoteServer = async (payload: CreateNoteRequest) =>
  createNoteRequest(payload, await mergeConfigs());

export const updateNoteServer = async (id: string, payload: CreateNoteRequest) =>
  updateNoteRequest(id, payload, await mergeConfigs());

export const deleteNoteServer = async (id: string) =>
  deleteNoteRequest(id, await mergeConfigs());

export const getSessionServer = async () =>
  api.get<{ success: boolean }>('/auth/session', await mergeConfigs());

export const getCurrentUserServer = async () => {
  try {
    console.log('getCurrentUserServer: Starting request');
    const config = await mergeConfigs();
    console.log('getCurrentUserServer: Config ready');

    // Додаємо таймаут для Vercel
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        console.log('getCurrentUserServer: Request timeout');
        resolve(null);
      }, 5000); // 5 секунд таймаут
    });

    const requestPromise = api.get<User>('/users/me', config);

    const response = await Promise.race([requestPromise, timeoutPromise]);

    if (!response) {
      console.log('getCurrentUserServer: Timeout reached');
      return null;
    }

    console.log('getCurrentUserServer: Response received', response.data);
    return response.data;
  } catch (error) {
    console.error('getCurrentUserServer: Error', error);
    return null;
  }
};

export const updateUserServer = async (payload: UpdateUserRequest) => {
  const response = await api.patch<User>('/users/me', payload, await mergeConfigs());

  return response.data;
};
