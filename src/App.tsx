import React, { useState, useEffect, useCallback } from 'react';
import { BookRecord, getAllBooks, saveBook } from './services/db.ts';
import { URDU_CLASSICS } from './services/urduTexts.ts';
import { TopBar, ActiveTab } from './components/TopBar.tsx';
import { LibraryView } from './components/LibraryView.tsx';
import { CatalogView } from './components/CatalogView.tsx';
import { RepositoryPortal } from './components/RepositoryPortal.tsx';
import { ConverterView } from './components/ConverterView.tsx';
import { UserGuide } from './components/UserGuide.tsx';
import { Uploader } from './components/Uploader.tsx';
import { Reader } from './components/Reader.tsx';
import { BookOpen, Compass, Search, FileCode, HelpCircle, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('library');
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [activeReadingBook, setActiveReadingBook] = useState<BookRecord | null>(null);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reload books from IndexedDB
  const refreshBooks = useCallback(async () => {
    try {
      const allBooks = await getAllBooks();
      setBooks(allBooks);
    } catch (err) {
      console.error('Failed to load books from IndexedDB:', err);
    }
  }, []);

  // Initial seeding if IndexedDB is completely empty
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        const existing = await getAllBooks();
        if (existing.length === 0) {
          // Seed 2 full classical works into IndexedDB
          const ghalib = URDU_CLASSICS[0];
          const ghalibText = ghalib.chapters
            .map((ch) => `=== ${ch.title} ===\n\n${ch.content}`)
            .join('\n\n\n');
          const ghalibBlob = new Blob([ghalibText], { type: 'text/plain;charset=utf-8' });

          const starterUrdu: BookRecord = {
            id: 'seed-diwan-ghalib',
            title: ghalib.title,
            author: ghalib.author,
            format: 'txt',
            fileSize: ghalibBlob.size,
            genre: 'Urdu Literature',
            language: 'ur',
            direction: 'rtl',
            description: ghalib.description,
            dateAdded: Date.now(),
            lastRead: 0,
            progress: {
              percentage: 0,
              location: 'sec_0',
              pageCurrent: 1,
              pageTotal: ghalib.chapters.length,
              updatedAt: Date.now(),
            },
            bookmarks: [],
            notes: [],
            fileBlob: ghalibBlob,
          };

          const meditationsText = `=== Book One: Debts and Lessons ===

1. From my grandfather Verus I learned good morals and the government of my temper.
2. From the reputation and remembrance of my father, modesty and a manly character.
3. From my mother, piety and beneficence, and abstinence, not only from evil deeds, but even from evil thoughts; and further, simplicity in my way of living, far removed from the habits of the rich.
4. From my great-grandfather, not to have frequented public schools, and to have had good teachers at home, and to know that on such things a man should spend liberally.

=== Book Two: On the River Granua ===

1. When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly. They are like this because they cannot distinguish good from evil. But I have seen the beauty of good, and the ugliness of evil, and have recognized that the wrongdoer has a nature related to my own—not of the same blood or birth, but the same mind, and possessing a share of the divine. And so none of them can hurt me. No one can implicate me in ugliness. Nor can I feel angry at my kin, or hate him. We were born to work together like feet, hands, and eyes, like the two rows of teeth, upper and lower. To obstruct each other is unnatural. To feel anger at someone, to turn your back on him: these are obstructions.`;

          const medBlob = new Blob([meditationsText], { type: 'text/plain;charset=utf-8' });

          const starterPhilosophy: BookRecord = {
            id: 'seed-meditations',
            title: 'Meditations',
            author: 'Marcus Aurelius',
            format: 'txt',
            fileSize: medBlob.size,
            genre: 'Philosophy',
            language: 'en',
            direction: 'ltr',
            description: 'Stoic personal journals on discipline, virtue, duty, and equanimity.',
            dateAdded: Date.now() - 10000,
            lastRead: 0,
            progress: {
              percentage: 0,
              location: 'sec_0',
              pageCurrent: 1,
              pageTotal: 2,
              updatedAt: Date.now(),
            },
            bookmarks: [],
            notes: [],
            fileBlob: medBlob,
          };

          await saveBook(starterUrdu);
          await saveBook(starterPhilosophy);
        }

        await refreshBooks();
      } catch (err) {
        console.error('Seeding error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeDatabase();
  }, [refreshBooks]);

  const handleOpenBook = (book: BookRecord) => {
    setActiveReadingBook(book);
  };

  const handleBookImported = (book: BookRecord, autoOpen = false) => {
    refreshBooks();
    if (autoOpen) {
      setActiveReadingBook(book);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-stone-900 flex flex-col font-sans">
      {/* Top Header */}
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenUploader={() => setIsUploaderOpen(true)}
        hasActiveBook={activeReadingBook !== null}
        onResumeBook={() => {
          if (activeReadingBook) {
            // Re-open reading view
            const currentBook = books.find((b) => b.id === activeReadingBook.id) || activeReadingBook;
            setActiveReadingBook(currentBook);
          }
        }}
      />

      {/* Main Body View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-12">
        {activeTab === 'library' && (
          <LibraryView
            books={books}
            onOpenBook={handleOpenBook}
            onRefreshBooks={refreshBooks}
            onOpenUploader={() => setIsUploaderOpen(true)}
            onOpenCatalog={() => setActiveTab('catalog')}
          />
        )}

        {activeTab === 'catalog' && (
          <CatalogView
            onOpenBook={handleOpenBook}
            onBookImported={(book) => handleBookImported(book, false)}
          />
        )}

        {activeTab === 'portal' && (
          <RepositoryPortal
            onBookImported={(book, autoOpen) => handleBookImported(book, autoOpen)}
          />
        )}

        {activeTab === 'converter' && (
          <ConverterView
            onBookImported={(book) => handleBookImported(book, false)}
          />
        )}

        {activeTab === 'guide' && <UserGuide />}
      </main>

      {/* Fullscreen Kindle-Style Reader Engine */}
      {activeReadingBook && (
        <Reader
          book={activeReadingBook}
          onClose={() => {
            setActiveReadingBook(null);
            refreshBooks();
          }}
          onUpdateBook={(updated) => {
            setActiveReadingBook(updated);
            refreshBooks();
          }}
        />
      )}

      {/* Upload Modal Drawer */}
      {isUploaderOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsUploaderOpen(false)}
              className="absolute right-4 top-4 z-10 p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <Uploader
              onUploadSuccess={() => {
                setIsUploaderOpen(false);
                refreshBooks();
                setActiveTab('library');
              }}
              onCancel={() => setIsUploaderOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#FBF9F5]/95 backdrop-blur-md border-t border-stone-200 z-30 flex items-center justify-around px-2 text-[10px]">
        <button
          onClick={() => setActiveTab('library')}
          className={`flex flex-col items-center gap-1 py-1 px-2 ${
            activeTab === 'library' ? 'text-amber-800 font-semibold' : 'text-stone-500'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Library</span>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex flex-col items-center gap-1 py-1 px-2 ${
            activeTab === 'catalog' ? 'text-amber-800 font-semibold' : 'text-stone-500'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Catalog</span>
        </button>

        <button
          onClick={() => setActiveTab('portal')}
          className={`flex flex-col items-center gap-1 py-1 px-2 ${
            activeTab === 'portal' ? 'text-amber-800 font-semibold' : 'text-stone-500'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Archives</span>
        </button>

        <button
          onClick={() => setActiveTab('converter')}
          className={`flex flex-col items-center gap-1 py-1 px-2 ${
            activeTab === 'converter' ? 'text-amber-800 font-semibold' : 'text-stone-500'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Converter</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`flex flex-col items-center gap-1 py-1 px-2 ${
            activeTab === 'guide' ? 'text-amber-800 font-semibold' : 'text-stone-500'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Guide</span>
        </button>
      </nav>
    </div>
  );
}
