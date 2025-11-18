import { CommandInteraction } from 'discord.js';

export interface Command {
  name: string;
  description: string;
  execute: (interaction: CommandInteraction) => Promise<void>;
}

export interface RocketLeagueRank {
  playerId: string;
  rank: string;
  division: number;
  mmr: number;
}
