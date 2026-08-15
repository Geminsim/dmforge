import { lazy, Suspense } from 'react';
import ItemManager from './ItemManager';
import { Tabs, EmptyState } from '../ds';

const MapSystem = lazy(() => import('./MapSystem'));
const ExcelImporter = lazy(() => import('./ExcelImporter'));
const RulesCompendium = lazy(() => import('./RulesCompendium'));

/**
 * The centre column — the only region that changes with the active tab.
 *
 * Tabs render in the plate grammar's bracket form (`[ 1ft 战术地图 ]`, active
 * state inverted into the accent); the emoji that used to stand in for icons
 * are Phosphor glyphs now.
 */

const WORKSPACES = [
  { id: 'map', label: '1ft 战术地图', icon: 'map-trifold' },
  { id: 'items', label: '物品流转中心', icon: 'backpack' },
  { id: 'excel', label: '玩家卡与规则书导入', icon: 'table' },
  { id: 'rules', label: '规则资料库', icon: 'books' }
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
  presentationInteraction, presentationCamera, presentationCameraMode, ruleset
}) {
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
        <Tabs value={currentTab} onChange={setCurrentTab} items={WORKSPACES} />
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
              onPresentationInteractionChange, presentationInteraction, presentationCamera, presentationCameraMode
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
          {currentTab === 'rules' && !isPlayerViewMode && <RulesCompendium ruleset={ruleset} />}
        </div>
      </Suspense>
    </main>
  );
}
