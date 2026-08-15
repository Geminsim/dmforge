import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlankCampaign, createSf6Campaign } from '../src/data/campaignTemplates.js';
import { assertValidCampaign } from '../src/utils/campaignValidation.js';

test('built-in SF6 campaign is valid, empty of demo actors, and complete at the catalog level', () => {
  const campaign = createSf6Campaign();
  assert.doesNotThrow(() => assertValidCampaign(campaign));
  assert.equal(campaign.characters.length, 0);
  assert.equal(campaign.itemPool.length, 0);
  assert.equal(campaign.ruleset.classes.length, 7);
  assert.equal(campaign.ruleset.characterSheetTemplate, '/templates/角色卡.xlsx');
  assert.equal(campaign.ruleset.feats.length, 28);
  assert.equal(campaign.ruleset.classes.every(entry => entry.features.length > 0), true);
  assert.equal(campaign.ruleset.classes.every(entry => Object.keys(entry.subclassFeatures).length === entry.subclasses.length), true);
  assert.equal(campaign.ruleset.conditions.length >= 15, true);
  assert.deepEqual(campaign.ruleset.resources.map(resource => resource.name), ['动作', '附赠动作', '反应', '斗气', '超级必杀槽']);
  assert.equal(campaign.ruleset.resources.find(resource => resource.id === 'super').max, 1);
  assert.equal(campaign.ruleset.sourceDocumentUrl, '/templates/sf6-rulebook-v0.9.pdf');
  assert.ok(campaign.ruleset.feats.filter(feat => feat.minimumLevel === 5).every(feat => !/（[^）]+）\s*$/.test(feat.description)));
  assert.ok(campaign.ruleset.sections.filter(section => section.category !== '背景故事' && !['专长', '职业与子职业', '人物状态'].includes(section.category)).every(section => section.details?.length > 0));
});

test('templates create independent mutable saves', () => {
  const first = createSf6Campaign();
  const second = createSf6Campaign();
  first.ruleset.classes[0].name = 'changed';
  assert.equal(second.ruleset.classes[0].name, '武道者');
  assert.doesNotThrow(() => assertValidCampaign(createBlankCampaign()));
});
