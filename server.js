const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Normalize
  if (pathname === '/') {
    pathname = '/index.html';
  }

  let filePath = path.join(ROOT, pathname);

  // 1. Direct file check
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return serveFile(filePath, res);
  }

  // 2. Clean URL: check if file + .html exists (e.g. /buyer/dashboard -> /buyer/dashboard.html)
  if (fs.existsSync(filePath + '.html') && fs.statSync(filePath + '.html').isFile()) {
    return serveFile(filePath + '.html', res);
  }

  // 3. Directory index check (e.g. /buyer/dashboard/ -> /buyer/dashboard/index.html)
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const indexPath = path.join(filePath, 'index.html');
    if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
      return serveFile(indexPath, res);
    }
  }

  // 404 Not Found
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(`404 Not Found: ${pathname}`);
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });

  fs.createReadStream(filePath).pipe(res);
}

server.listen(PORT, () => {
  console.log(`AgriPulse Clean URL Server running at http://localhost:${PORT}`);
});
