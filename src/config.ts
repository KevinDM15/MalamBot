import dotenv from 'dotenv';

dotenv.config();

export const config = {
  discordToken: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  guildId: process.env.GUILD_ID || '',
  microserviceUrl: process.env.MICROSERVICE_URL || 'http://localhost:8080',

  // Spotify OAuth Configuration
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID || '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/callback/spotify',
  },

  // OAuth Server Configuration
  oauth: {
    port: parseInt(process.env.OAUTH_PORT || '3000'),
    enabled: process.env.OAUTH_ENABLED === 'true',
  },
};

if (!config.discordToken || !config.clientId) {
  throw new Error('Missing required environment variables: DISCORD_TOKEN, CLIENT_ID');
}
