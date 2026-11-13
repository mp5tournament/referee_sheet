const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startBrowser } = require('./browser');

let browser;
before(async () => { browser = await startBrowser(); });
after(async () => { await browser?.close(); });
beforeEach(async () => { await browser.reload(); });

test('命令模板生成变量占位符与分步区域', async () => {
  const result = await browser.evaluate(() => ({
    startup: document.querySelector('.part.startup .command').textContent,
    variableCount: document.querySelectorAll('.part.startup .v_red').length,
    pickSteps: document.querySelectorAll('.part.pick .step').length,
    generalSeparators: document.querySelectorAll('#general .command hr').length,
  }));
  assert.ok(result.startup.includes('!MP MAKE'));
  assert.ok(result.variableCount > 0);
  assert.equal(result.pickSteps, 2);
  assert.equal(result.generalSeparators, 1);
});

test('辅助列表生成图池 MAP/MOD 和队员邀请命令', async () => {
  const result = await browser.evaluate(() => {
    const team = document.querySelector('#configui select.team');
    team.value = '0'; team.onchange();
    document.querySelector('#configui button').click();
    return {
      map: document.querySelector('#assist_pool .map').title,
      mod: document.querySelector('#assist_pool .mod').title,
      invite: document.querySelector('#assist_player a').title,
      count: document.querySelectorAll('#assist_player tr').length,
    };
  });
  assert.ok(result.map.startsWith('!MP MAP '));
  assert.ok(result.mod.startsWith('!MP MODS '));
  assert.equal(result.invite, '!MP INVITE Akari Date');
  assert.equal(result.count, 6);
});

test('辅助图池与队员面板可分别切换显示', async () => {
  const result = await browser.evaluate(() => {
    const pool = document.querySelector('#show_assist_pool');
    const player = document.querySelector('#show_assist_player');
    pool.click();
    const afterPool = [
      document.querySelector('#assist_pool_out').classList.contains('hidden'),
      document.querySelector('#assist_player_out').classList.contains('hidden'),
    ];
    player.click();
    pool.click();
    return { afterPool, final: [
      document.querySelector('#assist_pool_out').classList.contains('hidden'),
      document.querySelector('#assist_player_out').classList.contains('hidden'),
    ]};
  });
  assert.deepEqual(result.afterPool, [false, true]);
  assert.deepEqual(result.final, [true, false]);
});

test('复制命令使用原始文本，包括空字符串', async () => {
  const result = await browser.evaluate(() => {
    const copied = [];
    document.execCommand = () => {
      copied.push(document.querySelector('body > textarea').value);
      return true;
    };
    copyText(null, '<b>&');
    copyText(null, '');
    return copied;
  });
  assert.deepEqual(result, ['<b>&', '']);
});

test('主表格文本包含先选方以及红蓝两队禁图', async () => {
  const result = await browser.evaluate(() => {
    document.querySelector('#configui button').click();
    const start = events[0].dom.querySelector('select');
    start.value = 'red'; partOnChange(start);
    const first = events[1].dom.querySelector('select.map');
    first.value = 'NM1'; partOnChange(first);
    const second = events[2].dom.querySelector('select.map');
    second.value = 'HD1'; partOnChange(second);
    let copied = null;
    copyText = (_, text) => { copied = text; };
    document.querySelector('#copy_mainsheet_text').click();
    return copied;
  });
  assert.equal(result, '红队\tHD1\tNM1');
});

test('保存比赛记录包含链接、比分、禁图、选图和胜者', async () => {
  const result = await browser.evaluate(async () => {
    document.querySelector('#configui button').click();
    config.gamestowin = 1;
    events[0].dom.querySelector('input').value = 'https://osu.ppy.sh/community/matches/12345/';
    const start = events[0].dom.querySelector('select');
    start.value = 'red'; partOnChange(start);
    const ban1 = events[1].dom.querySelector('select.map');
    ban1.value = 'NM1'; partOnChange(ban1);
    const ban2 = events[2].dom.querySelector('select.map');
    ban2.value = '0'; partOnChange(ban2);
    const map = events[3].dom.querySelector('select.map');
    map.value = 'HD1'; partOnChange(map);
    const win = events[3].dom.querySelector('select.team');
    win.value = 'red'; partOnChange(win);
    let blob;
    let filename;
    URL.createObjectURL = value => { blob = value; return 'blob:test'; };
    URL.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = function() { filename = this.download; };
    document.querySelector('#export').onclick();
    return { filename, text: await blob.text() };
  });
  assert.ok(result.filename.endsWith('.txt'));
  assert.ok(result.text.includes('https://osu.ppy.sh/community/matches/12345'));
  assert.ok(result.text.includes('红队 1:0 蓝队'));
  assert.ok(result.text.includes('🟦ban NM1'));
  assert.ok(result.text.includes('🟥ban 空'));
  assert.ok(result.text.includes('🟥|🟥 HD1'));
  assert.ok(result.text.includes('🟥红队获胜'));
});
