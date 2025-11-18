import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { Command } from '../types.js';

export class BotClient extends Client {
  public commands: Collection<string, Command>;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
      ],
    });

    this.commands = new Collection();
  }
}
