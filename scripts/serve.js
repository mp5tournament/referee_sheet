const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
};

/**
 * 读取并返回静态文件，文件缺失时响应 404。
 * @param {string} file - 已校验的绝对文件路径。
 * @param {http.ServerResponse} response - HTTP 响应。
 * @returns {Promise<void>}
 */
async function serveFile(file, response) {
  try {
    const stat = await fs.promises.stat(file);
    if (!stat.isFile()) throw new Error('Not a file');
    response.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
    });
    fs.createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
}

/**
 * 为指定站点目录创建受路径范围限制的请求处理函数。
 * @param {string} base - 站点根目录的绝对路径。
 * @returns {Function} HTTP 请求处理函数。
 */
function createRequestHandler(base) {
  /**
   * 检查请求方法和路径，然后发送对应静态文件。
   * @param {http.IncomingMessage} request - HTTP 请求。
   * @param {http.ServerResponse} response - HTTP 响应。
   * @returns {void}
   */
  return function handleRequest(request, response) {
    if (request.method !== 'GET') return void response.writeHead(405).end();
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
      return void response.writeHead(400).end();
    }
    const file = path.resolve(base, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (file !== base && !file.startsWith(base + path.sep))
      return void response.writeHead(403).end();
    void serveFile(file, response);
  };
}

/**
 * 在本机启动提供项目静态文件的 HTTP 服务。
 * @param {string} [root] - 站点根目录，默认使用项目根目录。
 * @param {number} [port=0] - 监听端口；0 表示由系统分配。
 * @returns {Promise<{server:http.Server,url:string}>} 服务实例和访问地址。
 */
function startServer(root = path.resolve(__dirname, '..'), port = 0) {
  const server = http.createServer(createRequestHandler(path.resolve(root)));
  return new Promise(resolve => {
    server.listen(port, '127.0.0.1', () => {
      resolve({ server, url: 'http://127.0.0.1:' + server.address().port + '/' });
    });
  });
}

/**
 * 将本地服务地址输出到终端。
 * @param {{url:string}} result - 服务启动结果。
 * @returns {void}
 */
function logServerUrl({ url }) {
  console.log('Open ' + url);
}

if (require.main === module) {
  startServer(undefined, Number(process.env.PORT) || 4173).then(logServerUrl);
}

module.exports = { startServer };
