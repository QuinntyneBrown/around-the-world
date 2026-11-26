// Serves the production build of `game` on localhost for the behaviour specs: a file when one
// matches the path, index.html for any other path (the router's deep links). Nothing else.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../dist/game/browser');
const port = Number(process.argv[2] ?? 4300);

if (!existsSync(join(root, 'index.html'))) {
  console.error(`No build in ${root}. Run \`npm run build\` first.`);
  process.exit(1);
}

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  const candidate = normalize(join(root, path));
  const isFile =
    candidate.startsWith(root) && existsSync(candidate) && statSync(candidate).isFile();
  const file = isFile ? candidate : join(root, 'index.html');
  response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
}).listen(port, 'localhost', () => console.log(`Serving ${root} on http://localhost:${port}`));
