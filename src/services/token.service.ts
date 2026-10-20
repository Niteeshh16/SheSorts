import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { query } from '../config/db';
import { hashToken } from '../utils/hash';
import { AuthTokens, JwtPayload, RefreshTokenRecord, SafeUser } from '../types';

export class TokenService {
  public static generateTokens(user: SafeUser): AuthTokens {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    const accessOptions: SignOptions = {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
    };

    const refreshOptions: SignOptions = {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, accessOptions);
    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, refreshOptions);

    return { accessToken, refreshToken };
  }

  public static verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
  }

  public static verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
  }

  public static async storeRefreshToken(
    userId: string,
    refreshToken: string,
    expiresAt?: Date
  ): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    const expiration =
      expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiration]
    );
  }

  public static async findRefreshToken(refreshToken: string): Promise<RefreshTokenRecord | null> {
    const tokenHash = hashToken(refreshToken);
    const result = await query<RefreshTokenRecord>(
      `SELECT * FROM refresh_tokens 
       WHERE token_hash = $1 AND expires_at > NOW()`,
      [tokenHash]
    );

    return result.rows[0] || null;
  }

  public static async deleteRefreshToken(refreshToken: string): Promise<boolean> {
    const tokenHash = hashToken(refreshToken);
    const result = await query(
      `DELETE FROM refresh_tokens WHERE token_hash = $1`,
      [tokenHash]
    );

    return (result.rowCount ?? 0) > 0;
  }

  public static async deleteAllUserRefreshTokens(userId: string): Promise<void> {
    await query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
  }

  public static async cleanExpiredTokens(): Promise<number> {
    const result = await query(`DELETE FROM refresh_tokens WHERE expires_at <= NOW()`);
    return result.rowCount ?? 0;
  }
}
