let tournament = null;

const configUrl = new URL('../config/tournament.json', document.currentScript.src);
const appUrl = new URL('app.js', document.currentScript.src);

/**
 * 检查配置请求并解析 JSON。
 * @param {Response} response - 浏览器的配置请求响应。
 * @returns {Promise<object>} 解析后的比赛配置。
 * @throws {Error} 请求未成功时抛出。
 */
function parseConfigResponse(response) {
  if (!response.ok) throw new Error('无法读取比赛配置：' + response.status);
  return response.json();
}

/**
 * 校验配置并加载页面交互代码。
 * @param {object} raw - 从 JSON 文件解析出的比赛配置。
 * @returns {void}
 */
function startApp(raw) {
  tournament = normalizeTournament(raw);
  const script = document.createElement('script');
  script.src = appUrl.href;
  script.onerror = handleAppLoadError;
  document.body.appendChild(script);
}

/**
 * 将页面代码加载失败转为可见错误。
 * @returns {void}
 */
function handleAppLoadError() {
  showLoadError(new Error('无法载入页面代码'));
}

/**
 * 在页面显示启动错误，并输出详细错误供排查。
 * @param {Error} error - 配置或脚本加载时发生的错误。
 * @returns {void}
 */
function showLoadError(error) {
  const message = document.createElement('p');
  message.textContent = '裁判表载入失败：' + error.message;
  document.body.prepend(message);
  console.error(error);
}

fetch(configUrl)
  .then(parseConfigResponse)
  .then(startApp)
  .catch(showLoadError);
