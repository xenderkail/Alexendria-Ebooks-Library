import React, { useEffect, useRef, useState, useCallback } from 'react';
import ePub, { Book, Rendition, NavItem } from 'epubjs';
import { pdfjsLib } from '../services/pdfWorker.ts';
import { getFallbackPublicDomainText } from '../services/publicDomainTexts.ts';
import {
  BookRecord,
  ReaderSettings,
  updateProgress,
  addBookmark,
  removeBookmark,
  Bookmark,
  DEFAULT_READER_SETTINGS,
} from '../services/db.ts';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Bookmark as BookmarkIcon,
  Settings,
  List,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  BookOpen,
  AlignLeft,
  FileText,
} from 'lucide-react';

interface ReaderProps {
  book: BookRecord;
  onClose: () => void;
  onUpdateBook?: (updatedBook: BookRecord) => void;
}

export const Reader: React.FC<ReaderProps> = ({ book, onClose, onUpdateBook }) => {
  // Theme & Appearance State
  const [settings, setSettings] = useState<ReaderSettings>({
    ...DEFAULT_READER_SETTINGS,
    fontFamily: book.language === 'ur' ? 'urdu' : 'serif',
    rtlMode: book.direction === 'rtl',
  });

  // UI Drawer states
  const [showToc, setShowToc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Common Reader State
  const [percentage, setPercentage] = useState<number>(0);
  const [currentLocationLabel, setCurrentLocationLabel] = useState<string>('Page 1');
  const [tocItems, setTocItems] = useState<NavItem[]>([]);
  const [activeTocHref, setActiveTocHref] = useState<string>('');
  const [bookRecord, setBookRecord] = useState<BookRecord>(book);

  // EPUB specifics
  const epubContainerRef = useRef<HTMLDivElement>(null);
  const epubBookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const [isEpubReady, setIsEpubReady] = useState(false);

  // PDF specifics
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);
  const [pdfPage, setPdfPage] = useState<number>(1);
  const [pdfTotalPages, setPdfTotalPages] = useState<number>(book.progress?.pageTotal || 1);
  const [pdfScale, setPdfScale] = useState<number>(1.2);
  const [isPdfRendering, setIsPdfRendering] = useState(false);

  // TXT specifics
  const [txtContent, setTxtContent] = useState<string>('');
  const [txtChapters, setTxtChapters] = useState<{ title: string; content: string }[]>([]);
  const [currentTxtChapterIdx, setCurrentTxtChapterIdx] = useState(0);

  // Fallback state if an external or corrupt EPUB fails to load
  const [useTextFallback, setUseTextFallback] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  // Reading flow mode: 'continuous' (all chapters in one smooth document from page 1 to last page) or 'paginated' (one chapter per view)
  const [readingFlowMode, setReadingFlowMode] = useState<'continuous' | 'paginated'>('continuous');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Helper to partition plain text or markdown into clear, readable chapters
  const partitionTextToChapters = (text: string) => {
    const lines = text.split(/\r?\n/);
    const chapters: { title: string; content: string }[] = [];
    let currTitle = 'Chapter 1: Opening';
    let currLines: string[] = [];

    const isChapterHeading = (line: string): { isHeading: boolean; title: string } => {
      const trimmed = line.trim();
      if (!trimmed) return { isHeading: false, title: '' };

      // 1. Explicit === Section / Chapter Title ===
      if (trimmed.startsWith('=== ') && trimmed.endsWith(' ===')) {
        return {
          isHeading: true,
          title: trimmed.replace(/^===\s*/, '').replace(/\s*===$/, ''),
        };
      }

      // 2. Markdown # Chapter or ## Chapter
      if (/^#{1,3}\s+(Chapter|Book|Part|Act|Scene|غزل|ردیف|بند|داستان|سیر|دیباچہ|باب|فصل)/i.test(trimmed)) {
        return {
          isHeading: true,
          title: trimmed.replace(/^#{1,3}\s+/, ''),
        };
      }

      // 3. Genuine Chapter patterns:
      // "Chapter 1", "Chapter I", "Chapter the First", "Book One", "Act I, Scene I", etc.
      // or Urdu literary units: "غزل ۱", "ردیف الف", "داستان", etc.
      if (
        /^(chapter|book|part|act|scene|canto|letter)\s+([0-9ivxlcdm]+|[a-z]+)/i.test(trimmed) ||
        /^(غزل|ردیف|بند|داستان|سیر|دیباچہ|باب|فصل)\s+/u.test(trimmed)
      ) {
        return { isHeading: true, title: trimmed };
      }

      return { isHeading: false, title: '' };
    };

    for (const line of lines) {
      const check = isChapterHeading(line);
      if (check.isHeading) {
        if (currLines.join('\n').trim().length > 0) {
          chapters.push({ title: currTitle, content: currLines.join('\n').trim() });
        }
        currTitle = check.title;
        currLines = [];
      } else {
        currLines.push(line);
      }
    }

    if (currLines.join('\n').trim().length > 0 || chapters.length === 0) {
      chapters.push({ title: currTitle, content: currLines.join('\n').trim() });
    }

    // If only 1 chapter was found but it's large (e.g. raw unstructured text over 12,000 characters),
    // paginate it into readable ~1,500-word sections so the user has comfortable reading segments
    if (chapters.length === 1 && chapters[0].content.length > 12000) {
      const fullContent = chapters[0].content;
      const paragraphs = fullContent.split(/\n\s*\n/);
      const paginatedChapters: { title: string; content: string }[] = [];
      let pageNum = 1;
      let currentSectionText: string[] = [];
      let currentLen = 0;

      for (const p of paragraphs) {
        currentSectionText.push(p);
        currentLen += p.length;
        if (currentLen > 5000) {
          paginatedChapters.push({
            title: `Part ${pageNum}`,
            content: currentSectionText.join('\n\n'),
          });
          pageNum++;
          currentSectionText = [];
          currentLen = 0;
        }
      }
      if (currentSectionText.length > 0) {
        paginatedChapters.push({
          title: `Part ${pageNum}`,
          content: currentSectionText.join('\n\n'),
        });
      }
      return paginatedChapters;
    }

    return chapters;
  };

  // Strictly reset scroll to Page 1 (top: 0) on book load or chapter switch
  useEffect(() => {
    // Reset reading position to Page 1
    setCurrentTxtChapterIdx(0);
    setPdfPage(1);
    setPercentage(0);
    setCurrentLocationLabel('Page 1');

    const resetToTop = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
        scrollContainerRef.current.scrollLeft = 0;
      }
    };

    resetToTop();
    const timer = setTimeout(resetToTop, 50);
    return () => clearTimeout(timer);
  }, [book.id]);

  // When switching chapters in paginated mode, scroll to top
  useEffect(() => {
    if (readingFlowMode === 'paginated' && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [currentTxtChapterIdx, readingFlowMode]);

  // Handle scroll in continuous reading mode
  const handleTextScroll = () => {
    if (readingFlowMode === 'continuous' && scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      const scrollRange = el.scrollHeight - el.clientHeight;
      if (scrollRange > 0) {
        const pct = Math.min(100, Math.max(0, Math.round((el.scrollTop / scrollRange) * 100)));
        setPercentage(pct);

        if (txtChapters.length > 0) {
          // Approximate current chapter from scroll
          const approxChapter = Math.min(
            txtChapters.length,
            Math.max(1, Math.floor((pct / 100) * txtChapters.length) + 1)
          );
          setCurrentLocationLabel(`Chapter ${approxChapter} of ${txtChapters.length} (${pct}%)`);
        } else {
          setCurrentLocationLabel(`${pct}% Read`);
        }

        updateProgress(book.id, {
          location: `scroll_${pct}`,
          percentage: pct,
          updatedAt: Date.now(),
        });
      }
    }
  };

  // Theme palettes
  const themeStyles = {
    light: {
      bg: 'bg-[#FBF9F5]',
      panelBg: 'bg-white',
      text: 'text-stone-900',
      border: 'border-stone-200',
      subtext: 'text-stone-500',
      epubBg: '#FBF9F5',
      epubText: '#1C1917',
    },
    sepia: {
      bg: 'bg-[#F4ECD8]',
      panelBg: 'bg-[#EFE5CC]',
      text: 'text-[#433422]',
      border: 'border-[#DFCFAF]',
      subtext: 'text-[#7D6B58]',
      epubBg: '#F4ECD8',
      epubText: '#433422',
    },
    dark: {
      bg: 'bg-[#18181B]',
      panelBg: 'bg-[#27272A]',
      text: 'text-zinc-100',
      border: 'border-zinc-800',
      subtext: 'text-zinc-400',
      epubBg: '#18181B',
      epubText: '#F4F4F5',
    },
    night: {
      bg: 'bg-[#09090B]',
      panelBg: 'bg-[#18181B]',
      text: 'text-zinc-200',
      border: 'border-zinc-800',
      subtext: 'text-zinc-500',
      epubBg: '#09090B',
      epubText: '#D4D4D8',
    },
  }[settings.theme];

  // Font class for containers
  const getFontFamilyCss = () => {
    switch (settings.fontFamily) {
      case 'urdu':
        return "'Noto Nastaliq Urdu', serif";
      case 'sans':
        return "'Plus Jakarta Sans', system-ui, sans-serif";
      case 'mono':
        return "monospace";
      case 'serif':
      default:
        return "'Lora', Georgia, serif";
    }
  };

  // ==========================================
  // 1. EPUB RENDERING LOGIC
  // ==========================================
  useEffect(() => {
    if (book.format !== 'epub') return;

    let isMounted = true;

    const initEpub = async () => {
      try {
        if (!epubContainerRef.current) return;
        epubContainerRef.current.innerHTML = '';

        const buffer = await book.fileBlob.arrayBuffer();
        const epubBook = ePub(buffer);
        epubBookRef.current = epubBook;

        await epubBook.ready;
        if (!isMounted) return;

        // Load navigation (Table of Contents)
        const navigation = await epubBook.loaded.navigation;
        if (navigation && navigation.toc) {
          setTocItems(navigation.toc);
        }

        // Render to container
        const rendition = epubBook.renderTo(epubContainerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: 'auto',
          allowScriptedContent: true,
        });
        renditionRef.current = rendition;

        // Register and apply themes
        rendition.themes.register('light', {
          body: {
            background: '#FBF9F5 !important',
            color: '#1C1917 !important',
            'font-family': `${getFontFamilyCss()} !important`,
            'line-height': `${settings.lineHeight} !important`,
          },
        });
        rendition.themes.register('sepia', {
          body: {
            background: '#F4ECD8 !important',
            color: '#433422 !important',
            'font-family': `${getFontFamilyCss()} !important`,
            'line-height': `${settings.lineHeight} !important`,
          },
        });
        rendition.themes.register('dark', {
          body: {
            background: '#18181B !important',
            color: '#F4F4F5 !important',
            'font-family': `${getFontFamilyCss()} !important`,
            'line-height': `${settings.lineHeight} !important`,
          },
        });
        rendition.themes.register('night', {
          body: {
            background: '#09090B !important',
            color: '#D4D4D8 !important',
            'font-family': `${getFontFamilyCss()} !important`,
            'line-height': `${settings.lineHeight} !important`,
          },
        });

        rendition.themes.select(settings.theme);
        rendition.themes.fontSize(`${settings.fontSize}px`);

        // Validate start location: Only use stored location if it is a valid EPUB CFI or HTML file
        let validEpubLocation: string | undefined = undefined;
        if (book.progress?.location) {
          const loc = book.progress.location;
          if (loc.startsWith('epubcfi(') || loc.includes('.htm') || loc.includes('.xhtml')) {
            validEpubLocation = loc;
          }
        }

        try {
          await rendition.display(validEpubLocation);
        } catch {
          // If stored location failed, start cleanly from page 1 / start of book
          await rendition.display(undefined);
        }
        setIsEpubReady(true);

        // Generate locations for percentage calculation
        await epubBook.locations.generate(1024);

        // Listen for page changes / relocation
        rendition.on('relocated', (location: any) => {
          if (!isMounted) return;
          const cfi = location.start.cfi;
          let calculatedPercent = 0;

          if (epubBook.locations && epubBook.locations.length()) {
            calculatedPercent = Math.round(epubBook.locations.percentageFromCfi(cfi) * 100);
            setPercentage(calculatedPercent);
          }

          setCurrentLocationLabel(location.start.displayed?.page ? `Page ${location.start.displayed.page}` : `${calculatedPercent}%`);

          // Persist progress to IndexedDB
          updateProgress(book.id, {
            location: cfi,
            percentage: calculatedPercent,
            updatedAt: Date.now(),
          });
        });

        // Keyboard navigation inside iframe
        rendition.on('keydown', (e: KeyboardEvent) => {
          if (e.key === 'ArrowRight') {
            settings.rtlMode ? rendition.prev() : rendition.next();
          } else if (e.key === 'ArrowLeft') {
            settings.rtlMode ? rendition.next() : rendition.prev();
          }
        });
      } catch (err) {
        console.warn('EPUB engine could not render container, switching to public domain text fallback:', err);
        if (!isMounted) return;
        setUseTextFallback(true);
        setFallbackNotice('Remote EPUB could not be loaded; displaying verified public domain text edition.');

        let rawText = '';
        try {
          rawText = await book.fileBlob.text();
        } catch (e) {
          console.warn('Could not read file blob as text', e);
        }

        if (!rawText || rawText.includes('<html') || rawText.includes('404') || rawText.length < 50) {
          rawText = getFallbackPublicDomainText(book.id, book.title, book.author, book.description || '');
        }

        const chapters = partitionTextToChapters(rawText);
        setTxtChapters(chapters);
        setTxtContent(rawText);
        setCurrentTxtChapterIdx(0);
        setPercentage(0);
        setCurrentLocationLabel(`Page 1 · Chapter 1 of ${chapters.length}`);

        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      }
    };

    initEpub();

    return () => {
      isMounted = false;
      if (renditionRef.current) {
        renditionRef.current.destroy();
      }
      if (epubBookRef.current) {
        epubBookRef.current.destroy();
      }
    };
  }, [book.id, book.format]);

  // Update EPUB theme & font styles dynamically
  useEffect(() => {
    if (book.format !== 'epub' || !renditionRef.current) return;
    try {
      renditionRef.current.themes.select(settings.theme);
      renditionRef.current.themes.fontSize(`${settings.fontSize}px`);
      renditionRef.current.themes.font(getFontFamilyCss());
    } catch (e) {
      console.warn('Could not update epub theme dynamically', e);
    }
  }, [settings.theme, settings.fontSize, settings.fontFamily, settings.lineHeight]);

  // ==========================================
  // 2. PDF RENDERING LOGIC
  // ==========================================
  useEffect(() => {
    if (book.format !== 'pdf') return;

    let isMounted = true;

    const loadPdfDoc = async () => {
      try {
        const buffer = await book.fileBlob.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: buffer });
        const pdfDoc = await loadingTask.promise;
        if (!isMounted) return;

        pdfDocRef.current = pdfDoc;
        setPdfTotalPages(pdfDoc.numPages);

        // Always start clean from page 1 on book load
        setPdfPage(1);
        setCurrentLocationLabel(`Page 1 of ${pdfDoc.numPages}`);
      } catch (err) {
        console.error('Failed to parse PDF document:', err);
      }
    };

    loadPdfDoc();

    return () => {
      isMounted = false;
    };
  }, [book.id, book.format]);

  const renderPdfPage = useCallback(
    async (pageNumber: number) => {
      if (!pdfDocRef.current || !pdfCanvasRef.current || isPdfRendering) return;

      try {
        setIsPdfRendering(true);
        const page = await pdfDocRef.current.getPage(pageNumber);
        const canvas = pdfCanvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const viewport = page.getViewport({ scale: pdfScale });

        // High DPI support
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        const currentPct = Math.round((pageNumber / pdfDocRef.current.numPages) * 100);
        setPercentage(currentPct);
        setCurrentLocationLabel(`Page ${pageNumber} of ${pdfDocRef.current.numPages}`);

        // Persist to DB
        updateProgress(book.id, {
          location: `page_${pageNumber}`,
          pageCurrent: pageNumber,
          pageTotal: pdfDocRef.current.numPages,
          percentage: currentPct,
          updatedAt: Date.now(),
        });
      } catch (err) {
        console.error('Error rendering PDF page:', err);
      } finally {
        setIsPdfRendering(false);
      }
    },
    [book.id, pdfScale, isPdfRendering]
  );

  useEffect(() => {
    if (book.format === 'pdf' && pdfDocRef.current) {
      renderPdfPage(pdfPage);
    }
  }, [pdfPage, pdfScale, book.format, renderPdfPage]);

  // ==========================================
  // 3. TXT / HTML RENDERING LOGIC
  // ==========================================
  useEffect(() => {
    if (book.format !== 'txt' && book.format !== 'html') return;

    let isMounted = true;

    const loadTxt = async () => {
      try {
        let text = await book.fileBlob.text();
        if (!isMounted) return;

        if (book.format === 'html') {
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            text = doc.body.innerText || text.replace(/<[^>]+>/g, ' ');
          } catch {
            text = text.replace(/<[^>]+>/g, ' ');
          }
        }

        setTxtContent(text);

        // Partition text into chapters using robust detection
        const chapters = partitionTextToChapters(text);
        setTxtChapters(chapters);

        // Always start from page 1 / chapter 1
        setCurrentTxtChapterIdx(0);
        setPercentage(0);
        setCurrentLocationLabel(`Page 1 · Chapter 1 of ${chapters.length}`);

        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      } catch (err) {
        console.error('Failed to read TXT/HTML file:', err);
      }
    };

    loadTxt();

    return () => {
      isMounted = false;
    };
  }, [book.id, book.format, book.fileBlob]);

  // ==========================================
  // 4. NAVIGATION HANDLERS
  // ==========================================
  const handleNextPage = () => {
    if (book.format === 'epub' && !useTextFallback && renditionRef.current) {
      settings.rtlMode ? renditionRef.current.prev() : renditionRef.current.next();
    } else if (book.format === 'pdf') {
      if (pdfPage < pdfTotalPages) {
        setPdfPage((p) => p + 1);
      }
    } else if (book.format === 'txt' || book.format === 'html' || useTextFallback) {
      if (readingFlowMode === 'continuous') {
        // In continuous mode, scroll down smoothly by 80% viewport
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollBy({
            top: scrollContainerRef.current.clientHeight * 0.8,
            behavior: 'smooth',
          });
        }
      } else {
        // In paginated mode, go to next chapter
        if (currentTxtChapterIdx < txtChapters.length - 1) {
          const nextIdx = currentTxtChapterIdx + 1;
          setCurrentTxtChapterIdx(nextIdx);
          const pct = Math.round(((nextIdx + 1) / txtChapters.length) * 100);
          setPercentage(pct);
          setCurrentLocationLabel(`Chapter ${nextIdx + 1} of ${txtChapters.length}`);
          if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
          updateProgress(book.id, {
            location: `sec_${nextIdx}`,
            pageCurrent: nextIdx + 1,
            pageTotal: txtChapters.length,
            percentage: pct,
            updatedAt: Date.now(),
          });
        }
      }
    }
  };

  const handlePrevPage = () => {
    if (book.format === 'epub' && !useTextFallback && renditionRef.current) {
      settings.rtlMode ? renditionRef.current.next() : renditionRef.current.prev();
    } else if (book.format === 'pdf') {
      if (pdfPage > 1) {
        setPdfPage((p) => p - 1);
      }
    } else if (book.format === 'txt' || book.format === 'html' || useTextFallback) {
      if (readingFlowMode === 'continuous') {
        // In continuous mode, scroll up smoothly by 80% viewport
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollBy({
            top: -scrollContainerRef.current.clientHeight * 0.8,
            behavior: 'smooth',
          });
        }
      } else {
        // In paginated mode, go to previous chapter
        if (currentTxtChapterIdx > 0) {
          const prevIdx = currentTxtChapterIdx - 1;
          setCurrentTxtChapterIdx(prevIdx);
          const pct = Math.round(((prevIdx + 1) / txtChapters.length) * 100);
          setPercentage(pct);
          setCurrentLocationLabel(`Chapter ${prevIdx + 1} of ${txtChapters.length}`);
          if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
          updateProgress(book.id, {
            location: `sec_${prevIdx}`,
            pageCurrent: prevIdx + 1,
            pageTotal: txtChapters.length,
            percentage: pct,
            updatedAt: Date.now(),
          });
        }
      }
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        settings.rtlMode ? handlePrevPage() : handleNextPage();
      } else if (e.key === 'ArrowLeft') {
        settings.rtlMode ? handleNextPage() : handlePrevPage();
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          document.exitFullscreen().catch(() => {});
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.rtlMode, pdfPage, currentTxtChapterIdx, txtChapters.length, pdfTotalPages, isFullscreen, readingFlowMode]);

  // Bookmarking handler
  const handleToggleBookmark = async () => {
    const isTextMode = book.format === 'txt' || book.format === 'html' || useTextFallback;
    const newBookmark: Bookmark = {
      id: `bm-${Date.now()}`,
      location:
        !isTextMode && book.format === 'epub'
          ? renditionRef.current?.location?.start?.cfi || 'loc'
          : book.format === 'pdf'
          ? `Page ${pdfPage}`
          : `Chapter ${currentTxtChapterIdx + 1}: ${txtChapters[currentTxtChapterIdx]?.title || ''}`,
      label:
        !isTextMode && book.format === 'epub'
          ? `Bookmark at ${percentage}%`
          : book.format === 'pdf'
          ? `Page ${pdfPage}`
          : `${txtChapters[currentTxtChapterIdx]?.title || 'Bookmark'} (${percentage}%)`,
      createdAt: Date.now(),
    };

    await addBookmark(book.id, newBookmark);
    const updated = {
      ...bookRecord,
      bookmarks: [...(bookRecord.bookmarks || []), newBookmark],
    };
    setBookRecord(updated);
    if (onUpdateBook) onUpdateBook(updated);
  };

  const handleRemoveBookmark = async (bmId: string) => {
    await removeBookmark(book.id, bmId);
    const updated = {
      ...bookRecord,
      bookmarks: (bookRecord.bookmarks || []).filter((b) => b.id !== bmId),
    };
    setBookRecord(updated);
    if (onUpdateBook) onUpdateBook(updated);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col ${themeStyles.bg} ${themeStyles.text} select-none transition-colors duration-200`}
    >
      {/* ============================================================== */}
      {/* 1. TOP READER BAR                                              */}
      {/* ============================================================== */}
      <header
        className={`h-14 px-4 flex items-center justify-between border-b ${themeStyles.border} ${themeStyles.panelBg} shrink-0 z-20`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Return to Library"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Library</span>
          </button>
          <div className="h-4 w-[1px] bg-stone-300 dark:bg-zinc-700" />
          <div className="min-w-0 truncate">
            <h1
              className="text-sm font-semibold truncate leading-tight"
              dir={book.direction}
            >
              {book.title}
            </h1>
            <p className="text-[11px] opacity-70 truncate">{book.author}</p>
          </div>
        </div>

        {/* Reader Controls Toolbar */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Table of contents toggle */}
          <button
            onClick={() => {
              setShowToc(!showToc);
              setShowSettings(false);
              setShowBookmarks(false);
            }}
            className={`p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
              showToc ? 'bg-black/10 dark:bg-white/15' : ''
            }`}
            title="Table of Contents"
          >
            <List className="w-4 h-4" />
          </button>

          {/* Bookmarks toggle */}
          <button
            onClick={() => {
              setShowBookmarks(!showBookmarks);
              setShowToc(false);
              setShowSettings(false);
            }}
            className={`p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
              showBookmarks ? 'bg-black/10 dark:bg-white/15' : ''
            }`}
            title="Bookmarks"
          >
            <BookmarkIcon className="w-4 h-4" />
          </button>

          {/* Add bookmark button */}
          <button
            onClick={handleToggleBookmark}
            className="p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Bookmark Current Page"
          >
            <BookmarkIcon className="w-4 h-4 fill-amber-500 text-amber-500" />
          </button>

          {/* PDF Zoom Controls */}
          {book.format === 'pdf' && (
            <div className="hidden sm:flex items-center gap-1 border-l border-r px-1 mx-1 border-stone-200 dark:border-zinc-700">
              <button
                onClick={() => setPdfScale((s) => Math.max(0.6, s - 0.2))}
                className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-1">
                {Math.round(pdfScale * 100)}%
              </span>
              <button
                onClick={() => setPdfScale((s) => Math.min(2.5, s + 0.2))}
                className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Typography & Appearance Settings */}
          <button
            onClick={() => {
              setShowSettings(!showSettings);
              setShowToc(false);
              setShowBookmarks(false);
            }}
            className={`p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
              showSettings ? 'bg-black/10 dark:bg-white/15' : ''
            }`}
            title="Appearance Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. MAIN READING CANVAS AREA                                    */}
      {/* ============================================================== */}
      <div className="relative flex-1 overflow-hidden flex">
        {/* Table of Contents Drawer */}
        {showToc && (
          <aside
            className={`absolute top-0 bottom-0 left-0 w-80 max-w-[85vw] z-30 shadow-xl border-r ${themeStyles.border} ${themeStyles.panelBg} flex flex-col`}
          >
            <div className={`p-4 border-b ${themeStyles.border} flex items-center justify-between`}>
              <h2 className="text-sm font-semibold">Table of Contents</h2>
              <button
                onClick={() => setShowToc(false)}
                className="text-xs opacity-70 hover:opacity-100 p-1"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {book.format === 'epub' && !useTextFallback && tocItems.length > 0 ? (
                tocItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (renditionRef.current && item.href) {
                        renditionRef.current.display(item.href);
                        setActiveTocHref(item.href);
                        setShowToc(false);
                      }
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded transition-colors ${
                      activeTocHref === item.href
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-medium'
                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </button>
                ))
              ) : (book.format === 'txt' || book.format === 'html' || useTextFallback) && txtChapters.length > 0 ? (
                txtChapters.map((ch, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentTxtChapterIdx(idx);
                      const pct = Math.round(((idx + 1) / txtChapters.length) * 100);
                      setPercentage(pct);
                      setCurrentLocationLabel(`Chapter ${idx + 1} of ${txtChapters.length}`);
                      setShowToc(false);

                      if (readingFlowMode === 'continuous') {
                        // Smoothly scroll to chapter anchor
                        const el = document.getElementById(`chapter-section-${idx}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      } else {
                        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
                      }
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded transition-colors ${
                      currentTxtChapterIdx === idx
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-medium'
                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {ch.title}
                  </button>
                ))
              ) : book.format === 'pdf' ? (
                <div className="space-y-1">
                  {Array.from({ length: pdfTotalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setPdfPage(i + 1);
                        setShowToc(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded ${
                        pdfPage === i + 1
                          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-medium'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      Page {i + 1}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs p-3 opacity-60">No structured chapter index found.</p>
              )}
            </div>
          </aside>
        )}

        {/* Bookmarks Drawer */}
        {showBookmarks && (
          <aside
            className={`absolute top-0 bottom-0 left-0 w-80 max-w-[85vw] z-30 shadow-xl border-r ${themeStyles.border} ${themeStyles.panelBg} flex flex-col`}
          >
            <div className={`p-4 border-b ${themeStyles.border} flex items-center justify-between`}>
              <h2 className="text-sm font-semibold">Saved Bookmarks</h2>
              <button
                onClick={() => setShowBookmarks(false)}
                className="text-xs opacity-70 hover:opacity-100 p-1"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {(bookRecord.bookmarks || []).length > 0 ? (
                bookRecord.bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="p-2.5 rounded border border-stone-200/50 dark:border-zinc-800/80 flex items-start justify-between gap-2"
                  >
                    <div
                      className="cursor-pointer min-w-0 flex-1"
                      onClick={() => {
                        if (book.format === 'epub' && renditionRef.current) {
                          renditionRef.current.display(bm.location);
                        } else if (book.format === 'pdf') {
                          const match = bm.location.match(/\d+/);
                          if (match) setPdfPage(parseInt(match[0], 10));
                        }
                        setShowBookmarks(false);
                      }}
                    >
                      <div className="text-xs font-medium text-amber-800 dark:text-amber-400">
                        {bm.label}
                      </div>
                      <div className="text-[10px] opacity-60 mt-1">
                        {new Date(bm.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveBookmark(bm.id)}
                      className="text-xs opacity-50 hover:opacity-100 hover:text-red-500 p-1"
                      title="Remove Bookmark"
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-xs p-4 text-center opacity-60">
                  No bookmarks yet. Tap the bookmark icon to save your place.
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Appearance Settings Drawer */}
        {showSettings && (
          <aside
            className={`absolute top-0 bottom-0 right-0 w-80 max-w-[85vw] z-30 shadow-xl border-l ${themeStyles.border} ${themeStyles.panelBg} flex flex-col`}
          >
            <div className={`p-4 border-b ${themeStyles.border} flex items-center justify-between`}>
              <h2 className="text-sm font-semibold">Reader Appearance</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-xs opacity-70 hover:opacity-100 p-1"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Reading Flow Mode (Continuous Scroll vs Paginated) */}
              {(book.format === 'txt' || book.format === 'html' || useTextFallback) && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider opacity-70 block mb-2">
                    Reading Flow Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setReadingFlowMode('continuous')}
                      className={`px-3 py-2 rounded text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                        readingFlowMode === 'continuous'
                          ? 'border-amber-600 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-bold'
                          : 'border-stone-200 dark:border-zinc-800 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <AlignLeft className="w-3.5 h-3.5" /> Continuous Scroll
                    </button>
                    <button
                      onClick={() => setReadingFlowMode('paginated')}
                      className={`px-3 py-2 rounded text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                        readingFlowMode === 'paginated'
                          ? 'border-amber-600 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-bold'
                          : 'border-stone-200 dark:border-zinc-800 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" /> Single Chapter
                    </button>
                  </div>
                </div>
              )}

              {/* Color Themes */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider opacity-70 block mb-2">
                  Theme
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSettings((s) => ({ ...s, theme: 'light' }))}
                    className={`px-3 py-2 rounded text-xs font-medium border flex items-center gap-2 ${
                      settings.theme === 'light'
                        ? 'border-stone-900 bg-white text-stone-900 font-bold'
                        : 'border-stone-200 bg-white text-stone-700'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" /> Light
                  </button>
                  <button
                    onClick={() => setSettings((s) => ({ ...s, theme: 'sepia' }))}
                    className={`px-3 py-2 rounded text-xs font-medium border flex items-center gap-2 ${
                      settings.theme === 'sepia'
                        ? 'border-[#433422] bg-[#F4ECD8] text-[#433422] font-bold'
                        : 'border-[#DFCFAF] bg-[#F4ECD8] text-[#433422]'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#433422]" /> Sepia
                  </button>
                  <button
                    onClick={() => setSettings((s) => ({ ...s, theme: 'dark' }))}
                    className={`px-3 py-2 rounded text-xs font-medium border flex items-center gap-2 ${
                      settings.theme === 'dark'
                        ? 'border-zinc-400 bg-zinc-800 text-zinc-100 font-bold'
                        : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" /> Charcoal
                  </button>
                  <button
                    onClick={() => setSettings((s) => ({ ...s, theme: 'night' }))}
                    className={`px-3 py-2 rounded text-xs font-medium border flex items-center gap-2 ${
                      settings.theme === 'night'
                        ? 'border-zinc-300 bg-black text-white font-bold'
                        : 'border-zinc-800 bg-black text-zinc-400'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-zinc-500" /> Night
                  </button>
                </div>
              </div>

              {/* Font Family (including Noto Nastaliq Urdu) */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider opacity-70 block mb-2">
                  Typography
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSettings((s) => ({ ...s, fontFamily: 'serif' }))}
                    className={`px-3 py-2 rounded text-xs font-serif border ${
                      settings.fontFamily === 'serif' ? 'border-amber-600 font-bold' : 'border-stone-300 dark:border-zinc-700'
                    }`}
                  >
                    Serif (Lora)
                  </button>
                  <button
                    onClick={() => setSettings((s) => ({ ...s, fontFamily: 'sans' }))}
                    className={`px-3 py-2 rounded text-xs font-sans border ${
                      settings.fontFamily === 'sans' ? 'border-amber-600 font-bold' : 'border-stone-300 dark:border-zinc-700'
                    }`}
                  >
                    Sans (Jakarta)
                  </button>
                  <button
                    onClick={() => setSettings((s) => ({ ...s, fontFamily: 'urdu' }))}
                    className={`px-3 py-2 rounded text-xs border font-urdu-nastaliq ${
                      settings.fontFamily === 'urdu' ? 'border-amber-600 font-bold' : 'border-stone-300 dark:border-zinc-700'
                    }`}
                  >
                    اردو نستعلیق
                  </button>
                  <button
                    onClick={() => setSettings((s) => ({ ...s, fontFamily: 'mono' }))}
                    className={`px-3 py-2 rounded text-xs font-mono border ${
                      settings.fontFamily === 'mono' ? 'border-amber-600 font-bold' : 'border-stone-300 dark:border-zinc-700'
                    }`}
                  >
                    Monospace
                  </button>
                </div>
              </div>

              {/* Right to Left (RTL) Switch */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-zinc-800">
                <div>
                  <div className="text-xs font-medium">Right-to-Left (RTL) Reading</div>
                  <div className="text-[11px] opacity-60">Optimized for Urdu & Arabic texts</div>
                </div>
                <button
                  onClick={() => setSettings((s) => ({ ...s, rtlMode: !s.rtlMode }))}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    settings.rtlMode ? 'bg-amber-600' : 'bg-stone-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      settings.rtlMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Font Size Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="opacity-70">Font Size</span>
                  <span className="font-mono">{settings.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="13"
                  max="32"
                  value={settings.fontSize}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, fontSize: parseInt(e.target.value, 10) }))
                  }
                  className="w-full accent-amber-600"
                />
              </div>

              {/* Line Height Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="opacity-70">Line Spacing</span>
                  <span className="font-mono">{settings.lineHeight.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="1.4"
                  max="2.8"
                  step="0.1"
                  value={settings.lineHeight}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, lineHeight: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-amber-600"
                />
              </div>
            </div>
          </aside>
        )}

        {/* Previous page click zone / button */}
        <button
          onClick={handlePrevPage}
          className="absolute left-0 top-0 bottom-0 w-12 sm:w-16 z-10 flex items-center justify-center opacity-0 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-stone-400"
          title="Previous Page / Scroll Up"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        {/* Reading Canvas Container (Strictly starts from top: 0, no flex centering clipping) */}
        <main
          className="flex-1 h-full overflow-hidden flex flex-col justify-start items-stretch"
          dir={settings.rtlMode ? 'rtl' : 'ltr'}
        >
          {/* EPUB Render Canvas */}
          {book.format === 'epub' && !useTextFallback && (
            <div className="flex-1 w-full h-full max-w-4xl mx-auto overflow-hidden relative flex items-center justify-center">
              <div
                ref={epubContainerRef}
                className="w-full h-full"
              />
            </div>
          )}

          {/* PDF Render Canvas */}
          {book.format === 'pdf' && (
            <div
              ref={scrollContainerRef}
              className="flex-1 w-full h-full overflow-auto flex flex-col items-center justify-start py-6 px-2"
            >
              <canvas
                ref={pdfCanvasRef}
                className="shadow-lg rounded border border-stone-200/60 dark:border-zinc-800 max-w-full my-auto"
              />
            </div>
          )}

          {/* TXT / Fallback / Urdu Reader View */}
          {(book.format === 'txt' || book.format === 'html' || useTextFallback) && (
            <div
              ref={scrollContainerRef}
              onScroll={handleTextScroll}
              className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden px-4 sm:px-8 py-8 focus:outline-none"
              tabIndex={0}
            >
              <div className="max-w-3xl mx-auto">
                {fallbackNotice && (
                  <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                    {fallbackNotice}
                  </div>
                )}

                {/* 1. Continuous Reading Flow: All chapters rendered from page 1 through the last page */}
                {readingFlowMode === 'continuous' && txtChapters.length > 0 && (
                  <div className="space-y-16 pb-24">
                    {txtChapters.map((chapter, idx) => (
                      <article
                        key={idx}
                        id={`chapter-section-${idx}`}
                        style={{
                          fontFamily: getFontFamilyCss(),
                          fontSize: `${settings.fontSize}px`,
                          lineHeight: settings.lineHeight,
                        }}
                        className={`prose max-w-none text-justify pb-12 ${
                          idx < txtChapters.length - 1 ? 'border-b border-stone-200/70 dark:border-zinc-800/80' : ''
                        } ${settings.fontFamily === 'urdu' ? 'font-urdu-nastaliq leading-[2.5]' : ''}`}
                      >
                        <div className="mb-6 not-prose">
                          <span className="text-[11px] font-mono uppercase tracking-wider opacity-60 block">
                            {settings.rtlMode ? `حصہ ${idx + 1}` : `Chapter ${idx + 1} of ${txtChapters.length}`}
                          </span>
                          <h2
                            className="text-xl sm:text-2xl font-bold mt-1 pb-2 border-b border-stone-300/40 dark:border-zinc-700/50"
                            dir={settings.rtlMode ? 'rtl' : 'ltr'}
                          >
                            {chapter.title}
                          </h2>
                        </div>
                        <div className="whitespace-pre-wrap">
                          {chapter.content}
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {/* 2. Paginated Chapter Mode: One chapter per view */}
                {readingFlowMode === 'paginated' && txtChapters.length > 0 && txtChapters[currentTxtChapterIdx] && (
                  <article
                    style={{
                      fontFamily: getFontFamilyCss(),
                      fontSize: `${settings.fontSize}px`,
                      lineHeight: settings.lineHeight,
                    }}
                    className={`prose max-w-none text-justify pb-20 ${
                      settings.fontFamily === 'urdu' ? 'font-urdu-nastaliq leading-[2.5]' : ''
                    }`}
                  >
                    <div className="mb-6 not-prose">
                      <span className="text-[11px] font-mono uppercase tracking-wider opacity-60 block">
                        {settings.rtlMode ? `حصہ ${currentTxtChapterIdx + 1}` : `Chapter ${currentTxtChapterIdx + 1} of ${txtChapters.length}`}
                      </span>
                      <h2
                        className="text-xl sm:text-2xl font-bold mt-1 pb-2 border-b border-stone-300/40 dark:border-zinc-700/50"
                        dir={settings.rtlMode ? 'rtl' : 'ltr'}
                      >
                        {txtChapters[currentTxtChapterIdx].title}
                      </h2>
                    </div>
                    <div className="whitespace-pre-wrap">
                      {txtChapters[currentTxtChapterIdx].content}
                    </div>
                  </article>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Next page click zone / button */}
        <button
          onClick={handleNextPage}
          className="absolute right-0 top-0 bottom-0 w-12 sm:w-16 z-10 flex items-center justify-center opacity-0 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-stone-400"
          title="Next Page / Scroll Down"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>

      {/* ============================================================== */}
      {/* 3. BOTTOM READING PROGRESS BAR                                 */}
      {/* ============================================================== */}
      <footer
        className={`h-11 px-4 flex items-center justify-between border-t ${themeStyles.border} ${themeStyles.panelBg} text-xs shrink-0 select-none`}
      >
        <button
          onClick={handlePrevPage}
          className="flex items-center gap-1 opacity-70 hover:opacity-100 font-medium"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Previous
        </button>

        {/* Progress scrub bar & label */}
        <div className="flex items-center gap-3 flex-1 max-w-md mx-4">
          <input
            type="range"
            min="0"
            max="100"
            value={percentage}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setPercentage(val);
              if (book.format === 'pdf' && pdfTotalPages > 0) {
                const targetPage = Math.max(1, Math.round((val / 100) * pdfTotalPages));
                setPdfPage(targetPage);
              } else if ((book.format === 'txt' || useTextFallback) && txtChapters.length > 0) {
                if (readingFlowMode === 'continuous' && scrollContainerRef.current) {
                  const el = scrollContainerRef.current;
                  const targetScroll = (val / 100) * (el.scrollHeight - el.clientHeight);
                  el.scrollTo({ top: targetScroll, behavior: 'smooth' });
                } else {
                  const targetIdx = Math.min(
                    txtChapters.length - 1,
                    Math.floor((val / 100) * txtChapters.length)
                  );
                  setCurrentTxtChapterIdx(targetIdx);
                }
              }
            }}
            className="w-full h-1 bg-stone-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
          />
          <span className="font-mono text-[11px] whitespace-nowrap opacity-70">
            {currentLocationLabel || `${percentage}%`}
          </span>
        </div>

        <button
          onClick={handleNextPage}
          className="flex items-center gap-1 opacity-70 hover:opacity-100 font-medium"
        >
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </footer>
    </div>
  );
};
