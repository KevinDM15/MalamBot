/**
 * @deprecated Usar MusicPlayer en lugar de MusicService
 * Este archivo se mantiene por compatibilidad pero redirige a la nueva implementación
 */
import { GuildMember } from 'discord.js';
import { BotClient } from '../core/client.js';
import { MusicPlayer } from './music/index.js';

export class MusicService {
  static async initManager(client: BotClient) {
    return await MusicPlayer.initialize(client);
  }

  static getManager() {
    return MusicPlayer.getInstance();
  }

  static async play(member: GuildMember, query: string, textChannelId: string): Promise<string> {
    const textChannel = member.client.channels.cache.get(textChannelId);
    if (!textChannel || !('send' in textChannel)) {
      throw new Error('Canal de texto inválido');
    }
    return await MusicPlayer.play(member, query, textChannel);
  }

  static skip(guildId: string): boolean {
    return MusicPlayer.skip(guildId);
  }

  static stop(guildId: string): void {
    MusicPlayer.stop(guildId);
  }

  static getQueue(guildId: string) {
    const queue = MusicPlayer.getQueue(guildId);
    if (!queue) return [];
    
    return queue.tracks.data.map((track) => ({
      url: track.url,
      title: track.title,
      requestedBy: track.requestedBy?.tag || 'Desconocido',
      duration: track.durationMS,
    }));
  }

  static isPlaying(guildId: string): boolean {
    return MusicPlayer.isPlaying(guildId);
  }
}

