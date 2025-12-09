import { VoiceConnection, AudioPlayer } from '@discordjs/voice';
import { TextChannel, NewsChannel, User } from 'discord.js';
import type { ChildProcess } from 'child_process';

export type LoopMode = 'off' | 'track' | 'queue';
export type MusicTextChannel = TextChannel | NewsChannel;

export interface Song {
  title: string;
  url: string;
  duration: string;
  thumbnail: string;
  author: string;
  requestedBy: User;
  source: 'youtube' | 'spotify' | 'soundcloud';
}

export interface ServerQueue {
  textChannel: MusicTextChannel;
  voiceConnection: VoiceConnection;
  audioPlayer: AudioPlayer;
  songs: Song[];
  volume: number;
  playing: boolean;
  loop: LoopMode;
  currentSongStartTime?: number; // Timestamp when current song started
  currentProcess?: ChildProcess; // Current youtube-dl process
  inactivityTimer?: NodeJS.Timeout; // Timer for auto-disconnect
}

export interface QueueManager {
  get(guildId: string): ServerQueue | undefined;
  set(guildId: string, queue: ServerQueue): void;
  delete(guildId: string): void;
}
