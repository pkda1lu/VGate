import * as os from 'os';
import { execSync } from 'child_process';

export interface SystemMetrics {
  cpu: number;
  memory: {
    total: number;
    used: number;
    percent: number;
  };
  disk: {
    total: number;
    used: number;
    percent: number;
  };
  uptime: number;
  xrayVersion: string;
}

export class SystemService {
  private static instance: SystemService;

  private constructor() {}

  public static getInstance(): SystemService {
    if (!SystemService.instance) {
      SystemService.instance = new SystemService();
    }
    return SystemService.instance;
  }

  public async getMetrics(): Promise<SystemMetrics> {
    const cpuLoad = this.getCpuLoad();
    const memory = this.getMemoryUsage();
    const disk = this.getDiskUsage();
    const uptime = Math.floor(os.uptime());
    const xrayVersion = this.getXrayVersion();

    return {
      cpu: cpuLoad,
      memory,
      disk,
      uptime,
      xrayVersion
    };
  }

  private getCpuLoad(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    });

    // Note: Simple average since boot. For real-time, we'd need two measurements.
    // However, this is a starting point for the panel.
    return Math.floor(((totalTick - totalIdle) / totalTick) * 100);
  }

  private getMemoryUsage() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const percent = Math.floor((used / total) * 100);

    return { total, used, percent };
  }

  private getDiskUsage() {
    try {
      if (process.platform === 'win32') {
        return { total: 0, used: 0, percent: 0 };
      }
      // df output: Filesystem 1B-blocks Used Available Use% Mounted on
      const output = execSync('df -B1 / --output=size,used,pcent').toString();
      const lines = output.split('\n');
      if (lines.length > 1) {
        const stats = lines[1].trim().split(/\s+/);
        const total = parseInt(stats[0]);
        const used = parseInt(stats[1]);
        const percent = parseInt(stats[2].replace('%', ''));
        return { total, used, percent };
      }
    } catch (err) {
      console.error('Error getting disk usage:', err);
    }
    return { total: 0, used: 0, percent: 0 };
  }

  private getXrayVersion(): string {
    try {
      const binary = process.platform === 'win32' ? 'xray.exe' : 'xray';
      const output = execSync(`${binary} -version`).toString();
      const match = output.match(/Xray\s+(\d+\.\d+\.\d+)/);
      return match ? match[1] : 'unknown';
    } catch (err) {
      return 'not installed';
    }
  }
}
