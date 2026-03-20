import { FastifyInstance } from 'fastify';
import { SystemService } from '../services/SystemService';
import { SslService } from '../services/SslService';

export default async function systemRoutes(fastify: FastifyInstance) {
  const systemService = SystemService.getInstance();
  const sslService = SslService.getInstance();

  // Get metrics
  fastify.get('/metrics', async () => {
    return await systemService.getMetrics();
  });

  // SSL Setup
  fastify.post('/setup-ssl', async (request, reply) => {
    const { domain, email } = request.body as any;
    if (!domain || !email) {
      return reply.code(400).send({ error: 'Domain and email are required' });
    }
    const result = await sslService.setupSsl(domain, email);
    return result;
  });

  // Cert status check
  fastify.get('/cert-status/:domain', async (request) => {
    const { domain } = request.params as any;
    return await sslService.getCertStatus(domain);
  });
}
