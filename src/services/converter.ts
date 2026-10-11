import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { pdfjsLib } from './pdfWorker.ts';
import ePub from 'epubjs';

/**
 * Trigger browser file download from Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Real client-side TXT to PDF converter using jsPDF
 */
export async function convertTxtToPdf(
  textContent: string,
  title: string,
  author = 'Public Domain / Alexandria Library'
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 7;
  let cursorY = margin;

  // Title page / Header
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.text(title, margin, cursorY);
  cursorY += 10;

  doc.setFont('times', 'italic');
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`By ${author}`, margin, cursorY);
  cursorY += 8;

  // Hairline separator
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 10;

  // Body text
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);

  const paragraphs = textContent.split(/\r?\n\r?\n/);

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    const wrappedLines = doc.splitTextToSize(trimmed, contentWidth);

    for (const line of wrappedLines) {
      if (cursorY + lineHeight > pageHeight - margin) {
        doc.addPage();
        cursorY = margin;

        // Running header
        doc.setFont('times', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(title, margin, cursorY - 5);
        doc.line(margin, cursorY - 3, pageWidth - margin, cursorY - 3);

        doc.setFont('times', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 30);
      }
      doc.text(line, margin, cursorY);
      cursorY += lineHeight;
    }

    cursorY += 4; // Paragraph gap
  }

  // Add page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  return doc.output('blob');
}

/**
 * Real client-side TXT to HTML converter
 */
export function convertTxtToHtml(
  textContent: string,
  title: string,
  author = 'Alexandria Digital Library',
  isRtl = false
): Blob {
  const paragraphs = textContent
    .split(/\r?\n\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      // Escape HTML
      const escaped = p
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\n/g, '<br/>');
      return `<p>${escaped}</p>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="${isRtl ? 'ur' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${author}</title>
  <style>
    body {
      background-color: #FBF9F5;
      color: #1C1917;
      font-family: ${isRtl ? "'Noto Nastaliq Urdu', serif" : "'Lora', Georgia, serif"};
      line-height: ${isRtl ? '2.4' : '1.85'};
      margin: 0;
      padding: 3rem 1.5rem;
      text-rendering: optimizeLegibility;
    }
    .container {
      max-width: 680px;
      margin: 0 auto;
    }
    header {
      border-bottom: 1px solid #E5E0D8;
      padding-bottom: 2rem;
      margin-bottom: 2.5rem;
      text-align: ${isRtl ? 'right' : 'left'};
    }
    h1 {
      font-size: 2.25rem;
      font-weight: 600;
      margin: 0 0 0.5rem 0;
      color: #1C1917;
    }
    .author {
      font-size: 1.1rem;
      color: #78716C;
      font-style: italic;
    }
    p {
      margin-bottom: 1.5rem;
      font-size: 1.125rem;
      text-align: justify;
    }
    footer {
      margin-top: 4rem;
      padding-top: 1.5rem;
      border-top: 1px solid #E5E0D8;
      font-size: 0.875rem;
      color: #A8A29E;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${title}</h1>
      <div class="author">By ${author}</div>
    </header>
    <main>
      ${paragraphs}
    </main>
    <footer>
      Produced by Alexandria Digital Library
    </footer>
  </div>
</body>
</html>`;

  return new Blob([html], { type: 'text/html;charset=utf-8' });
}

/**
 * Real client-side TXT to EPUB generator
 * Creates a valid Open Container Format (OCF) EPUB package
 */
