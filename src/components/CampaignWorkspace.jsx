import { lazy, Suspense } from 'react';
import ItemManager from './ItemManager';

const MapSystem = lazy(() => import('./MapSystem'));
const ExcelImporter = lazy(() => import('./ExcelImporter'));

function ModuleFallback() {
  return <div className="glass-panel panel-content" style={{ margin: '16px' }}>正在加载功能模块…</div>;
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
  presentationInteraction, presentationCamera, presentationCameraMode
}) {
  return (
    <main className="center-area">
      {!isPlayerViewMode && (
        <div className="tabs-container">
          <button onClick={() => setCurrentTab('map')} className={`tab-btn ${currentTab === 'map' ? 'active' : ''}`}>🗺 1ft 战术地图</button>
          <button onClick={() => setCurrentTab('items')} className={`tab-btn ${currentTab === 'items' ? 'active' : ''}`}>🎒 物品流转中心</button>
          <button onClick={() => setCurrentTab('excel')} className={`tab-btn ${currentTab === 'excel' ? 'active' : ''}`}>📊 玩家卡与规则书导入</button>
        </div>
      )}
      <Suspense fallback={<ModuleFallback />}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
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
              addLog, floatingNotes, setFloatingNotes, updateFloatingNote, deleteFloatingNote
            }} />
          )}
        </div>
      </Suspense>
    </main>
  );
}
