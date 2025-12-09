import { ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';

export interface Command {
  name: string;
  description: string;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export interface RankInfo {
  rank: string;
  division: number;
  mmr: number;
  tier: number;
  iconUrl?: string;
}

export interface RocketLeagueRank {
  playerId: string;
  platform: string;
  duel1v1?: RankInfo;
  doubles2v2?: RankInfo;
  standard3v3?: RankInfo;
  tournament?: RankInfo;
}
