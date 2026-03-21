"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = __importDefault(require("crypto"));
class AuthService {
    static getInstance() {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }
    hashPassword(password) {
        const salt = crypto_1.default.randomBytes(16).toString('hex');
        const hash = crypto_1.default.scryptSync(password, salt, 64).toString('hex');
        return `${salt}:${hash}`;
    }
    verifyPassword(password, stored) {
        const [salt, hash] = stored.split(':');
        const buffer = crypto_1.default.scryptSync(password, salt, 64).toString('hex');
        return buffer === hash;
    }
    async hasAdmin() {
        const count = await db_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)` }).from(schema_1.users);
        return (count[0]?.count || 0) > 0;
    }
    async createAdmin(username, password) {
        if (await this.hasAdmin()) {
            throw new Error('Admin already exists');
        }
        const hashedPassword = this.hashPassword(password);
        await db_1.db.insert(schema_1.users).values({
            username,
            password: hashedPassword
        });
    }
    async validateUser(username, password) {
        const result = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.username, username)).limit(1);
        const user = result[0];
        if (!user)
            return null;
        const isValid = this.verifyPassword(password, user.password);
        if (!isValid)
            return null;
        return { id: user.id, username: user.username };
    }
}
exports.AuthService = AuthService;
