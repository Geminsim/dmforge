import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('standalone player sheet is a single self-contained offline document', async () => {
  const html = await readFile(new URL('../public/player-character-sheet.html', import.meta.url), 'utf8');
  assert.match(html, /DMForge 玩家角色卡/);
  assert.match(html, /data:image\/(?:png|svg\+xml);base64,/);
  assert.match(html, /class="panel collapsible-panel"/);
  assert.match(html, /dmforge-player-character-v1/);
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  assert.doesNotMatch(html, /<link[^>]+href=/i);
  for (const label of ['角色姓名','玩家姓名','背景','阵营','职业','子职业','种族','等级','熟练加值','六维属性','攻击与施法','装备 / 物品栏','职业与子职业特性','专长']) assert.match(html, new RegExp(label.replace('/', '\\/')));
  for (const label of ['角色形象', '角色头像', '角色肖像', 'avatar-file', 'portrait-file', 'avatar-cropper', 'crop-zoom', '水平位置', '垂直位置']) assert.match(html, new RegExp(label));
  for (const ruleText of ['规则参考', 'v0.9.1', '普通攻击', '斗气系统', '跑打', '荣誉行刑官', '枪械与超常格斗']) assert.match(html, new RegExp(ruleText));
  assert.match(html, /id="rules-search"/);
  assert.match(html, /data-view="rules"/);
  assert.match(html, /打开完整规则书 PDF/);
  assert.match(html, /sf6-rulebook-v0\.9\.1\.pdf/);
});
