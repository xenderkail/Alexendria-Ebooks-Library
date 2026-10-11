import React, { useState } from 'react';
import {
  convertTxtToPdf,
  convertTxtToHtml,
  convertTxtToEpub,
  extractTextFromPdf,
  extractTextFromEpub,
  downloadBlob,
} from '../services/converter.ts';
import { BookRecord, saveBook } from '../services/db.ts';
import {
  FileText,
  FileCode,
  Download,
  BookDown,
  Loader2,
  CheckCircle2,
  Upload,
  Library,
} from 'lucide-react';

interface ConverterViewProps {
  onBookImported?: (book: BookRecord) => void;
}

export const ConverterView: React.FC<ConverterViewProps> = ({ onBookImported }) => {
  const [mode, setMode] = useState<'create' | 'extract'>('create');

  // Mode 1: Text -> PDF/EPUB/HTML
  const [txtTitle, setTxtTitle] = useState('My Literary Manuscript');
  const [txtAuthor, setTxtAuthor] = useState('Author Name');
  const [isRtl, setIsRtl] = useState(false);
  const [textContent, setTextContent] = useState(`Chapter 1: The Beginning

It was a crisp autumn evening when the ancient library doors swung open. Inside, volumes of forgotten knowledge lined mahogany shelves reaching toward the vaulted stone ceilings.

Every folio contained the thoughts, dreams, and discoveries of civilizations long past.`);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionStatus, setConversionStatus] = useState<string | null>(null);

  // Mode 2: EPUB/PDF -> TXT/HTML
  const [extractFile, setExtractFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);

  // Handler for text conversion
  const handleConvertAndDownload = async (format: 'pdf' | 'html' | 'epub', saveToDb = false) => {
    if (!textContent.trim()) return;

    setIsConverting(true);
    setConversionStatus(`Generating ${format.toUpperCase()}...`);

    try {
      let blob: Blob;
      let filename = `${txtTitle.replace(/\s+/g, '_')}`;

      if (format === 'pdf') {
        blob = await convertTxtToPdf(textContent, txtTitle, txtAuthor);
        filename += '.pdf';
      } else if (format === 'html') {
        blob = convertTxtToHtml(textContent, txtTitle, txtAuthor, isRtl);
        filename += '.html';
      } else {
        blob = await convertTxtToEpub(textContent, txtTitle, txtAuthor, isRtl);
        filename += '.epub';
      }

      if (saveToDb && onBookImported) {
        const bookId = `conv-${Date.now()}`;
        const newBook: BookRecord = {
          id: bookId,
          title: txtTitle,
          author: txtAuthor,
          format: format === 'html' ? 'txt' : format,
          fileSize: blob.size,
          genre: 'Converted Documents',
          language: isRtl ? 'ur' : 'en',
          direction: isRtl ? 'rtl' : 'ltr',
          dateAdded: Date.now(),
          lastRead: 0,
          progress: {
            percentage: 0,
            location: '',
            updatedAt: Date.now(),
          },
          bookmarks: [],
          notes: [],
          fileBlob: blob,
        };

        await saveBook(newBook);
        onBookImported(newBook);
        setConversionStatus(`Successfully converted and saved "${txtTitle}" to your Library!`);
      } else {
        downloadBlob(blob, filename);
        setConversionStatus(`Downloaded ${filename} successfully!`);
      }
    } catch (err: any) {
      console.error('Conversion failed:', err);
      setConversionStatus(`Conversion failed: ${err.message}`);
    } finally {
      setIsConverting(false);
    }
  };

  // Handler for text extraction
  const handleExtractFromDocument = async () => {
    if (!extractFile) return;

    setIsExtracting(true);
    setExtractedText('');

    try {
      const ext = extractFile.name.split('.').pop()?.toLowerCase();
      let text = '';

      if (ext === 'pdf') {
        text = await extractTextFromPdf(extractFile);
      } else if (ext === 'epub') {
        text = await extractTextFromEpub(extractFile);
      } else {
        text = await extractFile.text();
      }

      setExtractedText(text);
    } catch (err: any) {
      console.error('Extraction failed:', err);
      setExtractedText(`Error extracting text: ${err.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-2xl font-serif font-medium text-stone-900">
            Multi-Format Document Converter
          </h2>
          <p className="text-xs text-stone-600 mt-1">
            Real client-side PDF, EPUB, and HTML transformation engine. 100% private in-browser processing.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg shrink-0">
          <button
            onClick={() => setMode('create')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === 'create'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Create EPUB / PDF / HTML
          </button>
          <button
            onClick={() => setMode('extract')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === 'extract'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Extract Text from eBook
          </button>
        </div>
      </div>

      {/* Mode 1: Create EPUB / PDF / HTML */}
      {mode === 'create' && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-2xs space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Book Title</label>
              <input
                type="text"
                value={txtTitle}
                onChange={(e) => setTxtTitle(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Author Name</label>
              <input
                type="text"
                value={txtAuthor}
                onChange={(e) => setTxtAuthor(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-800"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="text-xs font-medium text-stone-700">Text & Content</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-600">Urdu / Arabic RTL Mode:</span>
              <button
                type="button"
                onClick={() => setIsRtl(!isRtl)}
                className={`w-9 h-5 rounded-full transition-colors relative ${
                  isRtl ? 'bg-amber-800' : 'bg-stone-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${
                    isRtl ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <textarea
            rows={10}
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            dir={isRtl ? 'rtl' : 'ltr'}
            placeholder="Paste your manuscript or book text here..."
            className={`w-full p-4 border border-stone-200 rounded-lg text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-800 ${
              isRtl ? 'font-urdu-nastaliq text-right' : 'font-serif'
            }`}
          />

          {/* Load from existing .txt file button */}
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>
              {textContent.trim().split(/\s+/).filter(Boolean).length} words ·{' '}
              {textContent.length} characters
            </span>
            <label className="cursor-pointer text-amber-800 hover:text-amber-900 underline font-medium">
              Load text from .txt file
              <input
                type="file"
                accept=".txt"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const text = await file.text();
                    setTextContent(text);
                    setTxtTitle(file.name.replace(/\.txt$/i, ''));
                  }
                }}
              />
            </label>
          </div>

          {/* Action Export Buttons */}
          <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center gap-3">
            <button
              disabled={isConverting}
              onClick={() => handleConvertAndDownload('pdf', false)}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> Export PDF
            </button>

            <button
              disabled={isConverting}
              onClick={() => handleConvertAndDownload('epub', false)}
              className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <BookDown className="w-3.5 h-3.5" /> Export EPUB
            </button>

            <button
              disabled={isConverting}
              onClick={() => handleConvertAndDownload('html', false)}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <FileCode className="w-3.5 h-3.5" /> Export HTML5
            </button>

            <button
              disabled={isConverting}
              onClick={() => handleConvertAndDownload('epub', true)}
              className="px-4 py-2 border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 cursor-pointer ml-auto disabled:opacity-50"
            >
              <Library className="w-3.5 h-3.5 text-amber-800" /> Save directly to My Library
            </button>
          </div>

          {conversionStatus && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0" />
              {conversionStatus}
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Extract Text from eBook */}
      {mode === 'extract' && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-2xs space-y-5">
          <div className="border-2 border-dashed border-stone-200 rounded-xl p-8 text-center bg-stone-50/50">
            <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-stone-800 mb-1">
              Select an EPUB or PDF document to parse text content
            </p>
            <input
              type="file"
              accept=".epub,.pdf,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setExtractFile(file);
              }}
              className="hidden"
              id="extract-file-input"
            />
            <label
              htmlFor="extract-file-input"
              className="inline-block mt-3 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-lg cursor-pointer transition-colors shadow-xs"
            >
              Choose EPUB or PDF File
            </label>

            {extractFile && (
              <div className="mt-3 text-xs font-medium text-amber-900">
                Selected: {extractFile.name} ({(extractFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <button
              disabled={!extractFile || isExtracting}
              onClick={handleExtractFromDocument}
              className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isExtracting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {isExtracting ? 'Extracting Text Streams...' : 'Extract Full Plain Text'}
            </button>
          </div>

          {/* Extracted Text Result Box */}
          {extractedText && (
            <div className="space-y-3 pt-4 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-800">
                  Extracted Output ({extractedText.length} characters)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
                      downloadBlob(
                        blob,
                        `${extractFile?.name.replace(/\.[^/.]+$/, '') || 'extracted'}.txt`
                      );
                    }}
                    className="px-3 py-1.5 text-xs bg-stone-100 hover:bg-stone-200 text-stone-800 rounded font-medium flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Download .TXT
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                rows={12}
                value={extractedText}
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono text-stone-800 leading-relaxed"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
