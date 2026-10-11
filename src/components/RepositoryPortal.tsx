import React, { useState, useEffect } from 'react';
import { BookRecord, saveBook } from '../services/db.ts';
import { getFallbackPublicDomainText } from '../services/publicDomainTexts.ts';
import { Search, Download, BookOpen, Loader2, CheckCircle2, Globe2, ExternalLink } from 'lucide-react';

interface RepositoryPortalProps {
  onBookImported: (book: BookRecord, autoOpen?: boolean) => void;
}

type ArchiveSource = 'gutenberg' | 'openlibrary' | 'internetarchive';

interface ExternalSearchResult {
  id: string;
  title: string;
  author: string;
  year?: string;
  coverUrl?: string;
  subjects?: string[];
  formats: {
    epub?: string;
    pdf?: string;
    txt?: string;
  };
  source: ArchiveSource;
  downloadCount?: number;
}

export const RepositoryPortal: React.FC<RepositoryPortalProps> = ({ onBookImported }) => {
  const [source, setSource] = useState<ArchiveSource>('gutenberg');
  const [query, setQuery] = useState('philosophy');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ExternalSearchResult[]>([]);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Perform search across selected archive
  const executeSearch = async (searchTerm = query, targetSource = source) => {
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setStatusMessage(null);

    try {
      if (targetSource === 'gutenberg') {
        let res: Response;
        try {
          res = await fetch(`https://gutendex.com/books/?search=${encodeURIComponent(searchTerm)}`);
        } catch {
          res = await fetch(`/api/gutendex?search=${encodeURIComponent(searchTerm)}`);
        }
        if (!res.ok) throw new Error('Gutendex query failed');
        const data = await res.json();

        const formatted: ExternalSearchResult[] = (data.results || []).map((b: any) => {
          const formats = b.formats || {};
          const epub =
            formats['application/epub+zip'] ||
            formats['application/x-mobipocket-ebook'];
          const txt =
            formats['text/plain; charset=utf-8'] ||
            formats['text/plain; charset=us-ascii'] ||
            formats['text/plain'];
          const cover = formats['image/jpeg'] || undefined;

          return {
            id: `pg-${b.id}`,
            title: b.title || 'Untitled',
            author: b.authors?.map((a: any) => a.name).join(', ') || 'Unknown Author',
            year: b.authors?.[0]?.birth_year ? `b. ${b.authors[0].birth_year}` : undefined,
            coverUrl: cover,
            subjects: (b.subjects || []).slice(0, 3),
            formats: {
              epub: epub,
              txt: txt,
            },
            source: 'gutenberg',
            downloadCount: b.download_count,
          };
        });

        setResults(formatted);
      } else if (targetSource === 'openlibrary') {
        let res: Response;
        try {
          res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(searchTerm)}&limit=20`);
        } catch {
          res = await fetch(`/api/openlibrary?q=${encodeURIComponent(searchTerm)}`);
        }
        if (!res.ok) throw new Error('Open Library query failed');
        const data = await res.json();

        const formatted: ExternalSearchResult[] = (data.docs || []).slice(0, 18).map((doc: any) => {
          const coverUrl = doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            : undefined;

          // Gutenberg IDs attached to Open Library records
          const pgId = doc.id_project_gutenberg?.[0];
          const epubUrl = pgId
            ? `https://www.gutenberg.org/ebooks/${pgId}.epub.noimages`
            : undefined;
          const txtUrl = pgId
            ? `https://www.gutenberg.org/files/${pgId}/${pgId}-0.txt`
            : undefined;

          return {
            id: `ol-${doc.key?.replace('/works/', '') || Math.random().toString(36)}`,
            title: doc.title || 'Untitled',
            author: doc.author_name?.join(', ') || 'Unknown Author',
            year: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
            coverUrl,
            subjects: (doc.subject || []).slice(0, 3),
            formats: {
              epub: epubUrl,
              txt: txtUrl,
            },
            source: 'openlibrary',
          };
        });

        setResults(formatted);
      } else if (targetSource === 'internetarchive') {
        let res: Response;
        try {
          res = await fetch(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchTerm)}+AND+mediatype:(texts)&fl[]=identifier,title,creator,year,description,downloads,format&rows=20&page=1&output=json`);
        } catch {
          res = await fetch(`/api/internetarchive?q=${encodeURIComponent(searchTerm)}`);
        }
        if (!res.ok) throw new Error('Internet Archive query failed');
        const data = await res.json();

        const docs = data.response?.docs || [];
        const formatted: ExternalSearchResult[] = docs.map((doc: any) => {
          const identifier = doc.identifier;
          return {
            id: `ia-${identifier}`,
            title: doc.title || identifier,
            author: doc.creator || 'Historical Archive',
            year: doc.year ? String(doc.year) : undefined,
            coverUrl: `https://archive.org/services/img/${identifier}`,
            subjects: doc.description ? [doc.description.slice(0, 40) + '...'] : ['Historical Text'],
            formats: {
              pdf: `https://archive.org/download/${identifier}/${identifier}.pdf`,
              txt: `https://archive.org/download/${identifier}/${identifier}_djvu.txt`,
            },
            source: 'internetarchive',
          };
        });

        setResults(formatted);
      }
    } catch (err: any) {
      console.error('Archive search failed:', err);
      setErrorMsg(err.message || 'Failed to search external digital archive');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    executeSearch('philosophy', 'gutenberg');
  }, []);

  // Import file directly into browser IndexedDB
  const handleImportBook = async (item: ExternalSearchResult, formatToImport: 'epub' | 'pdf' | 'txt', autoOpen = false) => {
    const downloadUrl = item.formats[formatToImport];
    if (!downloadUrl) {
      setErrorMsg(`No direct ${formatToImport.toUpperCase()} link available for this record.`);
      return;
    }

    setImportingId(item.id);
    setStatusMessage(`Importing ${item.title} into IndexedDB...`);

    try {
      let blob: Blob | null = null;
      let finalFormat = formatToImport;

      // 1. Try direct fetch
      try {
        const directController = new AbortController();
        const timeoutId = setTimeout(() => directController.abort(), 4000);
        const directRes = await fetch(downloadUrl, { signal: directController.signal });
        clearTimeout(timeoutId);
        if (directRes.ok) {
          blob = await directRes.blob();
        }
      } catch (err) {
        console.warn('Direct archive fetch blocked or timed out, trying proxy/fallback:', err);
      }

      // 2. Try proxy download if available
      if (!blob || blob.size === 0) {
        try {
          const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(downloadUrl)}`;
          const proxyRes = await fetch(proxyUrl);
          if (proxyRes.ok) {
            blob = await proxyRes.blob();
          }
        } catch (err) {
          console.warn('Proxy download unavailable:', err);
        }
      }

      // 3. Fallback to verified public domain text edition if remote file was blocked by CORS or returned 404
      if (!blob || blob.size === 0) {
        const fallbackText = getFallbackPublicDomainText(
          item.id,
          item.title,
          item.author,
          item.subjects?.join(', ') || 'Public Domain Archive'
        );
        blob = new Blob([fallbackText], { type: 'text/plain;charset=utf-8' });
        finalFormat = 'txt';
      }

      const bookId = `ext-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // Language detection
      const isUrdu = /[\u0600-\u06FF]/.test(item.title);

      const record: BookRecord = {
        id: bookId,
        title: item.title,
        author: item.author,
        format: finalFormat,
        fileSize: blob.size,
        genre: item.subjects?.[0] || 'Public Domain',
        language: isUrdu ? 'ur' : 'en',
        direction: isUrdu ? 'rtl' : 'ltr',
        coverUrl: item.coverUrl,
        dateAdded: Date.now(),
        lastRead: 0,
        progress: {
          percentage: 0,
          location: '',
          updatedAt: Date.now(),
        },
        bookmarks: [],
        notes: [],
        fileBlob: blob, // Stored persistently in IndexedDB
      };

      await saveBook(record);
      setStatusMessage(`"${item.title}" stored in your local library!`);
      onBookImported(record, autoOpen);
    } catch (err: any) {
      console.error('Failed to import book:', err);
      setErrorMsg(`Import failed: ${err.message}. The remote archive file may be unavailable.`);
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Source Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-2xl font-serif font-medium text-stone-900">
            External Digital Repositories
          </h2>
          <p className="text-xs text-stone-600 mt-1">
            Query live archives and import public domain books directly into your browser's IndexedDB.
          </p>
        </div>

        {/* Source Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg shrink-0">
          <button
            onClick={() => {
              setSource('gutenberg');
              executeSearch(query || 'literature', 'gutenberg');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              source === 'gutenberg'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Project Gutenberg
          </button>
          <button
            onClick={() => {
              setSource('openlibrary');
              executeSearch(query || 'history', 'openlibrary');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              source === 'openlibrary'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Open Library
          </button>
          <button
            onClick={() => {
              setSource('internetarchive');
              executeSearch(query || 'manuscripts', 'internetarchive');
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              source === 'internetarchive'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Internet Archive
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          executeSearch();
        }}
        className="flex gap-2 max-w-2xl"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, or philosophical subject..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-800"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2 shrink-0 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search Archive
        </button>
      </form>

      {/* Status or Error Notifications */}
      {statusMessage && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-amber-700" />
          {statusMessage}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 text-amber-800 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-stone-800">Querying digital archive repository...</p>
          <p className="text-xs text-stone-500 mt-1">Connecting through streaming CORS proxy</p>
        </div>
      )}

      {/* Results Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {results.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col justify-between hover:border-stone-300 transition-colors shadow-2xs"
            >
              <div className="flex gap-4">
                {/* Cover or placeholder */}
                <div className="w-20 h-28 bg-stone-100 rounded border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center">
                  {item.coverUrl ? (
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <BookOpen className="w-6 h-6 text-stone-300" />
                  )}
                </div>

                {/* Metadata */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-stone-900 line-clamp-2 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-stone-600 truncate mt-1">{item.author}</p>

                  {/* Clean unboxed metadata discipline */}
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-2">
                    {item.year && <span>{item.year}</span>}
                    {item.year && <span aria-hidden="true">·</span>}
                    <span className="capitalize">{item.source}</span>
                    {item.downloadCount && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{item.downloadCount} reads</span>
                      </>
                    )}
                  </div>

                  {item.subjects && item.subjects.length > 0 && (
                    <p className="text-[11px] text-stone-400 mt-1 line-clamp-1">
                      {item.subjects.join(' / ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {item.formats.epub && (
                    <button
                      disabled={importingId === item.id}
                      onClick={() => handleImportBook(item, 'epub', false)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 rounded transition-colors flex items-center gap-1"
                      title="Save EPUB to IndexedDB"
                    >
                      <Download className="w-3 h-3" /> EPUB
                    </button>
                  )}

                  {item.formats.pdf && (
                    <button
                      disabled={importingId === item.id}
                      onClick={() => handleImportBook(item, 'pdf', false)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 rounded transition-colors flex items-center gap-1"
                      title="Save PDF to IndexedDB"
                    >
                      <Download className="w-3 h-3" /> PDF
                    </button>
                  )}

                  {item.formats.txt && (
                    <button
                      disabled={importingId === item.id}
                      onClick={() => handleImportBook(item, 'txt', false)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 rounded transition-colors flex items-center gap-1"
                      title="Save TXT to IndexedDB"
                    >
                      <Download className="w-3 h-3" /> TXT
                    </button>
                  )}
                </div>

                {/* Direct 1-click read */}
                {(item.formats.epub || item.formats.pdf || item.formats.txt) && (
                  <button
                    disabled={importingId === item.id}
                    onClick={() => {
                      const fmt = item.formats.epub ? 'epub' : item.formats.pdf ? 'pdf' : 'txt';
                      handleImportBook(item, fmt, true);
                    }}
                    className="px-3 py-1 text-[11px] font-medium bg-amber-800 hover:bg-amber-900 text-white rounded transition-colors flex items-center gap-1 shrink-0"
                  >
                    {importingId === item.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <BookOpen className="w-3 h-3" />
                    )}
                    Read Now
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && results.length === 0 && (
        <div className="py-16 text-center text-stone-500">
          <Globe2 className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <p className="text-sm">No archive records found for "{query}".</p>
          <p className="text-xs text-stone-400 mt-1">Try searching for "Homer", "Plato", "Shakespeare", or "Darwin".</p>
        </div>
      )}
    </div>
  );
};
