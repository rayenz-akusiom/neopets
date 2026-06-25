import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../rayenz-akusiom');
const PORT = Number(process.env.HUB_TEST_PORT || 4173);

const MIME = {
   '.html': 'text/html; charset=utf-8',
   '.js': 'text/javascript; charset=utf-8',
   '.css': 'text/css; charset=utf-8',
   '.json': 'application/json; charset=utf-8',
   '.png': 'image/png',
   '.gif': 'image/gif',
   '.svg': 'image/svg+xml',
   '.ico': 'image/x-icon',
};

function safePath(urlPath) {
   const decoded = decodeURIComponent(urlPath.split('?')[0]);
   const relative = decoded === '/' ? '/index.html' : decoded;
   const resolved = path.normalize(path.join(ROOT, relative));
   if (!resolved.startsWith(ROOT)) {
      return null;
   }
   return resolved;
}

const server = http.createServer((req, res) => {
   const filePath = safePath(req.url || '/');
   if (!filePath) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
   }

   fs.readFile(filePath, (err, data) => {
      if (err) {
         res.writeHead(404);
         res.end('Not found');
         return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
   });
});

server.listen(PORT, '127.0.0.1', () => {
   process.stdout.write('Hub test server listening on http://127.0.0.1:' + PORT + '\n');
});
