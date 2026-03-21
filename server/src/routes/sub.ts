import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { db } from '../db';
import { clients as clientTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { generateProxyUri } from '../utils/link-generator';
import { SettingsService } from '../services/SettingsService';

export default async function subRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  const settingsService = SettingsService.getInstance();

  fastify.get('/:subId', async (request, reply) => {
    const { subId } = request.params as any;
    
    const clients = await db.query.clients.findMany({
      where: eq(clientTable.subId, subId),
      with: {
        inbound: {
          with: {
            node: true
          }
        }
      }
    });

    if (!clients || clients.length === 0) {
      return reply.code(404).send('# No subscriptions found for this ID');
    }

    const masterIp = await settingsService.getSetting('server_ip', '127.0.0.1') as string;

    const links = clients.map(client => {
      const inbound = client.inbound;
      const node = inbound.node;
      
      // Resolve host: node address or master ip if it's node 1 (master)
      let host = node?.address || masterIp;
      if (host === 'localhost' || host === '127.0.0.1') host = masterIp;

      return generateProxyUri(inbound, client, host);
    }).filter(Boolean);

    reply.type('text/plain; charset=utf-8');
    return links.join('\n');
  });
}
