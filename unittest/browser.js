const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startServer } = require('../scripts/serve');

/**
 * 查找当前机器上的 Google Chrome。
 * @returns {string|null} 可执行文件路径；未找到时为空。
 */
function findChrome() {
  for (const candidate of [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/opt/google/chrome/chrome',
  ]) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * 等待指定的毫秒数。
 * @param {number} milliseconds - 等待时长。
 * @returns {Promise<void>}
 */
function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

/**
 * 启动无界面 Chrome 并收集其启动错误。
 * @param {string} chrome - Chrome 可执行文件路径。
 * @param {string} profile - 临时浏览器配置目录。
 * @param {string} pageUrl - 测试页面地址。
 * @returns {{child:import('node:child_process').ChildProcess,getError:Function}} 进程及错误读取函数。
 */
function launchChrome(chrome, profile, pageUrl) {
  const child = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--remote-debugging-port=0', '--remote-allow-origins=*',
    `--user-data-dir=${profile}`, pageUrl,
  ], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let errorOutput = '';
  child.stderr.on('data', chunk => { errorOutput += chunk.toString(); });
  return { child, getError: () => errorOutput };
}

/**
 * 等待 Chrome 写出 DevTools 端口文件。
 * @param {string} profile - 临时浏览器配置目录。
 * @param {import('node:child_process').ChildProcess} child - Chrome 进程。
 * @param {Function} getError - 读取 Chrome 错误输出的函数。
 * @returns {Promise<number>} DevTools 监听端口。
 */
async function waitForDebugPort(profile, child, getError) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null)
      throw new Error(`Browser exited: ${child.exitCode} ${getError().slice(-500)}`);
    try {
      return Number(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
    } catch { await delay(100); }
  }
  throw new Error('Browser debugging port did not open');
}

/**
 * 连接到 Chrome 打开的页面 DevTools WebSocket。
 * @param {number} port - DevTools 监听端口。
 * @returns {Promise<WebSocket>} 已连接的页面 WebSocket。
 */
async function connectToPage(port) {
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const tab = tabs.find(item => item.type === 'page');
  if (!tab) throw new Error('Browser page did not open');
  const socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  return socket;
}

/**
 * 构造发送命令、执行页面代码和关闭浏览器的协议接口。
 * @param {WebSocket} socket - 已连接的 DevTools WebSocket。
 * @returns {{send:Function,evaluate:Function,close:Function}} 协议操作接口。
 */
function createProtocolClient(socket) {
  let nextId = 0;
  const pending = new Map();
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
   * @param {string} method - 协议方法。
   * @param {object} [params={}] - 方法参数。
   * @returns {Promise<object>} 命令响应。
   */
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  /**
   * 在页面中执行表达式或无参数函数。
   * @param {string|Function} expression - 页面表达式或函数。
   * @returns {Promise<unknown>} 页面执行结果。
   */
  async function evaluate(expression) {
    if (typeof expression === 'function') expression = `(${expression.toString()})()`;
    const result = await send('Runtime.evaluate', {
      expression: `(${expression})`, returnByValue: true, awaitPromise: true,
    });
    if (result.exceptionDetails)
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }

  /**
   * 请求关闭浏览器并断开 WebSocket。
   * @returns {void}
   */
  function close() {
    if (socket.readyState === WebSocket.OPEN)
      socket.send(JSON.stringify({ id: ++nextId, method: 'Browser.close' }));
    socket.close();
  }
  return { send, evaluate, close };
}

/**
 * 等待页面及异步加载的比赛配置就绪。
 * @param {Function} evaluate - 页面表达式执行函数。
 * @returns {Promise<void>}
 */
async function waitReady(evaluate) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if (await evaluate('document.readyState === "complete" && !!document.querySelector("#configui .round option")')) return;
    } catch { /* 页面正在导航。 */ }
    await delay(50);
  }
  throw new Error('Page did not finish loading');
}

/**
 * 重新载入测试页面并等待新的页面初始化。
 * @param {object} client - DevTools 协议接口。
 * @param {string} pageUrl - 测试页面地址。
 * @returns {Promise<void>}
 */
async function reloadPage(client, pageUrl) {
  const oldOrigin = await client.evaluate('performance.timeOrigin');
  await client.evaluate('window.onbeforeunload = null');
  await client.send('Page.navigate', { url: pageUrl });
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if (await client.evaluate('performance.timeOrigin !== ' + oldOrigin)) break;
    } catch { /* 页面正在导航。 */ }
    await delay(50);
  }
  await waitReady(client.evaluate);
}

/**
 * 等待 Chrome 主进程退出，最多等待一秒。
 * @param {import('node:child_process').ChildProcess} child - Chrome 进程。
 * @returns {Promise<void>}
 */
function waitForChildExit(child) {
  return new Promise(resolve => {
    if (child.exitCode !== null) return resolve();
    const timer = setTimeout(resolve, 1000);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
  });
}

/**
 * 清理 Chrome 配置目录；子进程短暂占用时不影响应用测试结果。
 * @param {string} profile - 临时浏览器配置目录。
 * @returns {Promise<void>}
 */
async function removeProfile(profile) {
  try {
    await fs.promises.rm(profile, {
      recursive: true, force: true, maxRetries: 20, retryDelay: 100,
    });
  } catch (error) {
    if (!['ENOTEMPTY', 'EBUSY', 'EPERM'].includes(error.code)) throw error;
  }
}

/**
 * 启动本地站点与 Chrome，建立测试用的页面操作接口。
 * @returns {Promise<{evaluate:Function,reload:Function,close:Function}>} 页面操作接口。
 */
async function startBrowser() {
  const chrome = findChrome();
  if (!chrome) throw new Error('Google Chrome is required. Set CHROME_PATH to chrome.exe if needed.');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'referee-sheet-test-'));
  const { server, url } = await startServer(path.resolve(__dirname, '..'));
  const { child, getError } = launchChrome(chrome, profile, url);
  const port = await waitForDebugPort(profile, child, getError);
  const client = createProtocolClient(await connectToPage(port));
  await waitReady(client.evaluate);
  return {
    evaluate: client.evaluate,
    /**
     * 重新载入页面。
     * @returns {Promise<void>}
     */
    async reload() { await reloadPage(client, url); },
    /**
     * 关闭浏览器、站点并清理临时目录。
     * @returns {Promise<void>}
     */
    async close() {
      client.close();
      child.kill();
      child.stdout.destroy();
      child.stderr.destroy();
      await waitForChildExit(child);
      await removeProfile(profile);
      await new Promise(resolve => server.close(resolve));
    },
  };
}

module.exports = { startBrowser };
