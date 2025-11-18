import { config } from '../config.js';
import { RocketLeagueRank } from '../types.js';

export async function fetchRank(playerId: string): Promise<RocketLeagueRank> {
  try {
    const response = await fetch(`${config.microserviceUrl}/rl/rank/${playerId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch rank: ${response.statusText}`);
    }

    const data = await response.json();
    return data as RocketLeagueRank;
  } catch (error) {
    console.error('Error fetching rank from microservice:', error);
    throw error;
  }
}
