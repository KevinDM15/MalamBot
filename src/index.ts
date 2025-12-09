import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import { BotClient } from './core/client.js';
import { Logger } from './core/logger.js';
import { OAuthServer } from './services/oauth/OAuthServer.js';
import * as pingCommand from './commands/utility/ping.js';
import * as playCommand from './commands/music/play.js';
import * as skipCommand from './commands/music/skip.js';
import * as stopCommand from './commands/music/stop.js';
import * as queueCommand from './commands/music/queue.js';
import * as rankCommand from './commands/rocketleague/rank.js';
import * as readyEvent from './events/ready.js';
import * as interactionCreateEvent from './events/interactionCreate.js';

const client = new BotClient();
let oauthServer: OAuthServer | null = null;

client.commands.set(pingCommand.ping.name, pingCommand.ping);
client.commands.set(playCommand.play.name, playCommand.play);
client.commands.set(skipCommand.skip.name, skipCommand.skip);
client.commands.set(stopCommand.stop.name, stopCommand.stop);
client.commands.set(queueCommand.queue.name, queueCommand.queue);
client.commands.set(rankCommand.rank.name, rankCommand.rank);

client.once(readyEvent.name, () => {
  readyEvent.execute(client);
});

client.on(interactionCreateEvent.name, interactionCreateEvent.execute);

async function registerCommands() {
  const commands = [
    pingCommand.data,
    playCommand.data,
    skipCommand.data,
    stopCommand.data,
    queueCommand.data,
    rankCommand.data,
  ].map((command) => command.toJSON());

  const rest = new REST().setToken(config.discordToken);

  try {
    Logger.info('Registrando comandos slash...');

    if (config.guildId) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
        body: commands,
      });
      Logger.info('✅ Comandos registrados en el servidor de desarrollo');
    } else {
      await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
      Logger.info('✅ Comandos registrados globalmente');
    }
  } catch (error) {
    Logger.error('Error registrando comandos', error as Error);
  }
}

async function start() {
  try {
    // Iniciar servidor OAuth si está habilitado
    if (config.oauth.enabled) {
      oauthServer = new OAuthServer();
      oauthServer.start();
      Logger.info(`✅ Servidor OAuth disponible en http://localhost:${config.oauth.port}`);
    }

    await registerCommands();
    await client.login(config.discordToken);
  } catch (error) {
    Logger.error('Error iniciando el bot', error as Error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGINT', () => {
  Logger.info('Recibida señal SIGINT, cerrando...');
  if (oauthServer) {
    oauthServer.stop();
  }
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  Logger.info('Recibida señal SIGTERM, cerrando...');
  if (oauthServer) {
    oauthServer.stop();
  }
  client.destroy();
  process.exit(0);
});
