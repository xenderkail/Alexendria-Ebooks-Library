import React, { useState, useEffect } from 'react';
import { getStorageEstimate, formatBytes } from '../services/db.ts';
import {
  Database,
  Languages,
  FolderTree,
  FileCode2,
  ShieldCheck,
  Check,
  HardDrive,
  BookOpen,
} from 'lucide-react';

export const UserGuide: React.FC = () => {
  const [storageStatus, setStorageStatus] = useState<{
    usageBytes: number;
    quotaBytes: number;
    percentage: number;
    bookCount: number;
  } | null>(null);

  const [isPersisted, setIsPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    getStorageEstimate().then(setStorageStatus);

    if (navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(setIsPersisted);
    }
  }, []);

  const requestPersistentStorage = async () => {
    if (navigator.storage && navigator.storage.persist) {
      const persisted = await navigator.storage.persist();
      setIsPersisted(persisted);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Title */}
      <div className="pb-4 border-b border-stone-200">
        <span className="text-xs uppercase tracking-widest text-amber-800 font-medium">
          Technical Architecture & Documentation
        </span>
        <h2 className="text-2xl sm:text-3xl font-serif font-medium text-stone-900 mt-1">
          System Specifications & User Guide
        </h2>
        <p className="text-xs text-stone-600 mt-1">
          Comprehensive manual detailing IndexedDB local sandbox, Nastaliq typography, recursive directory ingestion, and format conversion.
        </p>
      </div>

      {/* Interactive Storage Health Panel */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-amber-800" />
            <h3 className="text-sm font-semibold text-stone-900">
              Live Browser Storage Diagnostics
            </h3>
          </div>
          {isPersisted !== null && (
            <span
              className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                isPersisted
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              {isPersisted ? 'Persistent Storage Active' : 'Standard Session Quota'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <div className="text-[11px] text-stone-500 uppercase tracking-wider">Library Size</div>
            <div className="text-lg font-mono font-semibold text-stone-900 mt-1">
              {storageStatus ? formatBytes(storageStatus.usageBytes) : '—'}
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              Across {storageStatus?.bookCount || 0} books
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <div className="text-[11px] text-stone-500 uppercase tracking-wider">Available Quota</div>
            <div className="text-lg font-mono font-semibold text-stone-900 mt-1">
              {storageStatus?.quotaBytes ? formatBytes(storageStatus.quotaBytes) : 'Dynamic'}
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">Allocated browser pool</div>
          </div>

          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <div className="text-[11px] text-stone-500 uppercase tracking-wider">Quota Utilization</div>
            <div className="text-lg font-mono font-semibold text-stone-900 mt-1">
              {storageStatus?.percentage ? `${storageStatus.percentage.toFixed(2)}%` : '0%'}
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">Local drive capacity</div>
          </div>
        </div>

        {!isPersisted && (
          <div className="flex items-center justify-between pt-3 border-t border-stone-100">
            <p className="text-xs text-stone-600">
              Request browser protection against accidental cache eviction during low disk space.
            </p>
            <button
              onClick={requestPersistentStorage}
              className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              Request Persistence
            </button>
          </div>
        )}
      </div>

      {/* Guide Section 1: IndexedDB Architecture */}
      <section className="bg-white border border-stone-200 rounded-xl p-6 shadow-2xs space-y-3">
        <div className="flex items-center gap-2.5 text-stone-900">
          <Database className="w-5 h-5 text-amber-800" />
          <h3 className="text-base font-semibold">1. How IndexedDB Local File Storage Operates</h3>
        </div>
        <div className="text-xs text-stone-700 leading-relaxed space-y-2">
          <p>
            Traditional web applications either stream files from remote cloud servers or try to use
            <code className="px-1.5 py-0.5 bg-stone-100 rounded text-stone-800 font-mono">localStorage</code>.
            However, <code className="px-1.5 py-0.5 bg-stone-100 rounded text-stone-800 font-mono">localStorage</code>
            is strictly restricted to approximately 5MB of synchronous UTF-16 string data, making it impossible
            to store real books, high-resolution PDFs, or full EPUB archives.
          </p>
          <p>
            <strong>Alexandria Digital Library uses IndexedDB:</strong> an asynchronous, transactional, NoSQL
            object database built into modern web browsers. Uploaded files are stored directly as native binary
            <code className="px-1.5 py-0.5 bg-stone-100 rounded text-stone-800 font-mono">Blob</code> objects
            in an object store named <code className="px-1.5 py-0.5 bg-stone-100 rounded text-stone-800 font-mono">AlexandriaLibraryDB</code>.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-stone-600">
            <li><strong>Zero Server Uploads:</strong> Your books remain exclusively on your physical device.</li>
            <li><strong>Offline Readiness:</strong> Once added, books can be opened and read without an active internet connection.</li>
            <li><strong>Gigabyte Capacity:</strong> Modern browsers typically allocate between 60% and 80% of free hard drive space to IndexedDB storage.</li>
          </ul>
        </div>
      </section>

      {/* Guide Section 2: RTL & Urdu Typography */}
      <section className="bg-white border border-stone-200 rounded-xl p-6 shadow-2xs space-y-3">
        <div className="flex items-center gap-2.5 text-stone-900">
          <Languages className="w-5 h-5 text-amber-800" />
          <h3 className="text-base font-semibold">2. Urdu Nastaliq Typography & Right-to-Left (RTL) Modes</h3>
        </div>
        <div className="text-xs text-stone-700 leading-relaxed space-y-2">
          <p>
            Urdu is a cursive, bidirectional script traditionally written in the flowing <em>Nasta'liq</em> calligraphic style.
            Unlike standard Latin typography or even conventional Naskh Arabic fonts, Nastaliq requires sloping character
            baselines, vertical ligatures, and distinct vertical metric clearances.
          </p>
          <p>
            When reading Urdu content in Alexandria:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-stone-600">
            <li>
              <strong>Noto Nastaliq Urdu:</strong> The reader automatically switches typography to Google's specialized
              Noto Nastaliq Urdu font with generous line spacing (2.2x - 2.4x) to prevent overlapping diacritics (Aerab).
            </li>
            <li>
              <strong>Direction Reversal:</strong> Enabling RTL flips the reading container to <code className="px-1.5 py-0.5 bg-stone-100 rounded text-stone-800 font-mono">dir="rtl"</code>.
              Page progression is inverted: the <em>Left Arrow key</em> turns forward to the next page, and the <em>Right Arrow key</em> moves to the previous page.
            </li>
            <li>
              <strong>Automatic Detection:</strong> Any uploaded file or public catalog book containing Urdu Unicode code points
              (<code className="px-1.5 py-0.5 bg-stone-100 rounded text-stone-800 font-mono">U+0600 - U+06FF</code>)
              is automatically tagged as Urdu RTL.
            </li>
          </ul>
        </div>
      </section>

      {/* Guide Section 3: Recursive Batch Directory Scanning */}
      <section className="bg-white border border-stone-200 rounded-xl p-6 shadow-2xs space-y-3">
        <div className="flex items-center gap-2.5 text-stone-900">
          <FolderTree className="w-5 h-5 text-amber-800" />
          <h3 className="text-base font-semibold">3. Recursive Batch Folder Ingestion</h3>
        </div>
        <div className="text-xs text-stone-700 leading-relaxed space-y-2">
          <p>
            Rather than requiring users to manually select files one by one, Alexandria provides a native folder upload
            pipeline leveraging the standard HTML5 Directory Picker API:
          </p>
          <div className="p-3 bg-stone-50 rounded font-mono text-[11px] text-stone-800 border border-stone-200">
            &lt;input type="file" webkitdirectory directory multiple /&gt;
          </div>
          <p>
            When you select a root directory from your hard drive:
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-stone-600">
            <li>The browser extracts the recursive directory tree, preserving relative folder paths.</li>
            <li>Our ingestion parser filters for valid electronic book formats: <code>.epub</code>, <code>.pdf</code>, <code>.txt</code>, and <code>.mobi</code>.</li>
            <li>Metadata extraction cleans filename conventions (e.g., extracting author names from <em>"Austen - Emma.epub"</em>).</li>
            <li>Files are streamed directly into IndexedDB, displaying a live progress bar.</li>
          </ol>
        </div>
      </section>

      {/* Guide Section 4: Multi-Format Converter */}
      <section className="bg-white border border-stone-200 rounded-xl p-6 shadow-2xs space-y-3">
        <div className="flex items-center gap-2.5 text-stone-900">
          <FileCode2 className="w-5 h-5 text-amber-800" />
          <h3 className="text-base font-semibold">4. Multi-Format Converter Engine</h3>
        </div>
        <div className="text-xs text-stone-700 leading-relaxed space-y-2">
          <p>
            Alexandria features a client-side document compiler:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-stone-600">
            <li><strong>TXT to PDF:</strong> Uses jsPDF to format typographic margins, page numbering, running headers, and multi-page text wrapping.</li>
            <li><strong>TXT to EPUB:</strong> Generates a full Open Container Format (OCF) ZIP structure containing <code className="px-1 py-0.5 bg-stone-100 rounded text-stone-800 font-mono">mimetype</code>, <code className="px-1 py-0.5 bg-stone-100 rounded text-stone-800 font-mono">container.xml</code>, <code className="px-1 py-0.5 bg-stone-100 rounded text-stone-800 font-mono">content.opf</code>, and XHTML chapter files.</li>
            <li><strong>PDF / EPUB to TXT:</strong> Extracts text content layers using PDF.js text stream iterators or EPUB spine DOM traversal.</li>
          </ul>
        </div>
      </section>
    </div>
  );
};
