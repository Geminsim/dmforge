import assert from 'node:assert/strict';
import test from 'node:test';
import { filterGuideSections, parseGuideMarkdown } from '../src/utils/guideMarkdown.js';

test('parses the guide into sections and nested topics', () => {
  const guide = parseGuideMarkdown(`# 指南\n\n介绍\n\n## 1. 地图\n\n地图说明\n\n### 1.1 视野\n\n视野说明\n\n### 1.2 地形\n\n地形说明\n\n## 2. 存档\n\n备份说明`);

  assert.equal(guide.title, '指南');
  assert.equal(guide.sections.length, 2);
  assert.equal(guide.sections[0].title, '1. 地图');
  assert.equal(guide.sections[0].topics.length, 2);
  assert.equal(guide.sections[0].topics[0].title, '1.1 视野');
  assert.match(guide.sections[1].content.join('\n'), /备份说明/);
});

test('filters guide sections by nested content', () => {
  const sections = parseGuideMarkdown(`## 地图\n### 视野\n战争迷雾\n## 存档\n自动备份`).sections;
  assert.deepEqual(filterGuideSections(sections, '迷雾').map(section => section.title), ['地图']);
  assert.deepEqual(filterGuideSections(sections, '备份').map(section => section.title), ['存档']);
});
