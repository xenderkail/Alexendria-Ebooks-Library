import React, { useState, useEffect } from 'react';
import {
  BookRecord,
  BookFormat,
  deleteBook,
  formatBytes,
  getStorageEstimate,
} from '../services/db.ts';
import { downloadBlob } from '../services/converter.ts';
import {
  BookOpen,
  Trash2,
  Download,
  Search,
  HardDrive,
  Plus,
  Compass,
  ArrowUpDown,
  Clock,
  Sparkles,
} from 'lucide-react';

interface LibraryViewProps {
  books: BookRecord[];
  onOpenBook: (book: BookRecord) => void;
  onRefreshBooks: () => void;
  onOpenUploader: () => void;
  onOpenCatalog: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  onOpenBook,
  onRefreshBooks,
  onOpenUploader,
  onOpenCatalog,
}) => {
  const [filterFormat, setFilterFormat] = useState<string>('all');
  const [filterLang, setFilterLang] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'title' | 'author' | 'dateAdded' | 'lastRead' | 'progress'>('dateAdded');
  const [searchQuery, setSearchQuery] = useState('');
  const [storageInfo, setStorageInfo] = useState<{
    usageBytes: number;
    quotaBytes: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    getStorageEstimate().then(setStorageInfo);
  }, [books.length]);

  const handleDelete = async (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to remove this book from your local IndexedDB storage?')) {
      await deleteBook(bookId);
      onRefreshBooks();
    }
  };

  const handleExport = (e: React.MouseEvent, book: BookRecord) => {
    e.stopPropagation();
    const ext = book.format;
    const filename = `${book.title.replace(/\s+/g, '_')}.${ext}`;
    downloadBlob(book.fileBlob, filename);
  };

  // Filter & sort
  const filtered = books.filter((b) => {
    const matchesFormat = filterFormat === 'all' || b.format === filterFormat;
    const matchesLang = filterLang === 'all' || b.language === filterLang;
    const matchesQuery =
      searchQuery.trim() === '' ||
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFormat && matchesLang && matchesQuery;
  });

  filtered.sort((a, b) => {
    if (sortKey === 'title') return a.title.localeCompare(b.title);
    if (sortKey === 'author') return a.author.localeCompare(b.author);
    if (sortKey === 'lastRead') return (b.lastRead || 0) - (a.lastRead || 0);
    if (sortKey === 'progress') return (b.progress?.percentage || 0) - (a.progress?.percentage || 0);
    return b.dateAdded - a.dateAdded;
  });

  return (
    <div className="space-y-6">
      {/* Top Section with Storage Quota Monitor */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-medium text-stone-900">
            Personal Library
          </h2>
          <p className="text-xs text-stone-600 mt-1">
            Persistently preserved in browser IndexedDB. Zero cloud uploads.
          </p>
        </div>

        {/* Storage stats */}
        {storageInfo && (
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-2.5 px-3 flex items-center gap-3 text-xs text-stone-700">
            <HardDrive className="w-4 h-4 text-stone-400 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">IndexedDB Storage:</span>
                <span className="font-mono text-stone-900">
                  {formatBytes(storageInfo.usageBytes)}
                </span>
                {storageInfo.quotaBytes > 0 && (
                  <span className="text-stone-400">
                    of {formatBytes(storageInfo.quotaBytes)} quota
                  </span>
                )}
              </div>
              <div className="w-40 bg-stone-200 h-1 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="bg-amber-800 h-full"
                  style={{ width: `${Math.min(100, Math.max(2, storageInfo.percentage))}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Strip: Search, Filters, Sorters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search titles or authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Format Segmented Filter */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg">
            {['all', 'epub', 'pdf', 'txt', 'mobi'].map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFilterFormat(fmt)}
                className={`px-2.5 py-1 text-xs font-medium uppercase rounded-md transition-colors cursor-pointer ${
                  filterFormat === fmt
                    ? 'bg-white text-stone-900 shadow-2xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          {/* Language filter */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg">
            <button
              onClick={() => setFilterLang('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                filterLang === 'all'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All Lang
            </button>
            <button
              onClick={() => setFilterLang('ur')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                filterLang === 'ur'
                  ? 'bg-white text-stone-900 shadow-2xs font-urdu-nastaliq'
                  : 'text-stone-600 hover:text-stone-900 font-urdu-nastaliq'
              }`}
            >
              اردو
            </button>
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-1 border border-stone-200 bg-white rounded-lg px-2 py-1 text-xs text-stone-700">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as any)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="dateAdded">Recently Added</option>
              <option value="lastRead">Last Read</option>
              <option value="title">Title (A-Z)</option>
              <option value="author">Author (A-Z)</option>
              <option value="progress">Reading Progress</option>
            </select>
          </div>
        </div>
      </div>

      {/* Books Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((book) => {
            const hasProgress = (book.progress?.percentage || 0) > 0;

            return (
              <div
                key={book.id}
                onClick={() => onOpenBook(book)}
                className="bg-white border border-stone-200 hover:border-amber-800/40 rounded-xl p-5 flex flex-col justify-between transition-all hover:shadow-xs cursor-pointer group"
              >
                <div>
                  {/* Card Header & Title */}
                  <h3
                    className={`font-semibold text-stone-900 group-hover:text-amber-900 line-clamp-2 leading-snug mb-1 transition-colors ${
                      book.language === 'ur' ? 'font-urdu-nastaliq text-base text-right' : 'font-serif text-base'
                    }`}
                    dir={book.direction}
                  >
                    {book.title}
                  </h3>

                  <p
                    className={`text-xs text-stone-600 truncate mb-3 ${
                      book.language === 'ur' ? 'font-urdu-nastaliq text-right' : ''
                    }`}
                    dir={book.direction}
                  >
                    {book.author}
                  </p>

                  {/* Clean unboxed metadata discipline */}
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mb-3">
                    <span className="uppercase font-mono font-medium">{book.format}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatBytes(book.fileSize)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{book.genre || 'General'}</span>
                  </div>

                  {/* Reading Progress Indicator */}
                  <div className="mt-2 pt-2 border-t border-stone-100">
                    <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-400" />
                        {hasProgress ? `${book.progress.percentage}% Read` : 'Unread'}
                      </span>
                      {book.lastRead > 0 && (
                        <span className="text-[10px] text-stone-400">
                          {new Date(book.lastRead).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-800 h-full transition-all"
                        style={{ width: `${book.progress?.percentage || 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-amber-800 group-hover:underline flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" /> Read
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleExport(e, book)}
                      className="p-1.5 text-stone-400 hover:text-stone-800 rounded transition-colors"
                      title="Download file to computer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, book.id)}
                      className="p-1.5 text-stone-400 hover:text-red-600 rounded transition-colors"
                      title="Delete from IndexedDB"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border border-stone-200 rounded-xl p-12 text-center max-w-lg mx-auto">
          <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-lg font-serif font-medium text-stone-900 mb-1">
            Your IndexedDB Library is Ready
          </h3>
          <p className="text-xs text-stone-600 mb-6 leading-relaxed">
            Upload personal EPUB, PDF, TXT files or entire folders from your device, or add
            masterworks from the 10-genre public domain catalog.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onOpenUploader}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Import Local Books
            </button>
            <button
              onClick={onOpenCatalog}
              className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Compass className="w-4 h-4" /> Explore 100 Classics
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
