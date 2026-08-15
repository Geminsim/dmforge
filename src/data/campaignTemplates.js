import { CURRENT_SCHEMA_VERSION } from '../utils/campaignValidation.js';
import { SF6_ATTRIBUTE_LABELS, SF6_RESOURCES, SF6_RULESET } from './sf6Ruleset.js';

const groups = [{ id: 'group_pcs', name: '玩家成员' }, { id: 'group_npcs', name: '敌人与 NPC' }];
const blankMap = (id = 'map_blank_1', name = '未命名地图') => ({ id, name, width: 60, height: 40, bgUrl: '', blockedCells: {}, terrainAreas: [] });

const baseCampaign = ({ name, templateId, map }) => ({
  schemaVersion: CURRENT_SCHEMA_VERSION, metadata: { name, templateId, templateVersion: templateId === 'sf6-v0.9' ? '0.9' : '1', createdAt: Date.now() },
  rulesetId: templateId === 'sf6-v0.9' ? SF6_RULESET.id : null,
  ruleset: templateId === 'sf6-v0.9' ? structuredClone(SF6_RULESET) : null,
  characters: [], maps: [map], activeMapId: map.id, floatingNotes: [], itemPool: [], itemTemplates: [], logs: [
    { type: 'SYSTEM', content: `**${name}** 已创建。`, timestamp: new Date().toLocaleTimeString() }
  ], excelCards: [], activeExcelCardId: '', groups, combatParticipants: [], combatTurnOrder: [],
  customAttributeLabels: templateId === 'sf6-v0.9' ? Object.fromEntries(Object.values(SF6_ATTRIBUTE_LABELS).map(value => [value, value])) : {},
  isInCombat: false, combatRound: 1, currentTurnIndex: 0, lastUpdated: Date.now()
});

export function createBlankCampaign(name = '空白战役') {
  return baseCampaign({ name, templateId: 'blank', map: blankMap() });
}

export function createSf6Campaign(name = '世界格斗大赛') {
  const campaign = baseCampaign({ name, templateId: 'sf6-v0.9', map: blankMap('map_montpellier_arrival', '蒙彼利埃 · 赛事准备区') });
  campaign.floatingNotes = [
    { id: 'note_campaign_intro', title: '战役导入', content: '2–4 名格斗家来到蒙彼利埃，准备参加五年一度的世界格斗大赛。随着赛事临近，他们将被卷入赛场之外的麻烦。', x: 80, y: 100, width: 360, height: 260, color: 'purple', isMinimized: false, isOpen: true },
    { id: 'note_dm_rulings', title: 'DM：v0.9 待裁定', content: SF6_RULESET.rulings.map(item => `• ${item.text}`).join('\n'), x: 480, y: 100, width: 380, height: 280, color: 'amber', isMinimized: false, isOpen: true }
  ];
  campaign.characterDefaults = { resources: SF6_RESOURCES.map(resource => ({ ...resource, value: resource.max })) };
  return campaign;
}

export const CAMPAIGN_TEMPLATES = [
  { id: 'sf6-v0.9', name: '世界格斗大赛', description: '内置完整 SF6 v0.9 规则资料、职业、状态与战斗资源。', create: createSf6Campaign },
  { id: 'blank', name: '空白战役', description: '保留地图、存档、备份和同步能力，不预置剧情或角色。', create: createBlankCampaign }
];
