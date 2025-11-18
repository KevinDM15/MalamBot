import dotenv from 'dotenv';

dotenv.config();

export const config = {
  discordToken: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  guildId: process.env.GUILD_ID || '',
  microserviceUrl: process.env.MICROSERVICE_URL || 'http://localhost:8080',
};

if (!config.discordToken || !config.clientId) {
  throw new Error('Missing required environment variables');
}
