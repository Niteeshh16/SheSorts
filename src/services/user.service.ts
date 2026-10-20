import { query } from '../config/db';
import { SafeUser, User } from '../types';

export class UserService {
  public static async createUser(
    email: string,
    passwordHash: string,
    name: string
  ): Promise<SafeUser> {
    const result = await query<User>(
      `INSERT INTO users (email, password_hash, name)
       VALUES (LOWER($1), $2, $3)
       RETURNING id, email, name, created_at, updated_at`,
      [email.trim(), passwordHash, name.trim()]
    );

    return result.rows[0];
  }

  public static async findUserByEmail(email: string): Promise<User | null> {
    const result = await query<User>(
      `SELECT id, email, password_hash, name, created_at, updated_at
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );

    return result.rows[0] || null;
  }

  public static async findUserById(id: string): Promise<SafeUser | null> {
    const result = await query<SafeUser>(
      `SELECT id, email, name, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }
}
