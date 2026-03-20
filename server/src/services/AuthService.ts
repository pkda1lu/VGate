import { db } from '../db';
import { users } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';

export class AuthService {
    private static instance: AuthService;

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    private hashPassword(password: string): string {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.scryptSync(password, salt, 64).toString('hex');
        return `${salt}:${hash}`;
    }

    private verifyPassword(password: string, stored: string): boolean {
        const [salt, hash] = stored.split(':');
        const buffer = crypto.scryptSync(password, salt, 64).toString('hex');
        return buffer === hash;
    }

    async hasAdmin(): Promise<boolean> {
        const count = await db.select({ count: sql<number>`count(*)` }).from(users);
        return (count[0]?.count || 0) > 0;
    }

    async createAdmin(username: string, password: string) {
        if (await this.hasAdmin()) {
            throw new Error('Admin already exists');
        }
        const hashedPassword = this.hashPassword(password);
        await db.insert(users).values({
            username,
            password: hashedPassword
        });
    }

    async validateUser(username: string, password: string) {
        const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
        const user = result[0];
        if (!user) return null;

        const isValid = this.verifyPassword(password, user.password);
        if (!isValid) return null;

        return { id: user.id, username: user.username };
    }
}
