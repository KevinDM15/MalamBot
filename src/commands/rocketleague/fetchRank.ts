import { config } from '../../config.js';
import { RocketLeagueRank } from '../../types.js';

export async function fetchRank(playerId: string): Promise<RocketLeagueRank> {
  try {
    const response = await fetch(`${config.microserviceUrl}/rl/rank/${playerId}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Failed to fetch rank: ${response.statusText}`);
    }

    const data = await response.json();
    return data as RocketLeagueRank;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error desconocido al obtener el rango del jugador');
  }
}
