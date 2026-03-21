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
                .link { word-break: break-all; font-size: 12px; color: #a1a1aa; font-family: monospace; margin-bottom: 15px; display: block; }
                .qr-box { background: white; padding: 10px; border-radius: 8px; display: inline-block; margin: 10px 0; }
                .qr-box img { width: 120px; height: 120px; display: block; }
                .btn { display: inline-block; background: #8b5cf6; color: white; padding: 10px 20px; border-radius: 8px; 
                text-decoration: none; font-size: 14px; font-weight: bold; cursor: pointer; border: none; margin-right: 10px; }
                h1 { border-bottom: 2px solid #8b5cf6; padding-bottom: 10px; }
                .flex-row { display: flex; align-items: flex-start; gap: 20px; flex-wrap: wrap; }
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
                <h1>VGate Subscription Dashboard</h1>
                <p>Scan the QR below or add this URL to your client for automatic updates:</p>
                
                <div class="config" style="background: #1e1b4b; border-color: #312e81;">
                    <span class="title">Your Subscription Link</span>
                    <div class="flex-row">
                        <div class="qr-box">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${request.protocol || 'http'}://${request.hostname}${request.url}`)}" alt="Sub QR">
                        </div>
                        <div style="flex: 1;">
                            <div class="link">${request.protocol}://${request.hostname}${request.url}</div>
                            <button class="btn" onclick="copy('${`${request.protocol || 'http'}://${request.hostname}${request.url}`}')">Copy Sub Link</button>
                        </div>
                    </div>
                </div>
                
                <h2>Individual Configurations:</h2>
                ${links.map((link, i) => `
                    <div class="config">
                        <span class="title">Config #${i+1} - Node: ${clients[i].inbound.node?.name || 'Master'}</span>
                        <div class="flex-row">
                            <div class="qr-box">
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(link)}" alt="Config QR">
                            </div>
                            <div style="flex: 1;">
                                <div class="link">${link}</div>
                                <button class="btn" onclick="copy('${link}')">Copy Config Link</button>
                            </div>
                        </div>
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
