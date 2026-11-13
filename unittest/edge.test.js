const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startBrowser } = require('./browser');

let browser;
before(async () => { browser = await startBrowser(); });
after(async () => { await browser?.close(); });
beforeEach(async () => { await browser.reload(); });

test('切换轮次会重建图池和比赛事件', async () => {
  const result = await browser.evaluate(() => {
    document.querySelector('#configui button').click();
    const oldBid = config.pool.NM1.bid;
    const first = events[0].dom.querySelector('select');
    first.value = 'red'; partOnChange(first);
    document.querySelector('#config').click();
    window.confirm = () => true;
    document.querySelector('#configui .round').value = Object.keys(tournament.rounds)[0];
    document.querySelector('#configui button').click();
    return {
      oldBid, newBid: config.pool.NM1.bid, round: config.round,
      firstPick, firstEvent: events[0].type,
      firstBanHidden: events[1].dom.classList.contains('hidden'),
    };
  });
  assert.equal(result.oldBid, '804164');
  assert.equal(result.newBid, '1809691');
  assert.equal(result.round, '瑞士轮（一）');
  assert.equal(result.firstEvent, 'startup');
  assert.equal(result.firstBanHidden, true);
});

test('修改早期选图胜者会重算后续比分', async () => {
  const result = await browser.evaluate(() => {
    document.querySelector('#configui button').click();
    const first = events[0].dom.querySelector('select');
    first.value = 'red'; partOnChange(first);
    for (let n of [1, 2]) {
      const ban = events[n].dom.querySelector('select.map');
      ban.value = '0'; partOnChange(ban);
    }
    for (let n of [3, 4]) {
      const map = events[n].dom.querySelector('select.map');
      map.value = n === 3 ? 'NM1' : 'NM2'; partOnChange(map);
      const win = events[n].dom.querySelector('select.team');
      win.value = 'red'; partOnChange(win);
    }
    const before = [events[4].sr, events[4].sb];
    const win = events[3].dom.querySelector('select.team');
    win.value = 'blue'; partOnChange(win);
    return { before, after: [events[4].sr, events[4].sb],
      next: [events[5].sr, events[5].sb] };
  });
  assert.deepEqual(result.before, [2, 0]);
  assert.deepEqual(result.after, [1, 1]);
  assert.deepEqual(result.next, [1, 1]);
});

test('多 TB 配置生成两张可选 TB 图', async () => {
  const result = await browser.evaluate(() => {
    tournament.tbOnlyOne = false;
    const round = Object.values(tournament.rounds)[0];
    round.pool.TB.push('123456');
    document.querySelector('#configui .round').value = Object.keys(tournament.rounds)[0];
    document.querySelector('#configui button').click();
    return {
      tb1: config.pool.TB1, tb2: config.pool.TB2,
      choices: [...events.find(x => x.type === 'tb').dom.querySelector('select.map').options]
        .map(x => x.value),
    };
  });
  assert.equal(result.tb1.bid, '854972');
  assert.equal(result.tb2.bid, '123456');
  assert.deepEqual(result.tb1.pickable, [false, false, true]);
  assert.ok(result.choices.includes('TB1'));
  assert.ok(result.choices.includes('TB2'));
});

test('未配置比赛时保存记录不会下载文件', async () => {
  const result = await browser.evaluate(() => {
    let downloads = 0;
    URL.createObjectURL = () => { downloads++; return 'blob:test'; };
    document.querySelector('#export').onclick();
    return downloads;
  });
  assert.equal(result, 0);
});
