const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { startBrowser } = require('./browser');

let browser;
before(async () => { browser = await startBrowser(); });
after(async () => { await browser?.close(); });
beforeEach(async () => { await browser.reload(); });

test('图池构建函数对单张和多张谱面分别命名', async () => {
  const result = await browser.evaluate(() => buildPool({
    pool: { NM: ['11', '22'], TB: ['33'] },
  }, {
    tbPickable: false,
    poolMod: { NM: 'NF', TB: 'NF FreeMod' },
    poolSymbol: { NM: '⚪', TB: '🟢' },
  }));
  assert.deepEqual(Object.keys(result), ['NM1', 'NM2', 'TB']);
  assert.deepEqual(result.NM2, {
    bid: '22', mod: 'NF', symbol: '⚪', pickable: [true, true, false],
  });
  assert.deepEqual(result.TB.pickable, [false, false, true]);
});

test('事件顺序与先选方分配可独立计算', async () => {
  const result = await browser.evaluate(() => {
    const types = eventTypesFromPattern('bpt');
    return { types, turns: turnAssignments(types, 'red', '红名', '蓝名') };
  });
  assert.deepEqual(result.types, [
    'startup', 'ban', 'ban', 'pick', 'pick', 'tb', 'settle',
  ]);
  assert.deepEqual(result.turns.slice(1, 5), [
    { color: '蓝队', team: '蓝名' },
    { color: '红队', team: '红名' },
    { color: '红队', team: '红名' },
    { color: '蓝队', team: '蓝名' },
  ]);
});

test('比分计算不修改输入状态', async () => {
  const result = await browser.evaluate(() => {
    const previous = { sr: 2, sb: 1 };
    const next = scoreAfter(previous, 'blue');
    return { previous, next, noWinner: scoreAfter(previous, '') };
  });
  assert.deepEqual(result.previous, { sr: 2, sb: 1 });
  assert.deepEqual(result.next, { sr: 2, sb: 2 });
  assert.deepEqual(result.noWinner, { sr: 2, sb: 1 });
});

test('多 TB 事件同时要求选图和胜者', async () => {
  const result = await browser.evaluate(() => {
    const match = {
      pool: { TB1: { bid: '123', mod: 'NF FreeMod' } },
      red: { name: '甲' }, blue: { name: '乙' },
    };
    const event = { type: 'tb' };
    const previous = { sr: 4, sb: 4 };
    return {
      incomplete: calculateEvent(event, previous, { map: 'TB1', win: '' },
        match, { tbOnlyOne: false }),
      complete: calculateEvent(event, previous, { map: 'TB1', win: 'blue' },
        match, { tbOnlyOne: false }),
    };
  });
  assert.deepEqual(result.incomplete.steps, [true, false]);
  assert.deepEqual(result.complete.steps, [true, true]);
  assert.deepEqual(result.complete.state, {
    sr: 4, sb: 5, map: 'TB1', win: 'blue',
  });
  assert.equal(result.complete.values.bid, '123');
});

test('导出文本函数不依赖页面节点', async () => {
  const result = await browser.evaluate(() => {
    const match = {
      round: '决赛', red: { name: '甲' }, blue: { name: '乙' },
    };
    const records = [
      { type: 'startup', note: '赛前备注' },
      { type: 'ban', color: '蓝队', map: '0', note: '' },
      { type: 'pick', color: '红队', map: 'NM1', win: 'red', note: '选图备注' },
      { type: 'settle', sr: 1, sb: 0, note: '' },
    ];
    return {
      record: formatMatchRecord('比赛', match, 'red', '42/', records),
      mainsheet: formatMainSheetText('red', [
        { color: '蓝队', map: 'NM2' },
        { color: '红队', map: 'HD1' },
      ]),
    };
  });
  assert.equal(result.record.title, '比赛 决赛 甲 vs 乙');
  assert.ok(result.record.text.includes('https://osu.ppy.sh/community/matches/42'));
  assert.ok(result.record.text.includes('🟦ban 空'));
  assert.ok(result.record.text.includes('🟥|🟥 NM1（选图备注）'));
  assert.equal(result.mainsheet, '红队\tHD1\tNM2');
});
