import React from 'react';
import { Plus, BookOpen } from 'lucide-react';

export type ActiveTab = 'library' | 'catalog' | 'portal' | 'converter' | 'guide';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenUploader: () => void;
  hasActiveBook?: boolean;
  onResumeBook?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenUploader,
  hasActiveBook,
  onResumeBook,
}) => {
  return (
    <header className="h-16 px-6 sm:px-8 border-b border-stone-200 bg-[#FBF9F5]/90 backdrop-blur-xs sticky top-0 z-40 flex items-center justify-between gap-8 select-none">
      {/* Zone 1: Brand wordmark (single text element in display serif) */}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onSelectTab('library');
        }}
        className="font-display text-2xl font-bold tracking-tight text-stone-900 hover:text-amber-900 transition-colors whitespace-nowrap shrink-0"
      >
        Alexandria
      </a>

      {/* Zone 2: 4–5 concise single-line nav links */}
      <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-stone-600">
        <button
          onClick={() => onSelectTab('library')}
          className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
            activeTab === 'library'
              ? 'text-stone-900 border-b-2 border-stone-900 font-semibold'
              : ''
          }`}
        >
          My Library
        </button>

        <button
          onClick={() => onSelectTab('catalog')}
          className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
            activeTab === 'catalog'
              ? 'text-stone-900 border-b-2 border-stone-900 font-semibold'
              : ''
          }`}
        >
          Public Catalog
        </button>

        <button
          onClick={() => onSelectTab('portal')}
          className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
            activeTab === 'portal'
              ? 'text-stone-900 border-b-2 border-stone-900 font-semibold'
              : ''
          }`}
        >
          Search Archives
        </button>

        <button
          onClick={() => onSelectTab('converter')}
          className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
            activeTab === 'converter'
              ? 'text-stone-900 border-b-2 border-stone-900 font-semibold'
              : ''
          }`}
        >
          Format Converter
        </button>

        <button
          onClick={() => onSelectTab('guide')}
          className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
            activeTab === 'guide'
              ? 'text-stone-900 border-b-2 border-stone-900 font-semibold'
              : ''
          }`}
        >
          Guide & Specs
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-2 shrink-0">
        {hasActiveBook && onResumeBook ? (
          <button
            onClick={onResumeBook}
            className="px-4 py-2 text-xs font-medium text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Resume Reading
          </button>
        ) : null}

        <button
          onClick={onOpenUploader}
          className="px-4 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Upload Books
        </button>
      </div>
    </header>
  );
};
