import { Events } from 'discord.js';
import { BotClient } from '../core/client.js';
import { Logger } from '../core/logger.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: BotClient) {
  Logger.info(`✅ Bot iniciado como ${client.user?.tag}`);
  Logger.info(`🔧 Conectado a ${client.guilds.cache.size} servidor(es)`);
}
