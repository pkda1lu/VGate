import { db } from '../db';
import { settings } from '../db/schema';
import { eq } from 'drizzle-orm';

export type SettingKey = 'xray_binary' | 'xray_config_path' | 'panel_port' | 'telegram_token' | 'telegram_chat_id';

export class SettingsService {
  private static instance: SettingsService;

  private constructor() {}

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  public async getSetting(key: string, defaultValue?: string): Promise<string | undefined> {
    const result = await db.select().from(settings).where(eq(settings.key, key)).get();
    return result ? result.value : defaultValue;
  }

  public async getAllSettings(): Promise<Record<string, string>> {
    const all = await db.select().from(settings).all();
    const result: Record<string, string> = {};
    for (const s of all) {
      result[s.key] = s.value;
    }
    return result;
  }

  public async updateSetting(key: string, value: string): Promise<void> {
    const exists = await db.select().from(settings).where(eq(settings.key, key)).get();
    if (exists) {
      await db.update(settings).set({ value }).where(eq(settings.key, key)).run();
    } else {
      await db.insert(settings).values({ key, value }).run();
    }
  }

  public async updateMany(settingsMap: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(settingsMap)) {
      await this.updateSetting(key, value);
    }
  }
}
