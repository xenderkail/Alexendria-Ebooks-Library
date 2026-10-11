import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Gutendex Proxy (Project Gutenberg API)
  app.get('/api/gutendex', async (req, res) => {
    try {
      const search = req.query.search ? encodeURIComponent(String(req.query.search)) : '';
      const topic = req.query.topic ? encodeURIComponent(String(req.query.topic)) : '';
      const page = req.query.page ? encodeURIComponent(String(req.query.page)) : '1';
      
      let targetUrl = `https://gutendex.com/books/?page=${page}`;
      if (search) targetUrl += `&search=${search}`;
      if (topic) targetUrl += `&topic=${topic}`;

      const response = await fetch(targetUrl, {
        headers: { 'User-Agent': 'AlexandriaDigitalLibrary/1.0' },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: 'Gutendex API returned an error' });
      }

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error('Error fetching Gutendex:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch Gutendex' });
    }
  });

  // Open Library Search Proxy
  app.get('/api/openlibrary', async (req, res) => {
    try {
      const q = req.query.q ? encodeURIComponent(String(req.query.q)) : 'literature';
      const page = req.query.page ? encodeURIComponent(String(req.query.page)) : '1';
      const targetUrl = `https://openlibrary.org/search.json?q=${q}&page=${page}&limit=20`;

      const response = await fetch(targetUrl, {
        headers: { 'User-Agent': 'AlexandriaDigitalLibrary/1.0' },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: 'Open Library returned an error' });
      }

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error('Error fetching Open Library:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch Open Library' });
    }
  });

  // Internet Archive Search Proxy
  app.get('/api/internetarchive', async (req, res) => {
    try {
      const q = req.query.q ? encodeURIComponent(String(req.query.q)) : 'subject:literature';
      const targetUrl = `https://archive.org/advancedsearch.php?q=${q}+AND+mediatype:(texts)&fl[]=identifier,title,creator,year,description,downloads,format&rows=20&page=1&output=json`;

      const response = await fetch(targetUrl, {
        headers: { 'User-Agent': 'AlexandriaDigitalLibrary/1.0' },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: 'Internet Archive returned an error' });
      }

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error('Error fetching Internet Archive:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch Internet Archive' });
    }
  });

  // Streaming CORS proxy for importing external EPUB/PDF/TXT files into IndexedDB
  app.get('/api/proxy-download', async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
      }

      // Security check: Only allow http / https
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return res.status(400).json({ error: 'Invalid URL protocol' });
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AlexandriaDigitalLibrary/1.0',
          'Accept': '*/*',
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Remote server responded with ${response.status}` });
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');

      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      console.error('Proxy download failed:', err);
      res.status(500).json({ error: err.message || 'Download proxy failed' });
    }
  });

  // Vite development mode vs production build static serve
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Alexandria Library server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
