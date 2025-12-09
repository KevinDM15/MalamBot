export enum MusicPlatform {
  YOUTUBE = 'youtube',
  SPOTIFY = 'spotify',
  SOUNDCLOUD = 'soundcloud',
  UNKNOWN = 'unknown',
}

export enum ContentType {
  VIDEO = 'video',
  PLAYLIST = 'playlist',
  ALBUM = 'album',
  TRACK = 'track',
  UNKNOWN = 'unknown',
}

export interface UrlInfo {
  platform: MusicPlatform;
  url: string;
  isValid: boolean;
  contentType?: ContentType;
}

/**
 * Detector de URLs de plataformas de música
 * Soporta YouTube, Spotify y SoundCloud
 */
export class UrlDetector {
  private static readonly YOUTUBE_PATTERNS = [
    // Videos estándar
    { pattern: /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+(&.*)?$/, type: ContentType.VIDEO },
    { pattern: /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]+(\?.*)?$/, type: ContentType.VIDEO },
    // Playlists
    { pattern: /^(https?:\/\/)?(www\.)?youtube\.com\/playlist\?list=[\w-]+(&.*)?$/, type: ContentType.PLAYLIST },
    // Video con playlist
    { pattern: /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?.*list=[\w-]+.*$/, type: ContentType.PLAYLIST },
    // Shorts
    { pattern: /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+(\?.*)?$/, type: ContentType.VIDEO },
    // Formato mobile
    { pattern: /^(https?:\/\/)?m\.youtube\.com\/watch\?v=[\w-]+(&.*)?$/, type: ContentType.VIDEO },
  ];

  private static readonly SPOTIFY_PATTERNS = [
    // Track
    { pattern: /^(https?:\/\/)?(www\.)?open\.spotify\.com\/track\/[\w]+(\?.*)?$/, type: ContentType.TRACK },
    // Playlist
    { pattern: /^(https?:\/\/)?(www\.)?open\.spotify\.com\/playlist\/[\w]+(\?.*)?$/, type: ContentType.PLAYLIST },
    // Album
    { pattern: /^(https?:\/\/)?(www\.)?open\.spotify\.com\/album\/[\w]+(\?.*)?$/, type: ContentType.ALBUM },
    // Artist (tratado como playlist)
    { pattern: /^(https?:\/\/)?(www\.)?open\.spotify\.com\/artist\/[\w]+(\?.*)?$/, type: ContentType.PLAYLIST },
    // URI format: spotify:track:xxx
    { pattern: /^spotify:track:[\w]+$/, type: ContentType.TRACK },
    { pattern: /^spotify:playlist:[\w]+$/, type: ContentType.PLAYLIST },
    { pattern: /^spotify:album:[\w]+$/, type: ContentType.ALBUM },
  ];

  private static readonly SOUNDCLOUD_PATTERNS = [
    { pattern: /^(https?:\/\/)?(www\.)?soundcloud\.com\/[\w-]+\/[\w-]+(\?.*)?$/, type: ContentType.TRACK },
    { pattern: /^(https?:\/\/)?(www\.)?soundcloud\.com\/[\w-]+\/sets\/[\w-]+(\?.*)?$/, type: ContentType.PLAYLIST },
  ];

  /**
   * Detecta la plataforma y tipo de contenido de una URL o query
   */
  static detect(input: string): UrlInfo {
    const trimmedInput = input.trim();

    // Verificar YouTube
    const youtubeResult = this.matchPatterns(trimmedInput, this.YOUTUBE_PATTERNS);
    if (youtubeResult) {
      return {
        platform: MusicPlatform.YOUTUBE,
        url: trimmedInput,
        isValid: true,
        contentType: youtubeResult,
      };
    }

    // Verificar Spotify
    const spotifyResult = this.matchPatterns(trimmedInput, this.SPOTIFY_PATTERNS);
    if (spotifyResult) {
      return {
        platform: MusicPlatform.SPOTIFY,
        url: trimmedInput,
        isValid: true,
        contentType: spotifyResult,
      };
    }

    // Verificar SoundCloud
    const soundcloudResult = this.matchPatterns(trimmedInput, this.SOUNDCLOUD_PATTERNS);
    if (soundcloudResult) {
      return {
        platform: MusicPlatform.SOUNDCLOUD,
        url: trimmedInput,
        isValid: true,
        contentType: soundcloudResult,
      };
    }

    // No es una URL válida, probablemente es una búsqueda
    return {
      platform: MusicPlatform.UNKNOWN,
      url: trimmedInput,
      isValid: false,
      contentType: ContentType.UNKNOWN,
    };
  }

  /**
   * Verifica si es una URL (no una búsqueda por texto)
   */
  static isUrl(input: string): boolean {
    const urlPattern = /^(https?:\/\/|www\.|spotify:)/i;
    return urlPattern.test(input.trim());
  }

  /**
   * Verifica si es una URL de YouTube
   */
  static isYouTubeUrl(url: string): boolean {
    return this.matchPatterns(url, this.YOUTUBE_PATTERNS) !== null;
  }

  /**
   * Verifica si es una URL de Spotify
   */
  static isSpotifyUrl(url: string): boolean {
    return this.matchPatterns(url, this.SPOTIFY_PATTERNS) !== null;
  }

  /**
   * Verifica si es una URL de SoundCloud
   */
  static isSoundCloudUrl(url: string): boolean {
    return this.matchPatterns(url, this.SOUNDCLOUD_PATTERNS) !== null;
  }

  /**
   * Extrae el ID del video/track de una URL
   */
  static extractId(url: string, platform: MusicPlatform): string | null {
    switch (platform) {
      case MusicPlatform.YOUTUBE: {
        const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([^&?/]+)/);
        return match ? match[1] : null;
      }
      case MusicPlatform.SPOTIFY: {
        const match = url.match(/(?:track|playlist|album)\/([^?]+)/);
        return match ? match[1] : null;
      }
      case MusicPlatform.SOUNDCLOUD: {
        const match = url.match(/soundcloud\.com\/([\w-]+)\/([\w-]+)/);
        return match ? `${match[1]}/${match[2]}` : null;
      }
      default:
        return null;
    }
  }

  /**
   * Valida que una búsqueda de texto sea válida
   */
  static isValidSearchQuery(query: string): boolean {
    const trimmed = query.trim();
    return (
      trimmed.length > 0 &&
      trimmed.length <= 500 &&
      !this.isUrl(trimmed)
    );
  }

  /**
   * Helper para matchear patrones
   */
  private static matchPatterns(
    input: string,
    patterns: Array<{ pattern: RegExp; type: ContentType }>
  ): ContentType | null {
    for (const { pattern, type } of patterns) {
      if (pattern.test(input)) {
        return type;
      }
    }
    return null;
  }
}
