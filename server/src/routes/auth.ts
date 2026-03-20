import { FastifyInstance } from 'fastify';
import { AuthService } from '../services/AuthService';
import crypto from 'crypto';

const SESSIONS = new Map<string, any>();

export default async function authRoutes(fastify: FastifyInstance) {
    const authService = AuthService.getInstance();

    fastify.get('/status', async () => {
        return { 
            hasAdmin: await authService.hasAdmin()
        };
    });

    fastify.post('/setup', async (request, reply) => {
        const { username, password } = request.body as any;
        if (!username || !password) {
            return reply.code(400).send({ error: 'Username and password required' });
        }
        try {
            await authService.createAdmin(username, password);
            return { message: 'Admin created successfully' };
        } catch (err: any) {
            return reply.code(400).send({ error: err.message });
        }
    });

    fastify.post('/login', async (request, reply) => {
        const { username, password } = request.body as any;
        const user = await authService.validateUser(username, password);
        if (!user) {
            return reply.code(401).send({ error: 'Invalid credentials' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        SESSIONS.set(token, { user, expires: Date.now() + 24 * 60 * 60 * 1000 });
        
        return { token, user };
    });

    fastify.post('/logout', async (request) => {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (token) SESSIONS.delete(token);
        return { status: 'ok' };
    });

    // For internal middleware use
    (fastify as any).decorate('verifyAuth', async (request: any, reply: any) => {
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
