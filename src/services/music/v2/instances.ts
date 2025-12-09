import { AudioManager } from './AudioManager.js';
import { SearchService } from './SearchService.js';

// Singleton instances shared across all commands
let audioManager: AudioManager | null = null;
let searchService: SearchService | null = null;

export function getAudioManager(): AudioManager {
  if (!audioManager) {
    audioManager = new AudioManager();
  }
  return audioManager;
}

export function getSearchService(): SearchService {
  if (!searchService) {
    searchService = new SearchService();
  }
  return searchService;
}
