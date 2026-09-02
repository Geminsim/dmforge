import { lazy, Suspense } from 'react';
import ItemManager from './ItemManager';
import { Tabs, EmptyState } from '../ds';

const MapSystem = lazy(() => import('./MapSystem'));
const ExcelImporter = lazy(() => import('./ExcelImporter'));
const RulesCompendium = lazy(() => import('./RulesCompendium'));
const EnemyBestiary = lazy(() => import('./EnemyBestiary'));
const CutsceneWorkspace = lazy(() => import('./CutsceneWorkspace'));

/**
 * The centre column — the only region that changes with the active tab.
 *
 * Workspace tabs keep only the scan-friendly destination label. Detailed names
 * remain available as native tooltips for first-time users.
 */

const BASE_WORKSPACES = [
  { id: 'map', label: '战术地图', title: '1ft 战术地图', icon: 'map-trifold' },
  { id: 'cutscene', label: '过场', title: '过场展示', icon: 'film-strip' },
  { id: 'items', label: '物品', title: '物品流转中心', icon: 'backpack' },
  { id: 'excel', label: '导入', title: '玩家卡与规则书导入', icon: 'table' }
];

function ModuleFallback() {
  return <EmptyState icon="hourglass-medium" text="正在加载功能模块…" />;
}

export default function CampaignWorkspace({
  currentTab, setCurrentTab, isPlayerViewMode, appRole,
  characters, setCharacters, updateTokenPosition, addLog,
  maps, activeMapId, setActiveMapId, addMap, deleteMap, updateMap,
  isInCombat, setIsInCombat, combatRound, setCombatRound,
  currentTurnIndex, setCurrentTurnIndex, combatParticipants, setCombatParticipants,
  combatTurnOrder, setCombatTurnOrder, itemPool, setItemPool,
  itemTemplates, setItemTemplates, groups, excelCards, setExcelCards,
  activeExcelCardId, setActiveExcelCardId, floatingNotes, setFloatingNotes,
  updateFloatingNote, deleteFloatingNote, onPresentationCameraChange, onPresentationInteractionChange,
  presentationInteraction, presentationCamera, presentationCameraMode, ruleset,
  enemyBestiary, setEnemyBestiary, cutscenes, setCutscenes, activeCutsceneId,
  setActiveCutsceneId, playerDisplayMode, setPlayerDisplayMode, onPresentCutscene, onPresentMap
}) {
  const workspaces = ruleset?.id === 'sf6-v0.9'
    ? [...BASE_WORKSPACES, { id: 'bestiary', label: '图鉴', title: '敌人图鉴', icon: 'skull' }, { id: 'rules', label: '资料库', title: '规则资料库', icon: 'books' }]
    : BASE_WORKSPACES;

  return (
    <main
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--surface-app)'
      }}
    >
      {!isPlayerViewMode && (
        <Tabs value={currentTab} onChange={setCurrentTab} items={workspaces} />
      )}
      <Suspense fallback={<ModuleFallback />}>
        <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {currentTab === 'map' && (
            <MapSystem {...{
              characters, setCharacters, updateTokenPosition, addLog, maps, activeMapId,
              setActiveMapId, addMap, deleteMap, updateMap, isPlayerViewMode, appRole,
              isInCombat, setIsInCombat, combatRound, setCombatRound, currentTurnIndex,
              setCurrentTurnIndex, combatParticipants, setCombatParticipants,
              combatTurnOrder, setCombatTurnOrder, onPresentationCameraChange,
              onPresentationInteractionChange, presentationInteraction, presentationCamera, presentationCameraMode, itemPool
            }} />
          )}
          {currentTab === 'items' && !isPlayerViewMode && (
            <ItemManager {...{ characters, itemPool, setItemPool, itemTemplates, setItemTemplates, addLog, groups }} />
          )}
          {currentTab === 'excel' && !isPlayerViewMode && (
            <ExcelImporter {...{
              excelCards, setExcelCards, activeExcelCardId, setActiveExcelCardId,
              addLog, floatingNotes, setFloatingNotes, updateFloatingNote, deleteFloatingNote,
              characters, setCharacters, activeMapId, ruleset
            }} />
          )}
          {currentTab === 'rules' && !isPlayerViewMode && ruleset?.id === 'sf6-v0.9' && <RulesCompendium ruleset={ruleset} />}
          {currentTab === 'bestiary' && !isPlayerViewMode && ruleset?.id === 'sf6-v0.9' && <EnemyBestiary {...{ enemyBestiary, setEnemyBestiary, characters, setCharacters, itemPool, setItemPool, activeMapId, maps, addLog, ruleset }} />}
          {currentTab === 'cutscene' && <CutsceneWorkspace {...{ cutscenes, setCutscenes, activeCutsceneId, setActiveCutsceneId, playerDisplayMode, setPlayerDisplayMode, onPresentCutscene, onPresentMap, isPlayerViewMode }} />}
        </div>
      </Suspense>
    </main>
  );
}
