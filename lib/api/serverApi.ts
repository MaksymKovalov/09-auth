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
import type { UpdateUserRequest, User } from '@/types/user';

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

export const getSessionServer = async () => {
  const response = await api.get<{ success: boolean }>('/auth/session', await mergeConfigs());

  return Boolean(response.data?.success);
};

export const getCurrentUserServer = async () => {
  try {
    const response = await api.get<User>('/users/me', await mergeConfigs());

    return response.data;
  } catch {
    return null;
  }
};

export const updateUserServer = async (payload: UpdateUserRequest) => {
  const response = await api.patch<User>('/users/me', payload, await mergeConfigs());

  return response.data;
};
