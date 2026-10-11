import { getFallbackPublicDomainText } from './publicDomainTexts.ts';

export interface FetchedBookResult {
  blob: Blob;
  format: 'epub' | 'txt' | 'html';
  isFallback: boolean;
  fallbackMessage?: string;
  sourceUrl?: string;
}

/**
 * Public CORS Proxy Wrappers
 */
export function wrapCorsProxy(url: string, proxyType: 'corsproxy' | 'allorigins' = 'corsproxy'): string {
  if (!url) return url;
  if (proxyType === 'corsproxy') {
    return `https://corsproxy.io/?${encodeURIComponent(url)}`;
  }
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
}

/**
 * Fetch a URL with a timeout and public CORS proxy fallbacks
 */
async function fetchWithProxyFallback(url: string, timeoutMs = 12000): Promise<Blob | null> {
  const proxies: ((u: string) => string)[] = [
    // 1. App server-side proxy route (fastest, unthrottled, handles Gutenberg headers)
    (u) => `/api/proxy-download?url=${encodeURIComponent(u)}`,
    // 2. Public CORS Proxies (for static/Vercel deployments)
    (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    // 3. Direct fetch fallback
    (u) => u,
  ];

  for (const proxyFn of proxies) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const target = proxyFn(url);
      const res = await fetch(target, { signal: controller.signal });
      clearTimeout(timer);

      if (res.ok) {
        const blob = await res.blob();
        // Ensure not an HTML error or empty response
        if (blob && blob.size > 200) {
          return blob;
        }
      }
    } catch {
      // Continue to next proxy option
    }
  }

  return null;
}

/**
 * Dynamically query Gutendex API for book metadata and best available format.
 * Prefers lightweight no-images EPUB or complete UTF-8 plain text for instant, full-book reading.
 */
export async function fetchGutendexFormats(gutenbergId: number): Promise<{
  bestUrl?: string;
  format?: 'epub' | 'html' | 'txt';
  fallbackUrl?: string;
  fallbackFormat?: 'epub' | 'html' | 'txt';
} | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

    // Gutendex is a public, CORS-enabled API
    const res = await fetch(`https://gutendex.com/books/${gutenbergId}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    const formats: Record<string, string> = data.formats || {};

    // 1. High priority: Fast, lightweight EPUB (prefer .epub.noimages to avoid 25MB image downloads)
    const rawEpub = formats['application/epub+zip'] || '';
    let epubUrl = `https://www.gutenberg.org/ebooks/${gutenbergId}.epub.noimages`;
    if (!rawEpub && formats['application/x-mobipocket-ebook']) {
      epubUrl = formats['application/x-mobipocket-ebook'];
    }

    // 2. Complete UTF-8 plain text
    const txtUrl =
      formats['text/plain; charset=utf-8'] ||
      formats['text/plain'] ||
      `https://www.gutenberg.org/ebooks/${gutenbergId}.txt.utf-8`;

    // 3. HTML format
    const htmlUrl =
      formats['text/html; charset=utf-8'] ||
      formats['text/html'];

    if (epubUrl) {
      return {
        bestUrl: epubUrl,
        format: 'epub',
        fallbackUrl: txtUrl,
        fallbackFormat: 'txt',
      };
    }

    if (txtUrl) {
      return { bestUrl: txtUrl, format: 'txt' };
    }

    if (htmlUrl) {
      return { bestUrl: htmlUrl, format: 'html' };
    }

    return null;
  } catch (err) {
    console.warn(`Gutendex dynamic lookup failed for ID ${gutenbergId}:`, err);
    return null;
  }
}

export const UNAVAILABLE_ARCHIVE_MESSAGE =
  'This book is currently unavailable from the public archive server. You can upload your own copy using the Uploader tab or try another book.';

/**
 * Fetch full book content with Gutendex dynamic lookup, CORS proxies,
 * and seamless in-app sample fallback text.
 */
export async function fetchPublicDomainBook(params: {
  id: string;
  title: string;
  author: string;
  description: string;
  gutenbergId?: number;
  staticEpubUrl?: string;
  staticTextUrl?: string;
}): Promise<FetchedBookResult> {
  const { id, title, author, description, gutenbergId, staticEpubUrl, staticTextUrl } = params;

  // 1. Dynamic Gutendex API Lookup if gutenbergId is present
  if (gutenbergId) {
    try {
      const dynamicInfo = await fetchGutendexFormats(gutenbergId);
      if (dynamicInfo) {
        if (dynamicInfo.bestUrl) {
          const blob = await fetchWithProxyFallback(dynamicInfo.bestUrl, 10000);
          if (blob) {
            return {
              blob,
              format: dynamicInfo.format || 'epub',
              isFallback: false,
              sourceUrl: dynamicInfo.bestUrl,
            };
          }
        }

        // Try text fallback if EPUB failed
        if (dynamicInfo.fallbackUrl) {
          const textBlob = await fetchWithProxyFallback(dynamicInfo.fallbackUrl, 10000);
          if (textBlob) {
            return {
              blob: textBlob,
              format: dynamicInfo.fallbackFormat || 'txt',
              isFallback: false,
              sourceUrl: dynamicInfo.fallbackUrl,
            };
          }
        }
      }
    } catch (err) {
      console.warn('Dynamic Gutendex fetch failed:', err);
    }
  }

  // 2. Try static URLs if present with CORS proxy
  const staticUrl = staticEpubUrl || staticTextUrl;
  if (staticUrl) {
    try {
      const blob = await fetchWithProxyFallback(staticUrl, 8000);
      if (blob) {
        const isEpub = staticUrl.includes('.epub');
        return {
          blob,
          format: isEpub ? 'epub' : 'txt',
          isFallback: false,
          sourceUrl: staticUrl,
        };
      }
    } catch (err) {
      console.warn('Static URL fetch failed:', err);
    }
  }

  // 3. Graceful Fallback: Embedded Public Domain Sample Text
  const fallbackText = getFallbackPublicDomainText(id, title, author, description);
  const fallbackBlob = new Blob([fallbackText], { type: 'text/plain;charset=utf-8' });

  return {
    blob: fallbackBlob,
    format: 'txt',
    isFallback: true,
    fallbackMessage: UNAVAILABLE_ARCHIVE_MESSAGE,
  };
}
