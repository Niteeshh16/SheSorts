import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export type SafeUser = Omit<User, 'password_hash'>;

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: SafeUser;
}

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}
