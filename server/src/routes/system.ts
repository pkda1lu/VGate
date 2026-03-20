import { FastifyInstance } from 'fastify';
import { SystemService } from '../services/SystemService';

export default async function systemRoutes(fastify: FastifyInstance) {
  const systemService = SystemService.getInstance();

  // Get metrics
  fastify.get('/metrics', async () => {
    return await systemService.getMetrics();
  });
}
