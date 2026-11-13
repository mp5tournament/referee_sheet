let tournament = null;

const configUrl = new URL('../config/tournament.json', document.currentScript.src);
const appUrl = new URL('app.js', document.currentScript.src);

fetch(configUrl)
  .then(response => {
    if (!response.ok) throw new Error('无法读取比赛配置：' + response.status);
    return response.json();
  })
  .then(raw => {
    tournament = normalizeTournament(raw);
    const script = document.createElement('script');
    script.src = appUrl.href;
    script.onerror = () => showLoadError(new Error('无法载入页面代码'));
    document.body.appendChild(script);
  })
  .catch(showLoadError);

function showLoadError(error) {
  const message = document.createElement('p');
  message.textContent = '裁判表载入失败：' + error.message;
  document.body.prepend(message);
  console.error(error);
}
