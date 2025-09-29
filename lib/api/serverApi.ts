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
import { debugCookies, isAuthDebugEnabled, logAuthDebug } from '@/lib/utils/authDebug';

const mergeConfigs = async (config?: AxiosRequestConfig): Promise<AxiosRequestConfig> => {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const baseHeaders = cookieHeader ? { Cookie: cookieHeader } : undefined;

  if (isAuthDebugEnabled) {
    logAuthDebug('serverApi:mergeConfigs', {
      hasCookieHeader: Boolean(cookieHeader),
      cookieDebug: cookieHeader ? debugCookies(cookieHeader) : 'none',
    });
  }

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
    const response = await api.get<User>('/users/me', await mergeConfigs());
    if (isAuthDebugEnabled) {
      logAuthDebug('serverApi:getCurrentUser:success', {
        status: response.status,
        email: response.data.email,
      });
    }
    return response.data;
  } catch (error) {
    if (isAuthDebugEnabled) {
      logAuthDebug('serverApi:getCurrentUser:error', {
        message: (error as Error).message,
      });
    }
    return null;
  }
};

export const updateUserServer = async (payload: UpdateUserRequest) => {
  const response = await api.patch<User>('/users/me', payload, await mergeConfigs());

  return response.data;
};
