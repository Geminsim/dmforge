import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SF6_RULESET } from '../src/data/sf6Ruleset.js';
import { SF6_SKILLS, SF6_STAT_ROWS } from '../src/utils/sf6CharacterSheet.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [template, style, unifiedStyle, script, logo] = await Promise.all([
  readFile(resolve(root, 'player-sheet/standalone-template.html'), 'utf8'),
  readFile(resolve(root, 'player-sheet/standalone.css'), 'utf8'),
  readFile(resolve(root, 'player-sheet/standalone-unified.css'), 'utf8'),
  readFile(resolve(root, 'player-sheet/standalone.js'), 'utf8'),
  readFile(resolve(root, 'public/branding/dmforge-logo-source.png'))
]);
const rules = { id: SF6_RULESET.id, name: SF6_RULESET.name, version: SF6_RULESET.version, sourceDocument: SF6_RULESET.sourceDocument, sourceDocumentUrl: SF6_RULESET.sourceDocumentUrl, classes: SF6_RULESET.classes, feats: SF6_RULESET.feats, resources: SF6_RULESET.resources, conditions: SF6_RULESET.conditions, sections: SF6_RULESET.sections, stats: SF6_STAT_ROWS, skills: SF6_SKILLS };
const safeRules = JSON.stringify(rules).replace(/</g, '\\u003c').replace(/-->/g, '--\\u003e');
const output = template.replace('__STYLE__', `${style}\n${unifiedStyle}`).replaceAll('__LOGO__', `data:image/png;base64,${logo.toString('base64')}`).replace('__RULES__', safeRules).replace('__SCRIPT__', script.replace(/<\/script/gi, '<\\/script'));
for (const target of ['public/player-character-sheet.html', 'player-sheet-dist/DMForge-玩家角色卡.html']) {
  const path = resolve(root, target);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, output, 'utf8');
}
console.log('Built standalone player sheet: public/player-character-sheet.html and player-sheet-dist/DMForge-玩家角色卡.html');
