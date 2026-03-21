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

    // Detect browser vs client
    const acceptHeader = request.headers.accept || '';
    if (acceptHeader.includes('text/html')) {
        reply.type('text/html');
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>VGate Subscription</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { background: #09090b; color: white; font-family: sans-serif; padding: 20px; line-height: 1.6; }
                .container { max-width: 800px; margin: 0 auto; }
                .config { background: #18181b; border: 1px solid #27272a; padding: 15px; border-radius: 12px; margin-bottom: 
                15px; }
                .title { font-weight: bold; color: #8b5cf6; margin-bottom: 10px; display: block; }
                .link { word-break: break-all; font-size: 12px; color: #a1a1aa; font-family: monospace; }
                .btn { display: inline-block; background: #8b5cf6; color: white; padding: 5px 10px; border-radius: 6px; 
                text-decoration: none; font-size: 12px; margin-top: 10px; cursor: pointer; border: none; }
                h1 { border-bottom: 2px solid #8b5cf6; padding-bottom: 10px; }
            </style>
            <script>
                function copy(text) {
                    navigator.clipboard.writeText(text);
                    alert('Copied to clipboard!');
                }
            </script>
        </head>
        <body>
            <div class="container">
                <h1>VGate Configuration Dashboard</h1>
                <p>Add this URL to your VLESS/V2Ray client for automatic updates:</p>
                <div class="config" style="background: #1e1b4b; border-color: #312e81;">
                    <span class="title">Your Subscription Link</span>
                    <div class="link">${request.protocol}://${request.hostname}${request.url}</div>
                </div>
                
                <h2>Individual Configurations:</h2>
                ${links.map((link, i) => `
                    <div class="config">
                        <span class="title">Config #${i+1} - Node: ${clients[i].inbound.node?.name || 'Master'}</span>
                        <div class="link">${link}</div>
                        <button class="btn" onclick="copy('${link}')">Copy Link</button>
                    </div>
                `).join('')}
            </div>
        </body>
        </html>
        `;
    }

    // Default for V2Ray clients: Base64 or plain text list
    // Most clients prefer newline-separated list, but some like base64
    // We'll return plain text as it's more universal for VLESS links
    reply.type('text/plain; charset=utf-8');
    // base64 encode for better client compatibility
    return Buffer.from(links.join('\n')).toString('base64');
  });
}
