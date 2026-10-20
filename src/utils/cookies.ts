import { CookieOptions, Response } from 'express';
import { env } from '../config/env';

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const defaultCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SECURE ? 'none' : 'lax',
  path: '/',
};

export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string
): void => {
  res.cookie('accessToken', accessToken, {
    ...defaultCookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  res.cookie('refreshToken', refreshToken, {
    ...defaultCookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
    path: '/api/auth', // Scoped to auth endpoints for security
  });
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie('accessToken', {
    ...defaultCookieOptions,
    path: '/',
  });

  res.clearCookie('refreshToken', {
    ...defaultCookieOptions,
    path: '/api/auth',
  });
};
