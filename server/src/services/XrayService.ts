import { spawn, ChildProcess, execSync } from 'child_process';
import * as fs from 'fs-extra';
import path from 'path';
import { db } from '../db';
import { SettingsService } from './SettingsService';

export class XrayService {
  private static instance: XrayService;
  private process: ChildProcess | null = null;
  private logs: string[] = [];
  private readonly maxLogs = 500;

  private constructor() {}

  public static getInstance(): XrayService {
    if (!XrayService.instance) {
      XrayService.instance = new XrayService();
    }
    return XrayService.instance;
  }

  public async generateConfig(externalInbounds?: any[]) {
    const inboundsData = externalInbounds || await db.query.inbounds.findMany({
      with: {
        clients: true
      }
    });

    const xrayInbounds = inboundsData
      .filter(inbound => {
        const port = Number(inbound.port);
        if (port <= 0 || port > 65535 || !Number.isInteger(port)) {
          console.warn(`[XrayService] Skipping inbound '${inbound.tag}' with invalid port: ${inbound.port}`);
          return false;
        }
        return true;
      })
      .map(inbound => {
        let settings = { clients: [] as any[] };
        try {
           const dbSettings = JSON.parse(inbound.settings);
           // We only need clients and specific fields, strip any trash
           if (dbSettings.clients) settings.clients = dbSettings.clients;
        } catch(e) {}
      
        // Map clients from our DB
        settings.clients = inbound.clients.map((client: any) => ({
          id: client.uuid,
          email: client.email,
          flow: client.flow === 'none' || !client.flow ? undefined : client.flow,
        }));

        if (inbound.protocol === 'vless') {
          (settings as any).decryption = "none";
          (settings as any).fallbacks = [];
        }

        const stream = JSON.parse(inbound.stream);
        
        // CRITICAL: Reality SERVER must NOT have publicKey in its config.
        // It only needs privateKey. publicKey is for clients only.
        if (stream.realitySettings) {
          delete stream.realitySettings.publicKey;
          if (Array.isArray(stream.realitySettings.shortIds)) {
              stream.realitySettings.shortIds = stream.realitySettings.shortIds.filter((s: string) => s && s.trim().length > 0);
          }
        }

        return {
          tag: inbound.tag,
          port: inbound.port,
          protocol: inbound.protocol,
          settings: settings,
          streamSettings: stream,
          sniffing: JSON.parse(inbound.sniffing)
        };
      });

    const settingsService = SettingsService.getInstance();
    
    // Load config sections from settings
    const logSection = JSON.parse(await settingsService.getSetting('xray_config_log', '{"loglevel":"warning"}') as string);
    const dnsSection = JSON.parse(await settingsService.getSetting('xray_config_dns', '{"servers":["1.1.1.1"]}') as string);
    const outboundsSection = JSON.parse(await settingsService.getSetting('xray_config_outbounds', '[{"protocol":"freedom","tag":"direct"},{"protocol":"blackhole","tag":"blocked"}]') as string);
    const routingSection = JSON.parse(await settingsService.getSetting('xray_config_routing', '{"rules":[]}') as string);
    const policySection = JSON.parse(await settingsService.getSetting('xray_config_policy', '{"levels":{"0":{"statsUserUplink":true,"statsUserDownlink":true}}}') as string);

    // Ensure api rule exists
    if (!routingSection.rules) routingSection.rules = [];
    if (!routingSection.rules.find((r: any) => r.inboundTag?.[0] === 'api')) {
        routingSection.rules.unshift({ type: "field", inboundTag: ["api"], outboundTag: "api" });
    }

    // Ensure blackhole outbound exists
    if (!outboundsSection.find((o: any) => o.tag === 'blocked')) {
        outboundsSection.push({ protocol: "blackhole", tag: "blocked" });
    }

    const config = {
      log: logSection,
      stats: {}, 
      dns: dnsSection,
      api: {
        tag: "api",
        services: ["HandlerService", "StatsService"]
      },
      policy: policySection,
      inbounds: [
        ...xrayInbounds,
        {
          listen: "127.0.0.1",
          port: 10085,
          protocol: "dokodemo-door",
          settings: { address: "127.0.0.1" },
          tag: "api"
        }
      ],
      outbounds: outboundsSection,
      routing: routingSection
    };

    const configPath = await settingsService.getSetting('xray_config_path', path.join(process.cwd(), 'xray_config.json'));

    await fs.writeJSON(configPath!, config, { spaces: 2 });
    return configPath!;
  }

  public async start(externalInbounds?: any[]) {
    const configPath = await this.generateConfig(externalInbounds);
    this.stop();

    const settingsService = SettingsService.getInstance();
    const xrayBinary = await settingsService.getSetting('xray_binary', process.platform === 'win32' ? 'xray.exe' : '/usr/local/bin/xray');

    if (!fs.existsSync(xrayBinary!)) {
      this.addLog(`[Error] Xray binary not found at ${xrayBinary}`);
      console.warn(`Xray binary not found at ${xrayBinary}. Skipping process start.`);
      return;
    }

    // Validate config before launching
    try {
      const testResult = execSync(`"${xrayBinary}" -test -config "${configPath}"`, { timeout: 10000 }).toString();
      this.addLog(`[System] Config validation OK: ${testResult.trim()}`);
    } catch (testErr: any) {
      const errMsg = (testErr.stdout?.toString() || '') + (testErr.stderr?.toString() || '') || testErr.message;
      this.addLog(`[Fatal] Xray config validation FAILED — check your inbound settings!`);
      this.addLog(`[Fatal] ${errMsg}`);
      console.error('Xray config test failed:', errMsg);
      return;
    }

    this.addLog(`[System] Starting Xray core with binary: ${xrayBinary}`);
    this.process = spawn(xrayBinary!, ['-c', configPath], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      this.addLog(data.toString());
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      this.addLog(`[Xray] ${data.toString()}`);
    });

    this.process.on('close', (code: number | null) => {
      this.addLog(`[System] Xray process exited with code ${code}`);
      console.log(`Xray process exited with code ${code}`);
      this.process = null;
    });
  }

  private addLog(message: string) {
    const lines = message.split('\n').filter(l => l.trim());
    for (const line of lines) {
        const formatted = `[${new Date().toLocaleTimeString()}] ${line}`;
        this.logs.push(formatted);
        console.log(formatted); // Print to console for journalctl
    }
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(this.logs.length - this.maxLogs);
    }
  }

  public getLogs() {
    return this.logs;
  }

  public isRunning(): boolean {
    return this.process !== null;
  }

  public stop() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  public async restart() {
    await this.start();
  }
}
