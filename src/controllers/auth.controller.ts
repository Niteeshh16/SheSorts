import { NextFunction, Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { TokenService } from '../services/token.service';
import { comparePassword, hashPassword } from '../utils/hash';
import { clearAuthCookies, setAuthCookies } from '../utils/cookies';
import { AppError } from '../middleware/error.middleware';
import { SafeUser } from '../types';

export class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  public static async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, password, name } = req.body;

      // Check if user already exists
      const existingUser = await UserService.findUserByEmail(email);
      if (existingUser) {
        throw new AppError('An account with this email address already exists', 409);
      }

      // Hash password and persist user
      const hashedPassword = await hashPassword(password);
      const user = await UserService.createUser(email, hashedPassword, name);

      // Generate access & refresh tokens
      const tokens = TokenService.generateTokens(user);
      await TokenService.storeRefreshToken(user.id, tokens.refreshToken);

      // Set HTTP-only cookies
      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      res.status(201).json({
        status: 'success',
        message: 'Account created successfully',
        data: {
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user with credentials
   * POST /api/auth/login
   */
  public static async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await UserService.findUserByEmail(email);
      if (!user) {
        throw new AppError('Invalid email or password', 401);
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        throw new AppError('Invalid email or password', 401);
      }

      const safeUser: SafeUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
        updated_at: user.updated_at,
      };

      // Generate access & refresh tokens
      const tokens = TokenService.generateTokens(safeUser);
      await TokenService.storeRefreshToken(safeUser.id, tokens.refreshToken);

      // Set HTTP-only cookies
      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      res.status(200).json({
        status: 'success',
        message: 'Logged in successfully',
        data: {
          user: safeUser,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Log out user and revoke refresh token
   * POST /api/auth/logout
   */
  public static async logout(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const refreshToken =
        req.cookies?.refreshToken ||
        req.body?.refreshToken ||
        (req.headers['x-refresh-token'] as string | undefined);

      if (refreshToken) {
        await TokenService.deleteRefreshToken(refreshToken);
      }

      clearAuthCookies(res);

      res.status(200).json({
        status: 'success',
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token using refresh token (with rotation)
   * POST /api/auth/refresh
   */
  public static async refresh(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const refreshToken =
        req.cookies?.refreshToken ||
        req.body?.refreshToken ||
        (req.headers['x-refresh-token'] as string | undefined);

      if (!refreshToken) {
        throw new AppError('Refresh token is required', 400);
      }

      // Verify signature & expiration of refresh token
      let payload;
      try {
        payload = TokenService.verifyRefreshToken(refreshToken);
      } catch (err) {
        throw new AppError('Invalid or expired refresh token', 401);
      }

      // Check if refresh token is in database (and not revoked)
      const tokenRecord = await TokenService.findRefreshToken(refreshToken);
      if (!tokenRecord) {
        throw new AppError('Refresh token has been revoked or is invalid', 401);
      }

      // Fetch user
      const user = await UserService.findUserById(payload.sub);
      if (!user) {
        throw new AppError('User not found', 401);
      }

      // Token Rotation: Delete old refresh token & issue new pair
      await TokenService.deleteRefreshToken(refreshToken);

      const newTokens = TokenService.generateTokens(user);
      await TokenService.storeRefreshToken(user.id, newTokens.refreshToken);

      setAuthCookies(res, newTokens.accessToken, newTokens.refreshToken);

      res.status(200).json({
        status: 'success',
        message: 'Tokens refreshed successfully',
        data: {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current authenticated user profile
   * GET /api/auth/me
   */
  public static async getMe(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError('Not authenticated', 401);
      }

      res.status(200).json({
        status: 'success',
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
