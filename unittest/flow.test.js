const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startBrowser } = require('./browser');

let browser;
before(async () => { browser = await startBrowser(); });
after(async () => { await browser?.close(); });
beforeEach(async () => { await browser.reload(); });

test('开始前必须选择先选方，选择后才显示第一步禁图', async () => {
  const result = await browser.evaluate(() => {
    document.querySelector('#configui button').click();
    const before = events[1].dom.classList.contains('hidden');
    const select = events[0].dom.querySelector('select');
    select.value = 'red'; partOnChange(select);
    return { before, after: events[1].dom.classList.contains('hidden'),
      firstPick, firstBan: events[1].color, nextBan: events[2].color };
  });
  assert.equal(result.before, true);
  assert.equal(result.after, false);
  assert.equal(result.firstPick, 'red');
  assert.equal(result.firstBan, '蓝队');
  assert.equal(result.nextBan, '红队');
});

test('蓝队先选时，首个禁图与选图顺序相应交换', async () => {
  const result = await browser.evaluate(() => {
    document.querySelector('#configui button').click();
    const select = events[0].dom.querySelector('select');
    select.value = 'blue'; partOnChange(select);
    return events.slice(1, 5).map(x => ({ type: x.type, color: x.color }));
  });
  assert.deepEqual(result, [
    { type: 'ban', color: '红队' },
    { type: 'ban', color: '蓝队' },
    { type: 'pick', color: '蓝队' },
    { type: 'pick', color: '红队' },
  ]);
});

test('空禁图可推进，普通禁图会显示谱面 ID', async () => {
  const result = await browser.evaluate(() => {
    document.querySelector('#configui button').click();
    const start = events[0].dom.querySelector('select');
    start.value = 'red'; partOnChange(start);
    const ban = events[1].dom.querySelector('select.map');
    ban.value = '0'; partOnChange(ban);
    const empty = { map: events[1].map, nextVisible: !events[2].dom.classList.contains('hidden'),
      rendered: events[1].dom.querySelector('.v_bid').textContent };
    ban.value = 'NM1'; partOnChange(ban);
    return { empty, normal: events[1].dom.querySelector('.v_bid').textContent };
  });
  assert.deepEqual(result.empty, { map: '0', nextVisible: true, rendered: '空' });
  assert.equal(result.normal, '804164');
});

test('选图必须同时填写谱面与胜者，比分才计入并推进', async () => {
  const result = await browser.evaluate(() => {
    document.querySelector('#configui button').click();
    const start = events[0].dom.querySelector('select');
    start.value = 'red'; partOnChange(start);
    for (let n of [1, 2]) {
      const select = events[n].dom.querySelector('select.map');
      select.value = '0'; partOnChange(select);
    }
    const pick = events[3];
    const map = pick.dom.querySelector('select.map');
    map.value = 'NM1'; partOnChange(map);
    const before = { score: [pick.sr, pick.sb], nextHidden: events[4].dom.classList.contains('hidden') };
    const win = pick.dom.querySelector('select.team');
    win.value = 'blue'; partOnChange(win);
    return { before, after: { score: [pick.sr, pick.sb], nextHidden: events[4].dom.classList.contains('hidden') } };
  });
  assert.deepEqual(result.before, { score: [0, 0], nextHidden: true });
  assert.deepEqual(result.after, { score: [0, 1], nextHidden: false });
});

test('达到目标胜场后跳到结算，修改前一步会撤回后续阶段', async () => {
  const result = await browser.evaluate(() => {
    document.querySelector('#configui button').click();
    config.gamestowin = 1;
    const start = events[0].dom.querySelector('select');
    start.value = 'red'; partOnChange(start);
    for (let n of [1, 2]) {
      const select = events[n].dom.querySelector('select.map');
      select.value = '0'; partOnChange(select);
    }
    const pick = events[3];
    const map = pick.dom.querySelector('select.map');
    const win = pick.dom.querySelector('select.team');
    map.value = 'NM1'; partOnChange(map);
    win.value = 'red'; partOnChange(win);
    const settled = {
      score: [events.at(-1).sr, events.at(-1).sb],
      winner: events.at(-1).dom.querySelector('.v_team').textContent,
      settleVisible: !events.at(-1).dom.classList.contains('hidden'),
      nextHidden: events[4].dom.classList.contains('hidden'),
    };
    win.value = ''; partOnChange(win);
    return { settled, rolledBack: {
      settleHidden: events.at(-1).dom.classList.contains('hidden'),
      nextHidden: events[4].dom.classList.contains('hidden'),
    }};
  });
  assert.deepEqual(result.settled, {
    score: [1, 0], winner: '红队', settleVisible: true, nextHidden: true,
  });
  assert.deepEqual(result.rolledBack, { settleHidden: true, nextHidden: true });
});

test('重新初始化清除旧事件并重建辅助列表', async () => {
  const result = await browser.evaluate(() => {
    document.querySelector('#configui button').click();
    const count = events.length;
    document.querySelector('#config').click();
    window.confirm = () => true;
    document.querySelector('#configui button').click();
    return {
      count, newCount: events.length, mainParts: document.querySelectorAll('#main > .part').length,
      poolLines: document.querySelectorAll('#assist_pool .assist_pool_line').length,
      configHidden: document.querySelector('#configui').classList.contains('hidden'),
    };
  });
  assert.equal(result.count, result.newCount);
  assert.equal(result.mainParts, result.count);
  assert.ok(result.poolLines > 0);
  assert.equal(result.configHidden, true);
});

test('完整比赛在 4:4 后进入 TB，并以 5:4 结算', async () => {
  const result = await browser.evaluate(() => {
    document.querySelector('#configui button').click();
    const first = events[0].dom.querySelector('select');
    first.value = 'red'; partOnChange(first);
    let pickCount = 0;
    for (const event of events) {
      if (event.type === 'ban') {
        const map = event.dom.querySelector('select.map');
        map.value = '0'; partOnChange(map);
      } else if (event.type === 'pick') {
        const map = event.dom.querySelector('select.map');
        map.value = 'NM1'; partOnChange(map);
        const win = event.dom.querySelector('select.team');
        win.value = pickCount++ % 2 === 0 ? 'red' : 'blue';
        partOnChange(win);
      }
    }
    const tb = events.find(event => event.type === 'tb');
    const before = {
      score: [tb.sr, tb.sb],
      tbVisible: !tb.dom.classList.contains('hidden'),
      settleHidden: events.at(-1).dom.classList.contains('hidden'),
    };
    const win = tb.dom.querySelector('select.team');
    win.value = 'red'; partOnChange(win);
    return { before, after: {
      score: [events.at(-1).sr, events.at(-1).sb],
      settleVisible: !events.at(-1).dom.classList.contains('hidden'),
    }};
  });
  assert.deepEqual(result.before, {
    score: [4, 4], tbVisible: true, settleHidden: true,
  });
  assert.deepEqual(result.after, {
    score: [5, 4], settleVisible: true,
  });
});
