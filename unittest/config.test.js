const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startBrowser } = require('./browser');

let browser;
before(async () => { browser = await startBrowser(); });
after(async () => { await browser?.close(); });
beforeEach(async () => { await browser.reload(); });

test('图池文本按 Mod 分组，并保留谱面顺序', async () => {
  const parsed = await browser.evaluate(() => Object.values(tournament.rounds)[0].pool);
  assert.deepEqual(parsed.NM, ['1809691', '5808007', '4565418', '3221246', '3943818']);
  assert.deepEqual(parsed.HD, ['2846585', '115352']);
  assert.deepEqual(parsed.TB, ['854972']);
  assert.equal(Object.keys(parsed).length, 7);
});

test('预设队伍填充队名、队长；取消预设会清空', async () => {
  const result = await browser.evaluate(() => {
    const select = document.querySelector('#configui select.team');
    select.value = '0'; select.onchange();
    const filled = {
      name: document.querySelector('#configui .name .red').value,
      cap: document.querySelector('#configui .cap .red').value,
    };
    select.value = ''; select.onchange();
    return { filled, cleared: {
      name: document.querySelector('#configui .name .red').value,
      cap: document.querySelector('#configui .cap .red').value,
    }};
  });
  assert.equal(result.filled.name, '好麻烦啊......');
  assert.equal(result.filled.cap, 'Akari Date');
  assert.equal(result.cleared.name, '🟥红队');
  assert.equal(result.cleared.cap, '');
});

test('配置生成编号图、可用范围、TB 和胜场数', async () => {
  const result = await browser.evaluate(() => {
    document.querySelector('#configui button').click();
    return {
      nm1: config.pool.NM1,
      tb: config.pool.TB,
      tbBid: config.tb,
      gamesToWin: config.gamestowin,
      eventTypes: events.map(x => x.type),
    };
  });
  assert.equal(result.nm1.bid, '804164');
  assert.deepEqual(result.nm1.pickable, [true, true, false]);
  assert.deepEqual(result.tb.pickable, [false, false, true]);
  assert.equal(result.tbBid, '2452465');
  assert.equal(result.gamesToWin, 5);
  assert.equal(result.eventTypes[0], 'startup');
  assert.equal(result.eventTypes.at(-1), 'settle');
  assert.equal(result.eventTypes.filter(x => x === 'ban').length, 4);
  assert.equal(result.eventTypes.filter(x => x === 'pick').length, 8);
});

test('普通选图可选 TB 开关仅影响普通选图', async () => {
  const result = await browser.evaluate(() => {
    tournament.tbPickable = true;
    document.querySelector('#configui button').click();
    return config.pool.TB.pickable;
  });
  assert.deepEqual(result, [false, true, true]);
});

test('无 TB 谱面时使用图池第一张作为预设图', async () => {
  const result = await browser.evaluate(() => {
    const round = Object.values(tournament.rounds)[0];
    delete round.pool.TB;
    document.querySelector('#configui .round').value = Object.keys(tournament.rounds)[0];
    document.querySelector('#configui button').click();
    return config.tb;
  });
  assert.equal(result, '1809691');
});

test('HTML 文本转义及多个占位符同步更新', async () => {
  const result = await browser.evaluate(() => {
    const root = document.createElement('div');
    root.innerHTML = '<span class="v_name"></span><span class="v_name"></span>';
    changeAll(root, 'name', '<b>&"');
    return [...root.children].map(x => ({ html: x.innerHTML, text: x.textContent }));
  });
  assert.equal(result.length, 2);
  assert.deepEqual(result[0], result[1]);
  assert.equal(result[0].text, '<b>&"');
  assert.ok(result[0].html.includes('&lt;b&gt;'));
});
