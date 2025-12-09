import { GuildMember, TextBasedChannel } from 'discord.js';
import { Track, SearchResult } from 'discord-player';

export interface MusicPlayerConfig {
  leaveOnEmpty: boolean;
  leaveOnEmptyCooldown: number;
  leaveOnEnd: boolean;
  leaveOnEndCooldown: number;
  selfDeaf: boolean;
  volume: number;
}

export interface QueueMetadata {
  channel: TextBasedChannel;
  requestedBy: GuildMember;
}

export interface QueueItem {
  url: string;
  title: string;
  author: string;
  duration: string;
  requestedBy: string;
  thumbnail?: string;
}

export interface SearchResultInfo {
  result: SearchResult;
  isPlaylist: boolean;
  trackCount: number;
  firstTrack?: Track;
}

export interface PlayResultMessage {
  content: string;
  isPlaylist: boolean;
  track?: Track;
}