export async function convertTxtToEpub(
  textContent: string,
  title: string,
  author = 'Alexandria Digital Library',
  isRtl = false
): Promise<Blob> {
  const zip = new JSZip();

  // 1. mimetype (MUST be first file, uncompressed in standard specs)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.file('META-INF/container.xml', containerXml);

  // Split into manageable chapters if text has markdown or chapter headers
  const lines = textContent.split(/\r?\n/);
  const chapters: { title: string; content: string[] }[] = [];
  let currentChapter = { title: 'Chapter 1', content: [] as string[] };

  for (const line of lines) {
    if (/^(chapter|part|section|ردیف|غزل|بند)\s+/i.test(line.trim())) {
      if (currentChapter.content.length > 0) {
        chapters.push(currentChapter);
      }
      currentChapter = { title: line.trim(), content: [] };
    } else {
      currentChapter.content.push(line);
    }
  }
  if (currentChapter.content.length > 0 || chapters.length === 0) {
    chapters.push(currentChapter);
  }

  // 3. OEBPS/chapterX.xhtml files
  const manifestItems: string[] = [];
  const spineItems: string[] = [];
  const navPoints: string[] = [];

  chapters.forEach((ch, idx) => {
    const id = `chapter_${idx + 1}`;
    const filename = `chapter_${idx + 1}.xhtml`;

    manifestItems.push(`<item id="${id}" href="${filename}" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="${id}"/>`);
    navPoints.push(`
      <navPoint id="nav_${id}" playOrder="${idx + 1}">
        <navLabel><text>${ch.title}</text></navLabel>
        <content src="${filename}"/>
      </navPoint>
    `);

    const chapterHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${isRtl ? 'ur' : 'en'}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <title>${ch.title}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h2>${ch.title}</h2>
  ${ch.content
    .join('\n')
    .split(/\r?\n\r?\n/)
    .filter((p) => p.trim())
    .map((p) => `<p>${p.trim().replace(/\n/g, '<br/>')}</p>`)
    .join('\n')}
</body>
</html>`;

    zip.file(`OEBPS/${filename}`, chapterHtml);
  });

  // 4. OEBPS/style.css
  const css = `
body {
  font-family: ${isRtl ? "'Noto Nastaliq Urdu', serif" : "Georgia, serif"};
  line-height: ${isRtl ? '2.4' : '1.8'};
  padding: 5%;
  color: #1a1a1a;
}
h2 {
  font-size: 1.6em;
  margin-bottom: 1em;
  border-bottom: 1px solid #ccc;
  padding-bottom: 0.3em;
}
p {
  margin-bottom: 1.2em;
  text-indent: 1.2em;
}
`;
  zip.file('OEBPS/style.css', css);

  // 5. OEBPS/toc.ncx
  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:alexandria-${Date.now()}"/>
    <meta name="dtb:depth" content="1"/>
  </head>
  <docTitle><text>${title}</text></docTitle>
  <docAuthor><text>${author}</text></docAuthor>
  <navMap>
    ${navPoints.join('\n')}
  </navMap>
</ncx>`;
  zip.file('OEBPS/toc.ncx', tocNcx);

  // 6. OEBPS/content.opf
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${title}</dc:title>
    <dc:creator>${author}</dc:creator>
    <dc:identifier id="BookId">urn:uuid:alexandria-${Date.now()}</dc:identifier>
    <dc:language>${isRtl ? 'ur' : 'en'}</dc:language>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`;
  zip.file('OEBPS/content.opf', contentOpf);

  return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
}

/**
 * Extract plain text from PDF using pdfjs-dist
 */
export async function extractTextFromPdf(pdfBlob: Blob): Promise<string> {
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pageTexts: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const strings = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .filter(Boolean);
    pageTexts.push(`--- PAGE ${i} ---\n` + strings.join(' '));
  }

  return pageTexts.join('\n\n');
}

/**
 * Extract plain text from EPUB using epubjs
 */
export async function extractTextFromEpub(epubBlob: Blob): Promise<string> {
  const arrayBuffer = await epubBlob.arrayBuffer();
  const book = ePub(arrayBuffer);
  await book.ready;

  const spine = (book as any).spine;
  if (!spine || !spine.items) {
    return 'Could not parse EPUB spine content.';
  }

  const textSections: string[] = [];

  for (let i = 0; i < spine.items.length; i++) {
    const item = spine.items[i];
    try {
      const doc = await item.load(book.load.bind(book));
      if (doc && doc.body) {
        const text = doc.body.innerText || doc.body.textContent || '';
        if (text.trim()) {
          textSections.push(text.trim());
        }
      }
    } catch (err) {
      console.warn(`Could not load spine item ${i}:`, err);
    }
  }

  return textSections.join('\n\n--- SECTION BREAK ---\n\n');
}
