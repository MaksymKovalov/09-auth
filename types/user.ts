export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  username: string;
}
