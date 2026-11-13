const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
};

function startServer(root = path.resolve(__dirname, '..'), port = 0) {
  const base = path.resolve(root);
  const server = http.createServer((request, response) => {
    if (request.method !== 'GET') {
      response.writeHead(405).end();
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
      response.writeHead(400).end();
      return;
    }
    const file = path.resolve(base, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (file !== base && !file.startsWith(base + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(response);
    });
  });
  return new Promise(resolve => {
    server.listen(port, '127.0.0.1', () => {
      resolve({ server, url: 'http://127.0.0.1:' + server.address().port + '/' });
    });
  });
}

if (require.main === module) {
  startServer(undefined, Number(process.env.PORT) || 4173)
    .then(({ url }) => console.log('Open ' + url));
}

module.exports = { startServer };
