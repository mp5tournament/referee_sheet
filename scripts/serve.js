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
 * 在本机启动提供项目静态文件的 HTTP 服务。
 * @param {string} [root] - 站点根目录，默认使用项目根目录。
 * @param {number} [port=0] - 监听端口；0 表示由系统分配。
 * @returns {Promise<{server:http.Server,url:string}>} 服务实例和访问地址。
 */
function startServer(root = path.resolve(__dirname, '..'), port = 0) {
  const base = path.resolve(root);
  /**
   * 处理静态文件请求并限制访问范围为站点目录。
   * @param {http.IncomingMessage} request - HTTP 请求。
   * @param {http.ServerResponse} response - HTTP 响应。
   * @returns {void}
   */
  function handleRequest(request, response) {
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
    /**
     * 根据文件状态返回文件内容或 404。
     * @param {NodeJS.ErrnoException|null} error - 文件检查错误。
     * @param {fs.Stats} stat - 文件状态。
     * @returns {void}
     */
    function sendFile(error, stat) {
      if (error || !stat.isFile()) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(response);
    }
    fs.stat(file, sendFile);
  }
  const server = http.createServer(handleRequest);
  /**
   * 等待监听端口就绪后返回实际访问地址。
   * @param {Function} resolve - Promise 完成函数。
   * @returns {void}
   */
  function listen(resolve) {
    /**
     * 在开始监听后完成启动 Promise。
     * @returns {void}
     */
    function onListening() {
      resolve({ server, url: 'http://127.0.0.1:' + server.address().port + '/' });
    }
    server.listen(port, '127.0.0.1', onListening);
  }
  return new Promise(listen);
}

if (require.main === module) {
  /**
   * 将本地服务地址输出到终端。
   * @param {{url:string}} result - 服务启动结果。
   * @returns {void}
   */
  function logServerUrl({ url }) {
    console.log('Open ' + url);
  }
  startServer(undefined, Number(process.env.PORT) || 4173)
    .then(logServerUrl);
}

module.exports = { startServer };
