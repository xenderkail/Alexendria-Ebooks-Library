import { openDB, DBSchema, IDBPDatabase } from 'idb';

export type BookFormat = 'epub' | 'pdf' | 'txt' | 'mobi' | 'html';
export type BookLanguage = 'en' | 'ur' | 'other';
export type ReadingDirection = 'ltr' | 'rtl';

export interface BookProgress {
  percentage: number; // 0 - 100
  location: string; // CFI string for EPUB, page string for PDF, character index for TXT
  pageCurrent?: number;
  pageTotal?: number;
  updatedAt: number;
}

export interface Bookmark {
  id: string;
  location: string;
  label: string;
  textSnippet?: string;
  createdAt: number;
}

export interface BookNote {
  id: string;
  location: string;
  text: string;
  color?: string;
  createdAt: number;
}

export interface BookRecord {
  id: string;
  title: string;
  author: string;
  format: BookFormat;
  fileSize: number;
  genre: string;
  language: BookLanguage;
  direction: ReadingDirection;
  coverUrl?: string;
  description?: string;
  dateAdded: number;
  lastRead: number;
  progress: BookProgress;
  bookmarks: Bookmark[];
  notes: BookNote[];
  fileBlob: Blob; // Persisted directly in IndexedDB
}

export interface ReaderSettings {
  theme: 'light' | 'dark' | 'sepia' | 'night';
  fontSize: number; // in pixels (e.g., 18)
  lineHeight: number; // multiplier (e.g., 1.8)
  fontFamily: 'serif' | 'sans' | 'mono' | 'urdu';
  rtlMode: boolean;
  spread: 'auto' | 'single' | 'double';
  marginWidth: 'compact' | 'normal' | 'wide';
}

interface AlexandriaDB extends DBSchema {
  books: {
    key: string;
    value: BookRecord;
    indexes: {
      'by-dateAdded': number;
      'by-lastRead': number;
      'by-genre': string;
      'by-format': string;
    };
  };
  settings: {
    key: string;
    value: ReaderSettings;
  };
}

const DB_NAME = 'AlexandriaLibraryDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AlexandriaDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<AlexandriaDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AlexandriaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('books')) {
          const bookStore = db.createObjectStore('books', { keyPath: 'id' });
          bookStore.createIndex('by-dateAdded', 'dateAdded');
          bookStore.createIndex('by-lastRead', 'lastRead');
          bookStore.createIndex('by-genre', 'genre');
          bookStore.createIndex('by-format', 'format');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Fetch all books stored locally in IndexedDB
 */
export async function getAllBooks(): Promise<BookRecord[]> {
  const db = await getDB();
  return db.getAll('books');
}

/**
 * Fetch a single book record by ID from IndexedDB
 */
export async function getBook(id: string): Promise<BookRecord | undefined> {
  const db = await getDB();
  return db.get('books', id);
}

/**
 * Save or update a book record in IndexedDB
 */
export async function saveBook(book: BookRecord): Promise<void> {
  const db = await getDB();
  await db.put('books', book);
}

/**
 * Delete a book from IndexedDB
 */
export async function deleteBook(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('books', id);
}

/**
 * Update reading progress of a book
 */
export async function updateProgress(id: string, progress: BookProgress): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('books', 'readwrite');
  const store = tx.objectStore('books');
  const book = await store.get(id);
  if (book) {
    book.progress = progress;
    book.lastRead = Date.now();
    await store.put(book);
  }
  await tx.done;
}

/**
 * Add a bookmark to a book
 */
export async function addBookmark(bookId: string, bookmark: Bookmark): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('books', 'readwrite');
  const store = tx.objectStore('books');
  const book = await store.get(bookId);
  if (book) {
    book.bookmarks = [...(book.bookmarks || []), bookmark];
    await store.put(book);
  }
  await tx.done;
}

/**
 * Remove a bookmark from a book
 */
export async function removeBookmark(bookId: string, bookmarkId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('books', 'readwrite');
  const store = tx.objectStore('books');
  const book = await store.get(bookId);
  if (book) {
    book.bookmarks = (book.bookmarks || []).filter((b) => b.id !== bookmarkId);
    await store.put(book);
  }
  await tx.done;
}

/**
 * Add or update reader settings in IndexedDB
 */
export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  theme: 'sepia',
  fontSize: 18,
  lineHeight: 1.8,
  fontFamily: 'serif',
  rtlMode: false,
  spread: 'auto',
  marginWidth: 'normal',
};

export async function getReaderSettings(): Promise<ReaderSettings> {
  const db = await getDB();
  const settings = await db.get('settings', 'user-reader-settings');
  return settings || DEFAULT_READER_SETTINGS;
}

export async function saveReaderSettings(settings: ReaderSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', settings, 'user-reader-settings');
}

/**
 * Query estimated persistent storage usage from the browser
 */
export async function getStorageEstimate(): Promise<{
  usageBytes: number;
  quotaBytes: number;
  percentage: number;
  bookCount: number;
}> {
  let usageBytes = 0;
  let quotaBytes = 0;

  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      usageBytes = estimate.usage || 0;
      quotaBytes = estimate.quota || 0;
    } catch (e) {
      console.warn('Storage estimate unavailable', e);
    }
  }

  const books = await getAllBooks();
  const calculatedBookBytes = books.reduce((acc, b) => acc + (b.fileSize || 0), 0);
  // If navigator.storage.estimate didn't return usage, fallback to book file sizes
  if (usageBytes === 0) {
    usageBytes = calculatedBookBytes;
  }

  const percentage = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;

  return {
    usageBytes,
    quotaBytes,
    percentage,
    bookCount: books.length,
  };
}

/**
 * Format bytes nicely into KB, MB, GB
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
