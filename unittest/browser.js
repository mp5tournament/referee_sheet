const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// Tests run against the installed Google Chrome via Chrome DevTools Protocol.
const chrome = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/opt/google/chrome/chrome',
].find(x => x && fs.existsSync(x));

async function startBrowser() {
  if (!chrome) throw new Error('Google Chrome is required. Set CHROME_PATH to chrome.exe if needed.');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'referee-sheet-test-'));
  const pageUrl = pathToFileURL(process.env.REFEREE_SHEET_HTML || path.resolve(__dirname, '..', 'index.html')).href;
  const child = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--remote-debugging-port=0', '--remote-allow-origins=*',
    `--user-data-dir=${profile}`,
    pageUrl,
  ], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let browserError = '';
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
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    message.error ? waiter.reject(new Error(message.error.message)) : waiter.resolve(message.result);
  });
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
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
    async close() {
      socket.close();
      child.kill();
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    },
  };
}

module.exports = { startBrowser };
