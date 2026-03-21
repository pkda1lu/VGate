"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = authRoutes;
const AuthService_1 = require("../services/AuthService");
const crypto_1 = __importDefault(require("crypto"));
const SESSIONS = new Map();
async function authRoutes(fastify) {
    const authService = AuthService_1.AuthService.getInstance();
    fastify.get('/status', async () => {
        return {
            hasAdmin: await authService.hasAdmin()
        };
    });
    fastify.post('/setup', async (request, reply) => {
        const { username, password } = request.body;
        if (!username || !password) {
            return reply.code(400).send({ error: 'Username and password required' });
        }
        try {
            await authService.createAdmin(username, password);
            return { message: 'Admin created successfully' };
        }
        catch (err) {
            return reply.code(400).send({ error: err.message });
        }
    });
    fastify.post('/login', async (request, reply) => {
        const { username, password } = request.body;
        const user = await authService.validateUser(username, password);
        if (!user) {
            return reply.code(401).send({ error: 'Invalid credentials' });
        }
        const token = crypto_1.default.randomBytes(32).toString('hex');
        SESSIONS.set(token, { user, expires: Date.now() + 24 * 60 * 60 * 1000 });
        return { token, user };
    });
    fastify.post('/logout', async (request) => {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (token)
            SESSIONS.delete(token);
        return { status: 'ok' };
    });
    // For internal middleware use
    fastify.decorate('verifyAuth', async (request, reply) => {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token || !SESSIONS.has(token)) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }
        const session = SESSIONS.get(token);
        if (session.expires < Date.now()) {
            SESSIONS.delete(token);
            return reply.code(401).send({ error: 'Unauthorized' });
        }
        request.user = session.user;
    });
}
