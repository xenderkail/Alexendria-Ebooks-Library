import React, { useState } from 'react';
import {
  CATALOG_GENRES,
  CatalogGenre,
  PUBLIC_DOMAIN_CATALOG,
  CatalogBook,
} from '../services/catalogData.ts';
import { URDU_CLASSICS } from '../services/urduTexts.ts';
import { getFallbackPublicDomainText } from '../services/publicDomainTexts.ts';
import { fetchPublicDomainBook } from '../services/bookFetcher.ts';
import { BookRecord, saveBook } from '../services/db.ts';
import { BookOpen, Download, Search, Loader2, Sparkles } from 'lucide-react';

interface CatalogViewProps {
  onOpenBook: (book: BookRecord) => void;
  onBookImported: (book: BookRecord) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({ onOpenBook, onBookImported }) => {
  const [activeGenre, setActiveGenre] = useState<CatalogGenre>('Urdu Literature');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingBookId, setLoadingBookId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Filter books by active genre and search term
  const filteredBooks = PUBLIC_DOMAIN_CATALOG.filter((b) => {
    const matchesGenre = b.genre === activeGenre;
    const matchesSearch =
      searchTerm.trim() === '' ||
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesGenre && matchesSearch;
  });

  // Handler to load book content and prepare BookRecord
  const prepareBookRecord = async (catBook: CatalogBook): Promise<BookRecord> => {
    // 1. Urdu Classics: load embedded authentic texts
    if (catBook.language === 'ur') {
      const urduEntry = URDU_CLASSICS.find(
        (u) =>
          u.id.includes(catBook.id.replace('urdu-', '')) ||
          catBook.title.includes(u.titleUrdu) ||
          catBook.title.includes(u.title)
      );

      let textContent = '';
      if (urduEntry) {
        textContent = urduEntry.chapters
          .map((ch) => `=== ${ch.title} ===\n\n${ch.content}`)
          .join('\n\n\n');
      } else {
        textContent = getFallbackPublicDomainText(catBook.id, catBook.title, catBook.author, catBook.description);
      }

      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
      return {
        id: `cat-${catBook.id}`,
        title: catBook.title,
        author: catBook.author,
        format: 'txt',
        fileSize: blob.size,
        genre: catBook.genre,
        language: 'ur',
        direction: 'rtl',
        description: catBook.description,
        dateAdded: Date.now(),
        lastRead: 0,
        progress: {
          percentage: 0,
          location: '',
          pageCurrent: 1,
          updatedAt: Date.now(),
        },
        bookmarks: [],
        notes: [],
        fileBlob: blob,
      };
    }

    // 2. English / Public domain books: fetch dynamically via Gutendex with public CORS proxies
    const fetchResult = await fetchPublicDomainBook({
      id: catBook.id,
      title: catBook.title,
      author: catBook.author,
      description: catBook.description,
      gutenbergId: catBook.gutenbergId,
      staticEpubUrl: catBook.epubUrl,
      staticTextUrl: catBook.textUrl,
    });

    if (fetchResult.isFallback && fetchResult.fallbackMessage) {
      setStatusMsg(fetchResult.fallbackMessage);
    }

    return {
      id: `cat-${catBook.id}`,
      title: catBook.title,
      author: catBook.author,
      format: fetchResult.format,
      fileSize: fetchResult.blob.size,
      genre: catBook.genre,
      language: catBook.language,
      direction: catBook.direction,
      description: fetchResult.isFallback
        ? `${fetchResult.fallbackMessage}\n\n${catBook.description}`
        : catBook.description,
      dateAdded: Date.now(),
      lastRead: 0,
      progress: {
        percentage: 0,
        location: '',
        pageCurrent: 1,
        updatedAt: Date.now(),
      },
      bookmarks: [],
      notes: [],
      fileBlob: fetchResult.blob,
    };
  };

  const handleReadNow = async (catBook: CatalogBook) => {
    setLoadingBookId(catBook.id);
    setStatusMsg(`Loading full text for "${catBook.title}"...`);

    try {
      const bookRecord = await prepareBookRecord(catBook);
      await saveBook(bookRecord);
      onBookImported(bookRecord);
      onOpenBook(bookRecord);
    } catch (err: any) {
      console.error('Error opening catalog book:', err);
      setStatusMsg(`Could not stream book: ${err.message}`);
    } finally {
      setLoadingBookId(null);
    }
  };

  const handleSaveToLibrary = async (catBook: CatalogBook) => {
    setLoadingBookId(catBook.id);
    setStatusMsg(`Saving "${catBook.title}" to IndexedDB...`);

    try {
      const bookRecord = await prepareBookRecord(catBook);
      await saveBook(bookRecord);
      onBookImported(bookRecord);
      setStatusMsg(`Saved "${catBook.title}" to My Library!`);
    } catch (err: any) {
      console.error('Error saving book:', err);
      setStatusMsg(`Failed to save: ${err.message}`);
    } finally {
      setLoadingBookId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <span className="text-xs uppercase tracking-widest text-amber-800 font-medium">
            Curated Public Domain Heritage
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-medium text-stone-900 mt-1">
            Universal Classical Catalog
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-xl">
            100 complete literary works spanning 10 genres. Complete texts with Nastaliq Urdu typography,
            Homeric epics, philosophical treatises, and scientific milestones.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search catalog titles or authors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-800"
          />
        </div>
      </div>

      {/* 10 Genres Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {CATALOG_GENRES.map((genre) => (
          <button
            key={genre}
            onClick={() => setActiveGenre(genre)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              activeGenre === genre
                ? 'bg-amber-800 text-white font-semibold shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Atmospheric Banner for Urdu Literature or Classical Heritage */}
      {activeGenre === 'Urdu Literature' && (
        <div className="relative rounded-xl overflow-hidden border border-amber-900/20 bg-[#F5EFE6] p-6 flex flex-col md:flex-row items-center gap-6">
          <div className="w-full md:w-1/3 h-48 rounded-lg overflow-hidden shrink-0 shadow-sm border border-stone-300">
            <img
              src="/src/assets/images/urdu_calligraphy_manuscript_1791727621083.jpg"
              alt="Urdu Calligraphy Manuscript"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 text-right" dir="rtl">
            <span className="text-xs font-mono text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded">
              اردو ادبی ورثہ
            </span>
            <h3 className="text-2xl font-urdu-nastaliq font-bold text-stone-900 mt-2 mb-1">
              دیوانِ غالب، اقبال اور کلاسیکی ادب
            </h3>
            <p className="text-xs font-serif text-stone-700 leading-relaxed max-w-xl">
              کلاسیکی اردو شاعری اور نثری شاہکار مکمل خطِ نستعلیق اور دائیں سے بائیں (RTL) قرأت کے
              ساتھ۔ مرزا اسد اللہ خان غالب، علامہ محمد اقبال، میر تقی میر اور منشی پریم چند کے
              شاہکار فوراً پڑھیں۔
            </p>
          </div>
        </div>
      )}

      {/* Feedback status */}
      {statusMsg && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg(null)} className="text-amber-700 hover:text-amber-950">
            Dismiss
          </button>
        </div>
      )}

      {/* Book Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBooks.map((book) => {
          const isLoading = loadingBookId === book.id;

          return (
            <div
              key={book.id}
              className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col justify-between hover:border-stone-300 transition-colors shadow-2xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3
                    className={`font-semibold text-stone-900 leading-snug ${
                      book.language === 'ur'
                        ? 'font-urdu-nastaliq text-lg text-right w-full'
                        : 'font-serif text-base'
                    }`}
                    dir={book.direction}
                  >
                    {book.title}
                  </h3>
                </div>

                <div
                  className={`text-xs text-stone-600 mb-3 ${
                    book.language === 'ur' ? 'font-urdu-nastaliq text-right' : ''
                  }`}
                  dir={book.direction}
                >
                  By {book.author}
                </div>

                {/* Zero-Pill Unboxed Metadata */}
                <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mb-3">
                  <span>{book.year}</span>
                  <span aria-hidden="true">·</span>
                  <span>{book.genre}</span>
                  <span aria-hidden="true">·</span>
                  <span className="uppercase">{book.language === 'ur' ? 'Urdu RTL' : 'English'}</span>
                </div>

                <p
                  className="text-xs text-stone-600 line-clamp-3 leading-relaxed"
                  dir={book.direction}
                >
                  {book.description}
                </p>
              </div>

              {/* Action buttons */}
              <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                <button
                  disabled={isLoading}
                  onClick={() => handleSaveToLibrary(book)}
                  className="px-3 py-1.5 text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Store in IndexedDB without opening"
                >
                  <Download className="w-3.5 h-3.5" /> Save to Library
                </button>

                <button
                  disabled={isLoading}
                  onClick={() => handleReadNow(book)}
                  className="px-3.5 py-1.5 text-xs font-medium bg-amber-800 hover:bg-amber-900 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <BookOpen className="w-3.5 h-3.5" />
                  )}
                  Read Now
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredBooks.length === 0 && (
        <div className="py-16 text-center text-stone-500">
          <p className="text-sm">No books found matching "{searchTerm}" in {activeGenre}.</p>
        </div>
      )}
    </div>
  );
};
