import React, { useState, useRef } from 'react';
import { BookRecord, BookFormat, saveBook } from '../services/db.ts';
import { Upload, FolderUp, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface UploaderProps {
  onUploadSuccess: () => void;
  onCancel?: () => void;
}

export const Uploader: React.FC<UploaderProps> = ({ onUploadSuccess, onCancel }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [importedBooks, setImportedBooks] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Parse filename to extract plausible title & author
  const parseFilenameMetadata = (filename: string): { title: string; author: string } => {
    // Strip file extension
    const base = filename.replace(/\.(epub|pdf|txt|mobi)$/i, '');
    
    // Check if filename is in "Author - Title" format
    if (base.includes(' - ')) {
      const parts = base.split(' - ');
      return {
        author: parts[0].trim().replace(/_/g, ' '),
        title: parts.slice(1).join(' - ').trim().replace(/_/g, ' '),
      };
    }
    
    // Check "Title by Author"
    if (base.toLowerCase().includes(' by ')) {
      const parts = base.split(/ by /i);
      return {
        title: parts[0].trim().replace(/_/g, ' '),
        author: parts.slice(1).join(' by ').trim().replace(/_/g, ' '),
      };
    }

    return {
      title: base.replace(/[_-]+/g, ' ').trim(),
      author: 'Unknown Author',
    };
  };

  // Detect Urdu/Arabic characters for direction and font setting
  const detectLanguageAndDirection = (text: string): { language: 'en' | 'ur'; direction: 'ltr' | 'rtl' } => {
    const urduRegex = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
    if (urduRegex.test(text)) {
      return { language: 'ur', direction: 'rtl' };
    }
    return { language: 'en', direction: 'ltr' };
  };

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setTotalCount(files.length);
    setProcessedCount(0);
    const successfullyAdded: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProcessedCount(i + 1);
        setProgressMsg(`Processing file ${i + 1} of ${files.length}: ${file.name}`);

        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!ext || !['epub', 'pdf', 'txt', 'mobi'].includes(ext)) {
          // Skip unsupported files without failing the batch
          continue;
        }

        const format = ext as BookFormat;
        const { title, author } = parseFilenameMetadata(file.name);
        const { language, direction } = detectLanguageAndDirection(`${title} ${author}`);

        const bookId = `book-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        const newBook: BookRecord = {
          id: bookId,
          title,
          author,
          format,
          fileSize: file.size,
          genre: 'Local Uploads',
          language,
          direction,
          dateAdded: Date.now(),
          lastRead: 0,
          progress: {
            percentage: 0,
            location: '',
            updatedAt: Date.now(),
          },
          bookmarks: [],
          notes: [],
          fileBlob: file, // Direct IndexedDB persistence
        };

        await saveBook(newBook);
        successfullyAdded.push(title);
      }

      setImportedBooks(successfullyAdded);

      if (successfullyAdded.length === 0) {
        setErrorMsg('No valid .epub, .pdf, .txt, or .mobi files were found in the selection.');
      } else {
        setTimeout(() => {
          onUploadSuccess();
        }, 1200);
      }
    } catch (err: any) {
      console.error('Failed to import books into IndexedDB:', err);
      setErrorMsg(err.message || 'Error occurred while saving files to IndexedDB');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    processFiles(e.dataTransfer.files);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white border border-stone-200 rounded-xl shadow-xs">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-serif font-medium text-stone-900 mb-2">
          Import Books to IndexedDB
        </h2>
        <p className="text-sm text-stone-600 max-w-md mx-auto">
          Files are stored locally and persistently inside your browser's private IndexedDB sandbox.
          Zero files are sent to remote clouds.
        </p>
      </div>

      {/* Drag & Drop Box */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-stone-300 hover:border-amber-700/60 rounded-xl p-8 text-center transition-colors bg-stone-50/50 hover:bg-amber-50/20"
      >
        <Upload className="w-10 h-10 text-stone-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-stone-800 mb-1">
          Drag and drop individual books or entire folders
        </p>
        <p className="text-xs text-stone-500 mb-6">
          Supported formats: .EPUB, .PDF, .TXT, .MOBI
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Single or Multiple Files Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept=".epub,.pdf,.txt,.mobi"
            className="hidden"
          />
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            Select Files
          </button>

          {/* Directory / Folder Recursive Input */}
          <input
            type="file"
            ref={folderInputRef}
            onChange={handleFileChange}
            {...({ webkitdirectory: '', directory: '', multiple: true } as any)}
            className="hidden"
          />
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => folderInputRef.current?.click()}
            className="px-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <FolderUp className="w-4 h-4" />
            Upload Entire Folder
          </button>
        </div>
      </div>

      {/* Processing State */}
      {isProcessing && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="w-5 h-5 text-amber-700 animate-spin" />
            <span className="text-xs font-medium text-amber-900">
              Saving persistently to IndexedDB ({processedCount} / {totalCount})
            </span>
          </div>
          <div className="w-full bg-amber-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-800 h-full transition-all duration-150"
              style={{ width: `${totalCount > 0 ? (processedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[11px] text-amber-800/80 mt-2 truncate">{progressMsg}</p>
        </div>
      )}

      {/* Success Notification */}
      {importedBooks.length > 0 && !isProcessing && (
        <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-emerald-900">
              Successfully stored {importedBooks.length} book{importedBooks.length > 1 ? 's' : ''} in IndexedDB
            </h4>
            <p className="text-[11px] text-emerald-700 mt-1">
              Opening library...
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs text-red-700">{errorMsg}</div>
        </div>
      )}

      {onCancel && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-stone-500 hover:text-stone-800 underline underline-offset-4"
          >
            Cancel and Return to Library
          </button>
        </div>
      )}
    </div>
  );
};
