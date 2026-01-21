
import { Song } from '../types';

const DB_NAME = 'NebulaBeatsDB';
const STORE_NAME = 'songs';
const DB_VERSION = 1;

export class StorageService {
  private db: IDBDatabase | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  public async saveSong(file: File, isPreset: boolean): Promise<Song> {
    const db = await this.getDB();
    const song: Song = {
      id: crypto.randomUUID(),
      name: file.name,
      data: file,
      isPreset: isPreset
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(song);
      request.onsuccess = () => resolve(song);
      request.onerror = () => reject(request.error);
    });
  }

  public async getAllSongs(): Promise<Song[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async getPresetSong(): Promise<Song | null> {
    const songs = await this.getAllSongs();
    return songs.find(s => s.isPreset) || (songs.length > 0 ? songs[0] : null);
  }
}

export const storageService = new StorageService();
