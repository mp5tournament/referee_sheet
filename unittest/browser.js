const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startServer } = require('../scripts/serve');

// Tests run against the installed Google Chrome via Chrome DevTools Protocol.
const chrome = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/opt/google/chrome/chrome',
].find(x => x && fs.existsSync(x));

/**
 * 启动本地站点与无界面 Chrome，建立测试用的 DevTools 连接。
 * @returns {Promise<{evaluate:Function,reload:Function,close:Function}>} 页面操作接口。
 * @throws {Error} 未安装 Chrome 或浏览器启动失败时抛出。
 */
async function startBrowser() {
  if (!chrome) throw new Error('Google Chrome is required. Set CHROME_PATH to chrome.exe if needed.');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'referee-sheet-test-'));
  const { server, url } = await startServer(path.resolve(__dirname, '..'));
  const pageUrl = url;
  const child = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--remote-debugging-port=0', '--remote-allow-origins=*',
    `--user-data-dir=${profile}`,
    pageUrl,
  ], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let browserError = '';
  /**
   * 保存 Chrome 错误输出，供启动失败时报告。
   * @param {Buffer} chunk - Chrome 的错误输出片段。
   * @returns {void}
   */
  child.stderr.on('data', chunk => { browserError += chunk.toString(); });

  let port;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Browser exited: ${child.exitCode} ${browserError.slice(-500)}`);
    try {
      port = Number(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
      break;
    } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  if (!port) throw new Error('Browser debugging port did not open');
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const tab = tabs.find(x => x.type === 'page');
  if (!tab) throw new Error('Browser page did not open');
  const socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  /**
   * 将 DevTools 响应交给对应的待完成命令。
   * @param {MessageEvent} event - WebSocket 消息。
   * @returns {void}
   */
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    message.error ? waiter.reject(new Error(message.error.message)) : waiter.resolve(message.result);
  });
  /**
   * 向 Chrome DevTools Protocol 发送命令。
   * @param {string} method - 协议方法名。
   * @param {object} [params={}] - 方法参数。
   * @returns {Promise<object>} 对应命令的响应。
   */
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  /**
   * 在页面中执行表达式或无参数函数并取回普通值。
   * @param {string|Function} expression - 页面表达式或函数。
   * @returns {Promise<unknown>} 页面执行结果。
   * @throws {Error} 页面脚本抛错时抛出详细异常。
   */
  async function evaluate(expression) {
    if (typeof expression === 'function') expression = `(${expression.toString()})()`;
    const result = await send('Runtime.evaluate', {
      expression: `(${expression})`, returnByValue: true, awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }
    return result.result.value;
  }
  /**
   * 等待配置载入并完成页面初始化。
   * @returns {Promise<void>}
   * @throws {Error} 页面在等待期限内未就绪时抛出。
   */
  async function waitReady() {
    for (let i = 0; i < 100; i++) {
      try {
        if (await evaluate('document.readyState === "complete" && !!document.querySelector("#configui .round option")')) return;
      } catch { /* Page is still navigating. */ }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('Page did not finish loading');
  }
  await waitReady();
  return {
    evaluate,
    /**
     * 重新载入页面，为下一个测试恢复初始状态。
     * @returns {Promise<void>}
     */
    async reload() {
      const oldOrigin = await evaluate('performance.timeOrigin');
      await evaluate('window.onbeforeunload = null');
      await send('Page.navigate', { url: pageUrl });
      for (let i = 0; i < 100; i++) {
        try {
          if (await evaluate('performance.timeOrigin !== ' + oldOrigin)) break;
        } catch { /* Page is still navigating. */ }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      await waitReady();
    },
    /**
     * 关闭 Chrome、本地站点并清理临时配置目录。
     * @returns {Promise<void>}
     */
    async close() {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ id: ++nextId, method: 'Browser.close' }));
      }
      socket.close();
      child.kill();
      child.stdout.destroy();
      child.stderr.destroy();
      await new Promise(resolve => {
        if (child.exitCode !== null) return resolve();
        const timer = setTimeout(resolve, 1000);
        child.once('exit', () => { clearTimeout(timer); resolve(); });
      });
      try {
        await fs.promises.rm(profile, {
          recursive: true, force: true, maxRetries: 20, retryDelay: 100,
        });
      } catch (error) {
        // Chrome helpers can keep writing briefly after the parent exits.
        // An undeleted temporary profile must not fail the application tests.
        if (!['ENOTEMPTY', 'EBUSY', 'EPERM'].includes(error.code)) throw error;
      }
      await new Promise(resolve => server.close(resolve));
    },
  };
}

module.exports = { startBrowser };
