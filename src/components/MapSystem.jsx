import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import {
  Button, IconButton, TextInput, Select, Checkbox, Badge, StatPill, Meter,
  ResourceSlot, MapToken, Toolbar, ToolbarDivider, ToolbarLabel, EmptyState, Modal, SegmentedControl
} from '../ds';
import { findShortestPathCached } from '../utils/pathfinding';
import { advanceCombatTurn, prepareCharacterForCombat, processTurnEndConditions, processTurnStartConditions, removeCombatantFromState, resetTurnResources, rollInitiative, tickRoundConditions } from '../utils/combatRules';
import {
  cellInArea, computeVisibility, mergeCellRecords, mergeExploredCells, normalizeMapVision,
  removeCellRecords, revealRectCells, visionSelectionCells
} from '../utils/visibility';
import { capturePresentationCamera, projectPresentationCamera, samePresentationCamera } from '../utils/presentationCamera';
import { compactCharacterName } from '../utils/characterNames';
import {
  CHARACTER_SIZE_OPTIONS, characterFootprintCells, clampCharacterCenterToMap,
  footprintCoveredCells, sizeCategoryForFootprint
} from '../utils/characterGeometry';
import {
  DOOR_STATE_OPTIONS, TERRAIN_COVER_OPTIONS, TERRAIN_FEATURE_OPTIONS, TERRAIN_HAZARDS, TERRAIN_MOVEMENT_OPTIONS, TERRAIN_VISION_OPTIONS,
  canTraverseTerrainStep, changeTerrainShape, createTerrainFeature, getTerrainSpatialIndex, isDifficultTerrain, safeTerrainColor,
  terrainBlocksMovement, terrainCoverLevel, terrainHazard, terrainIsDestroyed, terrainMovementMode, terrainVisionMode,
  TERRAIN_FEATURE_DESCRIPTIONS,
  setDoorState, terrainAreasAtCell, terrainFeatureStateOptions, terrainTouchesCells, terrainTriggerDetails, toggleDoorState, updateExploredTerrainStates
} from '../utils/terrainRules';
import DmforgeIcon from './DmforgeIcon';
import MapComponentArt from './MapComponentArt';
import { characterAvatar } from '../utils/characterImages';
import { characterOwnsFlashlight } from '../utils/inventoryRules';

/** 45° survey hatch for terrain fills — the grammar's alternative to flat tints. */
const TERRAIN_HATCH = (tone) => {
  const soft = tone === 'accent' ? 'var(--accent-soft)' : `var(--pigment-${tone}-soft)`;
  return `repeating-linear-gradient(45deg, ${soft} 0 3px, transparent 3px 7px)`;
};
const TEMP_MAP = { id: 'temp_map', name: '临时战役地图', width: 60, height: 40, bgUrl: '', blockedCells: {}, terrainAreas: [] };
const TERRAIN_SELECTION_COLOR = '#9a6caf';
const TERRAIN_SELECTION_HANDLE = '#c58a00';
const DM_VISION_PREVIEW_ITEMS = [
  { id: 'bright', label: '全亮', title: 'DM 本地显示完整地图；不会影响直播画面' },
  { id: 'dark', label: '全暗', title: 'DM 本地将地图完全遮黑；不会影响直播画面' },
  { id: 'player', label: '玩家视角', title: 'DM 本地模拟玩家当前视野与探索记忆；不会影响直播画面' }
];
const PUBLIC_VISION_MODE_ITEMS = [
  { id: 'player', label: '玩家视角', title: '按角色视线、光照与遮挡同步到玩家端和直播端' },
  { id: 'bright', label: '全亮', title: '让玩家端和直播端临时看见整张地图' },
  { id: 'dark', label: '全暗', title: '让玩家端和直播端临时看不见地图；仍可框选强制显示区域' }
];
const VISION_SELECTION_ITEMS = [
  { id: 'pan', label: '漫游', title: '拖拽移动地图，不编辑视野' },
  { id: 'cell', label: '单格', title: '点击一个地格作为视野选区' },
  { id: 'rect', label: '矩形', title: '拖拽一个矩形视野选区' },
  { id: 'circle', label: '圆形', title: '从圆心向外拖拽半径' },
  { id: 'cone', label: '锥形', title: '从起点向目标方向拖拽锥形视野' }
];
const boundedNumber = (value, fallback, min, max) => {
  const parsed = Number(value);
  return Math.max(min, Math.min(max, Number.isFinite(parsed) ? parsed : fallback));
};

function TerrainSelectionFrame({ edge = false, orientation = 'horizontal', round = false, showHandles = false }) {
  const handleBase = {
    position: 'absolute',
    width: 8,
    height: 8,
    background: TERRAIN_SELECTION_HANDLE,
    border: '2px solid rgba(18, 14, 24, 0.95)',
    borderRadius: round ? '50%' : 1,
    boxSizing: 'border-box',
    boxShadow: '0 0 0 1px rgba(197, 138, 0, 0.28)'
  };
  const handles = edge
    ? orientation === 'vertical'
      ? [{ left: '50%', top: -5, transform: 'translateX(-50%)' }, { left: '50%', bottom: -5, transform: 'translateX(-50%)' }]
      : [{ left: -5, top: '50%', transform: 'translateY(-50%)' }, { right: -5, top: '50%', transform: 'translateY(-50%)' }]
    : round
      ? [{ right: -5, top: '50%', transform: 'translateY(-50%)' }]
      : [{ left: -5, top: -5 }, { right: -5, top: -5 }, { left: -5, bottom: -5 }, { right: -5, bottom: -5 }];

  return <div
    aria-hidden="true"
    data-testid="terrain-selection-frame"
    style={{
      position: 'absolute',
      inset: edge ? -4 : -3,
      border: `2px solid ${TERRAIN_SELECTION_COLOR}`,
      borderRadius: round ? '50%' : 1,
      boxShadow: `0 0 6px rgba(154, 108, 175, 0.18)`,
      pointerEvents: 'none',
      zIndex: 9,
      opacity: 1,
      transition: 'opacity 140ms ease-out, box-shadow 140ms ease-out'
    }}
  >
    {showHandles && handles.map((position, index) => <span key={index} style={{ ...handleBase, ...position }} />)}
  </div>;
}

function VisionSelectionOverlay({ selection, gridSize, cellCount }) {
  if (!selection) return null;
  const shape = selection.shape || 'rect';
  const sx = Number(selection.startX || 0);
  const sy = Number(selection.startY || 0);
  const ex = Number(selection.endX || 0);
  const ey = Number(selection.endY || 0);
  const centerX = (sx + 0.5) * gridSize;
  const centerY = (sy + 0.5) * gridSize;
  const radius = Math.max(0.5, Math.hypot(ex - sx, ey - sy) + 0.5) * gridSize;
  let geometry;
  if (shape === 'circle') {
    geometry = <circle cx={centerX} cy={centerY} r={radius} />;
  } else if (shape === 'cone') {
    const direction = Math.atan2(ey - sy, ex - sx);
    const halfAngle = (Math.max(15, Math.min(180, Number(selection.angle) || 60)) / 2) * Math.PI / 180;
    const startAngle = direction - halfAngle;
    const endAngle = direction + halfAngle;
    const x1 = centerX + Math.cos(startAngle) * radius;
    const y1 = centerY + Math.sin(startAngle) * radius;
    const x2 = centerX + Math.cos(endAngle) * radius;
    const y2 = centerY + Math.sin(endAngle) * radius;
    geometry = <path d={`M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`} />;
  } else {
    const minX = Math.min(sx, ex) * gridSize;
    const minY = Math.min(sy, ey) * gridSize;
    geometry = <rect x={minX} y={minY} width={(Math.abs(ex - sx) + 1) * gridSize} height={(Math.abs(ey - sy) + 1) * gridSize} />;
  }
  return <>
    <svg aria-label="玩家与直播视野选区" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 60, overflow: 'visible' }}>
      <g fill="var(--pigment-verdigris-soft)" stroke="var(--pigment-verdigris)" strokeWidth="2" strokeDasharray="6 4">
        {geometry}
      </g>
    </svg>
    <span style={{
      position: 'absolute', left: centerX + 8, top: Math.max(2, centerY - 24), zIndex: 61, pointerEvents: 'none',
      padding: '2px 6px', background: 'var(--surface-overlay)', color: 'var(--pigment-verdigris)',
      boxShadow: 'inset 0 0 0 1px var(--line-hairline)', fontFamily: 'var(--font-mono)', fontSize: 10, whiteSpace: 'nowrap'
    }}>
      {VISION_SELECTION_ITEMS.find(item => item.id === shape)?.label || '选区'} · {cellCount} 格
    </span>
  </>;
}

const pointSegmentDistance = (point, start, end) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 1e-8) return Math.hypot(point.x - start.x, point.y - start.y);
  const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + ratio * dx), point.y - (start.y + ratio * dy));
};

const strokeTouchesPoint = (stroke, point, gridSize) => {
  const points = Array.isArray(stroke?.points) ? stroke.points : [];
  const radius = Math.max(0.55, Number(stroke?.width || 3) / gridSize + 0.35);
  if (points.length === 1) return Math.hypot(point.x - points[0].x, point.y - points[0].y) <= radius;
  for (let index = 1; index < points.length; index += 1) {
    if (pointSegmentDistance(point, points[index - 1], points[index]) <= radius) return true;
  }
  return false;
};

export default function MapSystem({ 
  characters, 
  setCharacters,
  updateTokenPosition, 
  addLog,
  maps = [],
  activeMapId,
  setActiveMapId,
  addMap,
  deleteMap,
  updateMap,
  isPlayerViewMode = false,
  appRole = 'DM',
  isInCombat = false,
  setIsInCombat,
  combatRound = 1,
  setCombatRound,
  currentTurnIndex = 0,
  setCurrentTurnIndex,
  combatParticipants = [],
  setCombatParticipants,
  combatTurnOrder = [],
  setCombatTurnOrder,
  onPresentationCameraChange,
  onPresentationInteractionChange,
  presentationInteraction,
  presentationCamera,
  presentationCameraMode = 'independent',
  compactPresentation = false,
  onCharacterSelect,
  itemPool = []
}) {
  const [gridSize] = useState(20); // 20px represents 1ft
  
  // Retrieve the active map state
  const activeMap = useMemo(() => maps.find(m => m.id === activeMapId) || maps[0] || TEMP_MAP, [maps, activeMapId]);

  const mapWidth = activeMap.width || 60;
  const mapHeight = activeMap.height || 40;
  const mapBgUrl = activeMap.bgUrl || '';
  const mapBgScaleX = boundedNumber(activeMap.backgroundScaleX, 100, 50, 200);
  const mapBgScaleY = boundedNumber(activeMap.backgroundScaleY, 100, 50, 200);
  const mapBgPositionX = boundedNumber(activeMap.backgroundPositionX, 50, 0, 100);
  const mapBgPositionY = boundedNumber(activeMap.backgroundPositionY, 50, 0, 100);
  const blockedCells = useMemo(() => activeMap.blockedCells || {}, [activeMap.blockedCells]);
  const terrainAreas = useMemo(() => activeMap.terrainAreas || [], [activeMap.terrainAreas]);
  const mapDrawings = useMemo(() => activeMap.drawings || [], [activeMap.drawings]);

  // Custom setters routing back to App.jsx updateMap callback
  const setBlockedCells = (updater) => {
    const nextBlocked = typeof updater === 'function' ? updater(blockedCells) : updater;
    updateMap(activeMap.id, { blockedCells: nextBlocked });
  };

  const setTerrainAreas = (updater) => {
    const nextAreas = typeof updater === 'function' ? updater(terrainAreas) : updater;
    updateMap(activeMap.id, { terrainAreas: nextAreas });
  };

  // Box selection states for blocked cells (Declared high up to prevent TDZ reference issues in useEffect)
  const [selectionBox, setSelectionBox] = useState(null); // { startX, startY, endX, endY }
  const [isSelecting, setIsSelecting] = useState(false);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragStartCell, setDragStartCell] = useState(null); // { x, y }
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 }); // { x: dx, y: dy }

  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [hoveredTokenId, setHoveredTokenId] = useState(null);
  const [terrainHint, setTerrainHint] = useState(null);
  const terrainHintTimerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);
  const blockedCanvasRef = useRef(null);
  const fogCanvasRef = useRef(null);
  const transformRef = useRef(null);
  const viewportRef = useRef(null);
  const rosterDragIdRef = useRef(null);
  const [viewportRevision, setViewportRevision] = useState(0);
  const lastAppliedCameraRef = useRef(null);

  // Undo history states & refs
  const [canUndo, setCanUndo] = useState(false);
  const historyRef = useRef([]);
  const lastPaintedCellRef = useRef(null);

  const beginTerrainHint = (event, area) => {
    if (!area?.featureType && !terrainTriggerDetails(area)) return;
    clearTimeout(terrainHintTimerRef.current);
    const point = { x: event.clientX, y: event.clientY };
    terrainHintTimerRef.current = setTimeout(() => setTerrainHint({ areaId: area.id, ...point }), 480);
  };
  const moveTerrainHint = (event, area) => {
    if (terrainHint?.areaId === area?.id) setTerrainHint(previous => ({ ...previous, x: event.clientX, y: event.clientY }));
  };
  const endTerrainHint = () => {
    clearTimeout(terrainHintTimerRef.current);
    setTerrainHint(null);
  };

  useEffect(() => () => clearTimeout(terrainHintTimerRef.current), []);

  const pushToHistory = () => {
    const stateSnapshot = {
      blockedCells: { ...blockedCells },
      terrainAreas: JSON.parse(JSON.stringify(terrainAreas))
    };
    historyRef.current.push(stateSnapshot);
    if (historyRef.current.length > 30) {
      historyRef.current.shift();
    }
    setCanUndo(true);
  };

  const handleUndo = () => {
    if (historyRef.current.length === 0) return;
    const previousState = historyRef.current.pop();
    
    // Set states
    setBlockedCells(previousState.blockedCells);
    setTerrainAreas(previousState.terrainAreas);
    
    // Clear editing area if it's no longer in the restored state
    if (editingAreaId && !previousState.terrainAreas.some(area => area.id === editingAreaId)) {
      setEditingAreaId(null);
    }
    
    setCanUndo(historyRef.current.length > 0);
  };

  // Redraw blocked cells on canvas whenever blockedCells or layout changes
  useEffect(() => {
    const canvas = blockedCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw each blocked cell in red stripes diagonal pattern
    Object.keys(blockedCells).forEach(key => {
      const [xStr, yStr] = key.split('_');
      const cx = parseInt(xStr, 10);
      const cy = parseInt(yStr, 10);
      if (cx >= mapWidth || cy >= mapHeight) return;
      
      // If we are currently dragging a selection box, hide the original blocked cells inside it from the canvas
      if (isDraggingSelection && selectionBox) {
        const minX = Math.min(selectionBox.startX, selectionBox.endX);
        const maxX = Math.max(selectionBox.startX, selectionBox.endX);
        const minY = Math.min(selectionBox.startY, selectionBox.endY);
        const maxY = Math.max(selectionBox.startY, selectionBox.endY);
        if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
          return;
        }
      }

      const x = cx * gridSize;
      const y = cy * gridSize;
      
      // 1. Draw solid thin border
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, gridSize - 1, gridSize - 1);
      
      // 2. Draw background fill
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fillRect(x + 1, y + 1, gridSize - 2, gridSize - 2);
      
      // 3. Draw repeating linear stripes inside the cell
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 1, y + 1, gridSize - 2, gridSize - 2);
      ctx.clip();
      
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 2.0;
      
      // Draw diagonal stripes spaced by 6px
      for (let offset = -gridSize; offset < gridSize * 2; offset += 6) {
        ctx.beginPath();
        ctx.moveTo(x + offset, y);
        ctx.lineTo(x + offset + gridSize, y + gridSize);
        ctx.stroke();
      }
      ctx.restore();
    });
  }, [blockedCells, gridSize, mapWidth, mapHeight, selectionBox, isDraggingSelection]);

  // Token dragging real-time measurement states
  const [draggedToken, setDraggedToken] = useState(null); // { id, startX, startY, name }
  const [dragHoverCoords, setDragHoverCoords] = useState(null); // { x, y }
  const [isForcedMoveMode, setIsForcedMoveMode] = useState(false);
  const [dragIsShiftPressed, setDragIsShiftPressed] = useState(false);

  useEffect(() => {
    const beginRosterDrag = event => { rosterDragIdRef.current = event.detail?.id || null; };
    const endRosterDrag = () => {
      rosterDragIdRef.current = null;
      setDraggedToken(null);
      setDragHoverCoords(null);
      setDragIsShiftPressed(false);
    };
    window.addEventListener('dmforge:character-drag-start', beginRosterDrag);
    window.addEventListener('dmforge:character-drag-end', endRosterDrag);
    return () => {
      window.removeEventListener('dmforge:character-drag-start', beginRosterDrag);
      window.removeEventListener('dmforge:character-drag-end', endRosterDrag);
    };
  }, []);

  // Terrain editing states
  const [isTerrainEditMode, setIsTerrainEditMode] = useState(false);
  const [terrainEditTool, setTerrainEditTool] = useState('pan'); // pan, move, paint_block, paint_erase, box_select
  const [isPainting, setIsPainting] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState(null);
  const [defaultImpassable, setDefaultImpassable] = useState(false);
  const [featurePreset, setFeaturePreset] = useState('wall');
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingTool, setDrawingTool] = useState('pen');
  const [drawingColor, setDrawingColor] = useState('#f6c453');
  const [drawingWidth, setDrawingWidth] = useState(4);
  const [draftStroke, setDraftStroke] = useState(null);
  const [erasedDrawingIds, setErasedDrawingIds] = useState(new Set());
  const editingArea = terrainAreas.find(area => area.id === editingAreaId) || null;
  const hintedArea = terrainAreas.find(area => area.id === terrainHint?.areaId) || null;
  const terrainNameCounts = useMemo(() => terrainAreas.reduce((counts, area) => {
    const name = area.name?.trim() || '未命名对象';
    counts.set(name, (counts.get(name) || 0) + 1);
    return counts;
  }, new Map()), [terrainAreas]);
  const [drawingHistoryRevision, setDrawingHistoryRevision] = useState(0);
  const drawingGestureRef = useRef(null);
  const drawingHistoryRef = useRef(new Map());



  // Turn-based Combat Local UI states
  const [showInitiativePrep, setShowInitiativePrep] = useState(false);
  // The map token panel's custom-condition field used to be read back through
  // document.getElementById; hold the draft in state instead.
  const [mapCondDraft, setMapCondDraft] = useState('');
  const [tempParticipants, setTempParticipants] = useState({}); // { charId: boolean }
  const [, setManualInitiatives] = useState({}); // { charId: number }
  const [, setShowConditionPopupId] = useState(null);

  // Map Property Configuration panel state
  const [showMapConfig, setShowMapConfig] = useState(false);
  const [dmVisionPreview, setDmVisionPreview] = useState('bright');
  const [isVisionControlMode, setIsVisionControlMode] = useState(false);
  const [visionSelectionTool, setVisionSelectionTool] = useState('pan');
  const [visionConeAngle, setVisionConeAngle] = useState(60);
  const isDmVisionPreviewAvailable = appRole !== 'PLAYER' && !isPlayerViewMode;
  const isVisionLimitedView = isPlayerViewMode || (isDmVisionPreviewAvailable && dmVisionPreview === 'player');
  const isVisionBlackout = isDmVisionPreviewAvailable && dmVisionPreview === 'dark';

  useEffect(() => {
    if (appRole !== 'PLAYER') return;
    setDraggedToken(presentationInteraction?.draggedToken || null);
    setDragHoverCoords(presentationInteraction?.dragHoverCoords || null);
    setDragIsShiftPressed(Boolean(presentationInteraction?.isForced));
  }, [appRole, presentationInteraction]);

  useEffect(() => {
    if (appRole === 'PLAYER') return;
    onPresentationInteractionChange?.({
      draggedToken,
      dragHoverCoords,
      isForced: Boolean(isForcedMoveMode || dragIsShiftPressed)
    });
  }, [appRole, draggedToken, dragHoverCoords, isForcedMoveMode, dragIsShiftPressed, onPresentationInteractionChange]);

  useEffect(() => {
    if (appRole !== 'PLAYER' || presentationCameraMode !== 'follow-dm' || !presentationCamera) return;
    const viewport = viewportRef.current?.getBoundingClientRect();
    const target = projectPresentationCamera(presentationCamera, viewport || {});
    const previous = lastAppliedCameraRef.current;
    if (samePresentationCamera(previous, target)) return;
    lastAppliedCameraRef.current = target;
    transformRef.current?.setTransform(target.x, target.y, target.scale, 0);
  }, [appRole, presentationCamera, presentationCameraMode, viewportRevision]);

  useEffect(() => {
    if (appRole !== 'PLAYER' || presentationCameraMode !== 'follow-active') return;
    const activeId = combatTurnOrder[currentTurnIndex]?.id;
    const activeCharacter = characters.find(character => character.id === activeId && character.mapId === activeMapId);
    const viewport = viewportRef.current?.getBoundingClientRect();
    if (!activeCharacter || !viewport) return;
    const targetScale = Math.min(1.4, Math.max(.65, Math.min(viewport.width / (mapWidth * gridSize), viewport.height / (mapHeight * gridSize)) * 1.8));
    transformRef.current?.setTransform(
      viewport.width / 2 - ((Number(activeCharacter.gridX) || 0) + .5) * gridSize * targetScale,
      viewport.height / 2 - ((Number(activeCharacter.gridY) || 0) + .5) * gridSize * targetScale,
      targetScale,
      180,
      'easeOut'
    );
  }, [appRole, presentationCameraMode, combatTurnOrder, currentTurnIndex, characters, activeMapId, mapWidth, mapHeight, gridSize]);

  // Filter character tokens to render only those placed on the active map
  const activeTokens = useMemo(() => characters.filter(char => char.mapId === activeMapId), [characters, activeMapId]);
  const visibilityCharacters = useMemo(() => characters.map(character => {
    const source = character.lightSource;
    if (!source?.enabled || !/手电筒|flashlight/i.test(`${source.id || ''} ${source.name || ''}`) || characterOwnsFlashlight(itemPool, character.id)) return character;
    return { ...character, lightSource: { ...source, enabled: false } };
  }), [characters, itemPool]);
  const visibilityGeometryMap = useMemo(() => ({
    id: activeMap.id,
    width: activeMap.width,
    height: activeMap.height,
    terrainAreas: activeMap.terrainAreas,
    blockedCells: activeMap.blockedCells,
    vision: {
      enabled: activeMap.vision?.enabled,
      ambientLight: activeMap.vision?.ambientLight,
      ceilingHeight: activeMap.vision?.ceilingHeight,
      visionRangeCap: activeMap.vision?.visionRangeCap,
      rememberExplored: activeMap.vision?.rememberExplored,
      manualVisibleCells: activeMap.vision?.manualVisibleCells,
      manualHiddenCells: activeMap.vision?.manualHiddenCells,
      visionBlockers: activeMap.vision?.visionBlockers,
      lightSources: activeMap.vision?.lightSources,
      exploredCells: {}
    }
  }), [activeMap.id, activeMap.width, activeMap.height, activeMap.terrainAreas, activeMap.blockedCells,
    activeMap.vision?.enabled, activeMap.vision?.ambientLight, activeMap.vision?.ceilingHeight,
    activeMap.vision?.visionRangeCap, activeMap.vision?.rememberExplored, activeMap.vision?.manualVisibleCells,
    activeMap.vision?.manualHiddenCells, activeMap.vision?.visionBlockers, activeMap.vision?.lightSources]);
  const committedVisibility = useMemo(() => computeVisibility({
    map: visibilityGeometryMap, characters: visibilityCharacters, isInCombat, combatTurnOrder, ignorePublicMode: true
  }), [visibilityGeometryMap, visibilityCharacters, isInCombat, combatTurnOrder]);
  const playerVisibility = useMemo(() => {
    if (appRole === 'PLAYER' && activeMap.vision?.visibleCells) {
      return {
        visible: new Set(Object.keys(activeMap.vision.visibleCells).filter(key => activeMap.vision.visibleCells[key])),
        bright: new Set(Object.keys(activeMap.vision.visibleCells).filter(key => activeMap.vision.visibleCells[key] && !activeMap.vision.dimCells?.[key])),
        dim: new Set(Object.keys(activeMap.vision.dimCells || {}).filter(key => activeMap.vision.dimCells[key])),
        explored: new Set(Object.keys(activeMap.vision.exploredCells || {}).filter(key => activeMap.vision.exploredCells[key])),
        visibleCharacterIds: new Set(characters.map(character => character.id)),
        sensedCombatIds: new Set(characters.filter(character => character.combatSensed).map(character => character.id))
      };
    }
    if (!isVisionLimitedView) return committedVisibility;
    // Dragging is only a route/landing preview. Fog and newly visible terrain
    // update after the token position is committed by handleDrop.
    return computeVisibility({ map: activeMap, characters: visibilityCharacters, isInCombat, combatTurnOrder });
  }, [appRole, activeMap, characters, visibilityCharacters, isInCombat, combatTurnOrder, isVisionLimitedView, committedVisibility]);

  useEffect(() => {
    if (appRole === 'PLAYER' || normalizeMapVision(activeMap).enabled === false) return;
    const normalizedVision = normalizeMapVision(activeMap);
    if (normalizedVision.rememberExplored === false) return;
    const existing = normalizedVision.exploredCells;
    const hasInitialSnapshot = activeMap.vision?.memoryInitialCells !== undefined;
    const hasCurrentSnapshot = activeMap.vision?.memoryCurrentCells !== undefined;
    const currentArchive = hasCurrentSnapshot ? normalizedVision.memoryCurrentCells : existing;
    const additions = [...committedVisibility.visible].filter(key => !existing[key]);
    const currentAdditions = [...committedVisibility.visible].filter(key => !currentArchive[key]);
    const exploredTerrainStates = updateExploredTerrainStates(normalizedVision.exploredTerrainStates, terrainAreas, committedVisibility.visible);
    const currentTerrainArchive = activeMap.vision?.memoryCurrentTerrainStates !== undefined
      ? normalizedVision.memoryCurrentTerrainStates
      : normalizedVision.exploredTerrainStates;
    const memoryCurrentTerrainStates = updateExploredTerrainStates(currentTerrainArchive, terrainAreas, committedVisibility.visible);
    const terrainChanged = exploredTerrainStates !== normalizedVision.exploredTerrainStates;
    const currentTerrainChanged = memoryCurrentTerrainStates !== currentTerrainArchive;
    if (!additions.length && !currentAdditions.length && !terrainChanged && !currentTerrainChanged && hasInitialSnapshot && hasCurrentSnapshot) return;
    updateMap(activeMap.id, { vision: {
      ...normalizedVision,
      exploredCells: mergeExploredCells(existing, committedVisibility.visible),
      exploredTerrainStates,
      memoryInitialCells: hasInitialSnapshot ? normalizedVision.memoryInitialCells : existing,
      memoryInitialTerrainStates: activeMap.vision?.memoryInitialTerrainStates !== undefined
        ? normalizedVision.memoryInitialTerrainStates
        : normalizedVision.exploredTerrainStates,
      memoryCurrentCells: mergeExploredCells(currentArchive, committedVisibility.visible),
      memoryCurrentTerrainStates
    } });
  }, [appRole, activeMap, committedVisibility.visible, committedVisibility.explored, terrainAreas, updateMap]);

  const updatePublicVisionMode = mode => {
    const vision = normalizeMapVision(activeMap);
    updateMap(activeMap.id, { vision: { ...vision, enabled: true, publicMode: mode } });
    addLog?.({
      type: 'SYSTEM', visibility: 'private',
      content: `玩家端与直播端视野已切换为 **${PUBLIC_VISION_MODE_ITEMS.find(item => item.id === mode)?.label || mode}**。`,
      timestamp: new Date().toLocaleTimeString()
    });
  };

  const pauseExplorationMemory = () => {
    const vision = normalizeMapVision(activeMap);
    updateMap(activeMap.id, { vision: {
      ...vision,
      rememberExplored: false,
      memoryInitialCells: activeMap.vision?.memoryInitialCells !== undefined ? vision.memoryInitialCells : vision.exploredCells,
      memoryInitialTerrainStates: activeMap.vision?.memoryInitialTerrainStates !== undefined ? vision.memoryInitialTerrainStates : vision.exploredTerrainStates,
      memoryCurrentCells: mergeExploredCells(vision.memoryCurrentCells, Object.keys(vision.exploredCells)),
      memoryCurrentTerrainStates: { ...vision.memoryCurrentTerrainStates, ...vision.exploredTerrainStates }
    } });
    addLog?.({ type: 'SYSTEM', visibility: 'private', content: `已暂停地图 **${activeMap.name}** 的迷雾记忆显示；当前与起点档案均已保留。`, timestamp: new Date().toLocaleTimeString() });
  };

  const resumeExplorationMemory = source => {
    const vision = normalizeMapVision(activeMap);
    const useInitial = source === 'initial';
    const initialCells = activeMap.vision?.memoryInitialCells !== undefined ? vision.memoryInitialCells : vision.exploredCells;
    const initialTerrainStates = activeMap.vision?.memoryInitialTerrainStates !== undefined ? vision.memoryInitialTerrainStates : vision.exploredTerrainStates;
    const currentCells = activeMap.vision?.memoryCurrentCells !== undefined ? vision.memoryCurrentCells : vision.exploredCells;
    const currentTerrainStates = activeMap.vision?.memoryCurrentTerrainStates !== undefined ? vision.memoryCurrentTerrainStates : vision.exploredTerrainStates;
    updateMap(activeMap.id, { vision: {
      ...vision,
      rememberExplored: true,
      exploredCells: useInitial ? initialCells : currentCells,
      exploredTerrainStates: useInitial ? initialTerrainStates : currentTerrainStates,
      memoryInitialCells: initialCells,
      memoryInitialTerrainStates: initialTerrainStates,
      memoryCurrentCells: currentCells,
      memoryCurrentTerrainStates: currentTerrainStates
    } });
    addLog?.({ type: 'SYSTEM', visibility: 'private', content: `已恢复地图 **${activeMap.name}** 的${useInitial ? '起点' : '当前'}迷雾记忆，并继续实时记录。`, timestamp: new Date().toLocaleTimeString() });
  };

  const resetExplorationMemoryStart = () => {
    if (!window.confirm('将当前已经探索的内容设为新的“起点记忆”？旧的起点快照会被替换。')) return;
    const vision = normalizeMapVision(activeMap);
    updateMap(activeMap.id, { vision: {
      ...vision,
      memoryInitialCells: { ...vision.exploredCells },
      memoryInitialTerrainStates: { ...vision.exploredTerrainStates },
      memoryCurrentCells: { ...vision.exploredCells },
      memoryCurrentTerrainStates: { ...vision.exploredTerrainStates }
    } });
    addLog?.({ type: 'SYSTEM', visibility: 'private', content: `已将地图 **${activeMap.name}** 的当前探索状态设为新的迷雾记忆起点。`, timestamp: new Date().toLocaleTimeString() });
  };

  const applyVisionSelection = action => {
    if (!selectionBox) return;
    const vision = normalizeMapVision(activeMap);
    const selectedCells = visionSelectionCells(selectionBox, mapWidth, mapHeight);
    let exploredTerrainStates = { ...vision.exploredTerrainStates };
    if (action === 'hide') {
      for (const area of terrainAreas) if (terrainTouchesCells(area, selectedCells)) delete exploredTerrainStates[area.id];
    } else if (action === 'show') {
      exploredTerrainStates = updateExploredTerrainStates(exploredTerrainStates, terrainAreas, selectedCells);
    }
    const nextVision = action === 'show' ? {
      ...vision,
      manualVisibleCells: mergeCellRecords(vision.manualVisibleCells, selectedCells),
      manualHiddenCells: removeCellRecords(vision.manualHiddenCells, selectedCells),
      exploredCells: vision.rememberExplored ? mergeCellRecords(vision.exploredCells, selectedCells) : vision.exploredCells,
      exploredTerrainStates,
      memoryCurrentCells: mergeCellRecords(vision.memoryCurrentCells, selectedCells),
      memoryCurrentTerrainStates: updateExploredTerrainStates(vision.memoryCurrentTerrainStates, terrainAreas, selectedCells)
    } : action === 'hide' ? {
      ...vision,
      manualVisibleCells: removeCellRecords(vision.manualVisibleCells, selectedCells),
      manualHiddenCells: mergeCellRecords(vision.manualHiddenCells, selectedCells),
      exploredCells: removeCellRecords(vision.exploredCells, selectedCells),
      exploredTerrainStates,
      memoryCurrentCells: removeCellRecords(vision.memoryCurrentCells, selectedCells),
      memoryCurrentTerrainStates: Object.fromEntries(Object.entries(vision.memoryCurrentTerrainStates).filter(([areaId]) => {
        const area = terrainAreas.find(candidate => candidate.id === areaId);
        return !area || !terrainTouchesCells(area, selectedCells);
      }))
    } : {
      ...vision,
      manualVisibleCells: removeCellRecords(vision.manualVisibleCells, selectedCells),
      manualHiddenCells: removeCellRecords(vision.manualHiddenCells, selectedCells)
    };
    updateMap(activeMap.id, { vision: nextVision });
    const actionLabel = action === 'show' ? '强制显示' : action === 'hide' ? '强制遮蔽并清除记忆' : '恢复自动视野判定';
    addLog?.({ type: 'SYSTEM', visibility: 'private', content: `DM 已在地图 **${activeMap.name}** 的框选区域执行：**${actionLabel}**。`, timestamp: new Date().toLocaleTimeString() });
    setSelectionBox(null);
  };

  useEffect(() => {
    const canvas = fogCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (isVisionBlackout) {
      context.fillStyle = 'rgba(0, 0, 0, 0.985)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    if (!isVisionLimitedView || normalizeMapVision(activeMap).enabled === false) return;
    for (let y = 0; y < mapHeight; y += 1) for (let x = 0; x < mapWidth; x += 1) {
      const key = `${x}_${y}`;
      if (playerVisibility.bright.has(key)) continue;
      context.fillStyle = playerVisibility.dim.has(key)
        ? 'rgba(2, 6, 12, 0.30)'
        : playerVisibility.explored.has(key) ? 'rgba(2, 5, 10, 0.48)' : 'rgba(0, 0, 0, 0.97)';
      context.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
    }
  }, [isVisionBlackout, isVisionLimitedView, activeMap, playerVisibility, mapWidth, mapHeight, gridSize]);

  // Identify players that are on other maps and eligible for summon
  const unplacedPCs = characters.filter(char => char.type === 'PC' && char.mapId !== activeMapId);

  const handleTokenDragStart = (e, tokenId) => {
    if (appRole === 'PLAYER') {
      e.preventDefault();
      return;
    }
    // If we're painting, don't drag tokens
    if (isTerrainEditMode && terrainEditTool !== 'pan') {
      e.preventDefault();
      return;
    }
    setSelectedTokenId(tokenId);
    e.dataTransfer.setData('text/plain', tokenId);
    e.dataTransfer.setData('application/x-dmforge-character', JSON.stringify({ id: tokenId, source: 'map' }));
    e.dataTransfer.effectAllowed = 'move';

    const char = characters.find(c => c.id === tokenId);
    if (char) {
      setDraggedToken({
        id: tokenId,
        startX: char.gridX || 0,
        startY: char.gridY || 0,
        name: char.name,
        type: char.type,
        isNewPlacement: false
      });
      setDragHoverCoords({ x: char.gridX || 0, y: char.gridY || 0 });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!containerRef.current) return;

    const tokenId = e.dataTransfer.getData('text/plain') || rosterDragIdRef.current || draggedToken?.id;
    const token = characters.find(character => character.id === tokenId);
    if (!token) return;

    // Track if shift key is pressed during drag
    const isShift = e.shiftKey;
    if (dragIsShiftPressed !== isShift) {
      setDragIsShiftPressed(isShift);
    }

    const rect = containerRef.current.getBoundingClientRect();
    const scaledX = e.clientX - rect.left;
    const scaledY = e.clientY - rect.top;

    const unscaledX = scaledX / scale;
    const unscaledY = scaledY / scale;

    const target = clampCharacterCenterToMap(Math.floor(unscaledX / gridSize), Math.floor(unscaledY / gridSize), token, mapWidth, mapHeight);
    const gridX = target.x;
    const gridY = target.y;

    if (!draggedToken || draggedToken.id !== tokenId) {
      const isNewPlacement = token.mapId !== activeMapId;
      setDraggedToken({
        id: tokenId,
        startX: isNewPlacement ? gridX : (token.gridX || 0),
        startY: isNewPlacement ? gridY : (token.gridY || 0),
        name: token.name,
        type: token.type,
        isNewPlacement
      });
    }

    if (!dragHoverCoords || dragHoverCoords.x !== gridX || dragHoverCoords.y !== gridY) {
      setDragHoverCoords({ x: gridX, y: gridY });
    }
  };

  const handleDragEnd = () => {
    setDraggedToken(null);
    setDragHoverCoords(null);
    setDragIsShiftPressed(false);
  };

  const handleTransform = (ref) => {
    setScale(ref.state.scale);
    if (appRole === 'PLAYER') return;
    const viewport = viewportRef.current?.getBoundingClientRect();
    onPresentationCameraChange?.(capturePresentationCamera(ref.state, viewport || {}));
  };

  const handleViewportDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    if (draggedToken?.isNewPlacement) handleDragEnd();
  };

  useEffect(() => {
    if (!viewportRef.current || typeof ResizeObserver === 'undefined') return undefined;
    let initialized = false;
    const observer = new ResizeObserver(() => {
      if (!initialized) { initialized = true; return; }
      if (appRole === 'PLAYER') setViewportRevision(value => value + 1);
      else if (transformRef.current?.state) handleTransform(transformRef.current);
    });
    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  // handleTransform intentionally reads the current transform and callback props.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appRole]);

  const handleDrop = (e) => {
    e.preventDefault();
    if (appRole === 'PLAYER') return;
    setDraggedToken(null);
    setDragHoverCoords(null);
    const tokenId = e.dataTransfer.getData('text/plain');
    if (!tokenId || !containerRef.current) return;

    const token = characters.find(c => c.id === tokenId);
    if (!token) return;
    const isNewPlacement = token.mapId !== activeMapId;

    const rect = containerRef.current.getBoundingClientRect();
    
    // Get mouse coordinates relative to map container (which is scaled and panned on screen)
    const scaledX = e.clientX - rect.left;
    const scaledY = e.clientY - rect.top;

    // Divide by current scale to translate back to unscaled coordinate space
    const unscaledX = scaledX / scale;
    const unscaledY = scaledY / scale;

    // Convert pixels to 1ft grids
    const target = clampCharacterCenterToMap(Math.floor(unscaledX / gridSize), Math.floor(unscaledY / gridSize), token, mapWidth, mapHeight);
    const gridX = target.x;
    const gridY = target.y;

    let movementCost = 0;

    if (isInCombat && !isNewPlacement) {
      const isForced = isForcedMoveMode || e.shiftKey;

      if (!isForced) {
        const activeParticipant = combatTurnOrder[currentTurnIndex];
        if (activeParticipant?.id !== tokenId) {
          alert(`无法拖动：当前非 [${token.name}] 的行动回合！`);
          return;
        }
      }

      // Calculate path and cost
      const path = findShortestPathCached(
        token.gridX || 0,
        token.gridY || 0,
        gridX,
        gridY,
        mapWidth,
        mapHeight,
        isCellBlocked,
        isCellDifficult,
        canTraverseStep
      );

      if (path) {
        for (let i = 1; i < path.length; i++) {
          const p1 = path[i - 1];
          const p2 = path[i];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          let stepCost = Math.hypot(dx, dy);
          if (isCellDifficult(p2.x, p2.y)) {
            stepCost *= 2.0;
          }
          movementCost += stepCost;
        }
      } else {
        // Fallback straight line
        const dx = gridX - (token.gridX || 0);
        const dy = gridY - (token.gridY || 0);
        let stepCost = Math.hypot(dx, dy);
        if (isCellDifficult(gridX, gridY)) {
          stepCost *= 2.0;
        }
        movementCost = stepCost;
      }

      if (!isForced) {
        if (!path) {
          alert(`无法移动：该路线受阻，无法绕过障碍物！`);
          return;
        }

        const speedRemaining = token.combatSpeedRemaining !== undefined ? token.combatSpeedRemaining : (token.speed !== undefined ? token.speed : 30);
        if (movementCost > speedRemaining) {
          alert(`移动力不足！当前回合仅剩 ${speedRemaining.toFixed(1)} ft 移动力，无法移动 ${movementCost.toFixed(1)} ft。`);
          return;
        }

        // Update character position and deduct remaining speed
        const remainingSpeed = Math.max(0, speedRemaining - movementCost);
        setCharacters(prev => prev.map(c => {
          if (c.id === tokenId) {
            return {
              ...c,
              gridX,
              gridY,
              mapId: activeMapId,
              combatSpeedRemaining: remainingSpeed
            };
          }
          return c;
        }));

        if (addLog) {
          addLog({
            type: 'COMBAT',
            content: `**[${token.name}]** 消耗了 **${movementCost.toFixed(1)} ft** 移动力，本回合还剩 **${remainingSpeed.toFixed(1)} ft**。`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      } else {
        // FORCED MOVEMENT: Bypass speed deduction and active turn limit
        setCharacters(prev => prev.map(c => {
          if (c.id === tokenId) {
            return {
              ...c,
              gridX,
              gridY,
              mapId: activeMapId
            };
          }
          return c;
        }));

        if (addLog) {
          addLog({
            type: 'COMBAT',
            content: `**[${token.name}]** 遭受了**强制位移 / 传送**，位移了 **${movementCost.toFixed(1)} ft**（本次移动未消耗其回合移动力）。`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      }
    } else {
      // Normal free-roam update
      updateTokenPosition(tokenId, gridX, gridY, activeMapId);
      
      if (addLog) {
        addLog({
          type: 'COMBAT',
          content: isNewPlacement
            ? `**[${token.name}]** 已从角色列表部署到地图 **[${activeMap.name}]** 的 (${gridX}ft, ${gridY}ft)。`
            : `棋子 [${token.name}] 移动到位置: (${gridX}ft, ${gridY}ft) [地图: ${activeMap.name}]`,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }

    if (addLog) {
      // 2. Blocked Grid cell warning
      const occupiedCells = footprintCoveredCells(gridX, gridY, token);
      let isImpassableBlock = occupiedCells.some(cell => blockedCells[`${cell.x}_${cell.y}`]);
      let blockedAreaName = '';
      if (!isImpassableBlock) {
        for (const area of terrainAreas) {
          if (area.placement !== 'edge' && terrainBlocksMovement(area, token)
            && occupiedCells.some(cell => cellInArea(cell.x, cell.y, area))) {
            isImpassableBlock = true;
            blockedAreaName = area.name;
            break;
          }
        }
      }

      if (isImpassableBlock) {
        addLog({
          type: 'COMBAT',
          content: `警告：棋子 [${token.name}] 移动到了不可通过的 [${blockedAreaName ?`阻挡地形: ${blockedAreaName}`:'阻挡格'}] 障碍物上！`,
          timestamp: new Date().toLocaleTimeString()
        });
      }

      // 3. Custom terrain area collision detection
      terrainAreas.forEach(area => {
        const intersected = occupiedCells.some(cell => cellInArea(cell.x, cell.y, area));

        if (intersected) {
          const hazard = terrainHazard(area);
          const triggerDetails = terrainTriggerDetails(area);
          if (hazard === 'none' && !triggerDetails) return;
          let warningText;
          if (triggerDetails) {
            warningText = `陷阱触发：[${token.name}] 进入了 [${area.name}]。判定：${triggerDetails.check}；效果：${triggerDetails.effect}`;
          } else if (hazard === 'fire') {
            warningText = `警告：[${token.name}] 踏入了 [${area.name}] (烈火地形)！请注意扣减生命值并做反射豁免！`;
          } else if (hazard === 'toxic') {
            warningText = `警告：[${token.name}] 踏入了 [${area.name}] (毒性/酸性地形)！请每回合进行体质豁免鉴定！`;
          } else if (hazard === 'cold') {
            warningText = `提示：[${token.name}] 进入了 [${area.name}] (寒冰/水体地形)，移动速度可能受阻。`;
          } else if (hazard === 'difficult') {
            warningText = `提示：[${token.name}] 进入了 [${area.name}] (困难地形/碎石)，在困难地形内移动需要消耗双倍移动力。`;
          } else if (hazard === 'arcane') {
            warningText = `警告：[${token.name}] 进入了 [${area.name}] (法术/诅咒地形)，请进行意志豁免判定！`;
          }

          addLog({
            type: 'COMBAT',
            content: warningText,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      });
    }
  };

  // Euclidean Distance in Feet (1 grid = 1 ft)
  const calculateDistance = (tokA, tokB) => {
    if (!tokA || !tokB) return 0;
    const dx = (tokA.gridX || 0) - (tokB.gridX || 0);
    const dy = (tokA.gridY || 0) - (tokB.gridY || 0);
    return Math.sqrt(dx * dx + dy * dy).toFixed(1);
  };

  // Direct dragging of terrain areas (snapped to 1ft grids, zoom-compensated)
  const handleTerrainDragStart = (e, area) => {
    if (appRole === 'PLAYER') return;
    if (!isTerrainEditMode || terrainEditTool !== 'move') return;
    
    // Do not drag if clicking resize handle
    if (e.target.title && e.target.title.includes('改变')) {
      return;
    }

    e.stopPropagation();
    e.preventDefault();
    setEditingAreaId(area.id);
    pushToHistory();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialGridX = area.gridX;
    const initialGridY = area.gridY;
    const initialEndX = Number(area.endX);
    const initialEndY = Number(area.endY);
    let lastCommittedGridX = initialGridX;
    let lastCommittedGridY = initialGridY;

    const handleMouseMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;
      
      const gridDx = Math.round(dx / gridSize);
      const gridDy = Math.round(dy / gridSize);

      const nextGridX = Math.max(0, Math.min(mapWidth - 1, initialGridX + gridDx));
      const nextGridY = Math.max(0, Math.min(mapHeight - 1, initialGridY + gridDy));

      if (nextGridX !== lastCommittedGridX || nextGridY !== lastCommittedGridY) {
        lastCommittedGridX = nextGridX;
        lastCommittedGridY = nextGridY;
        handleUpdateArea(area.id, {
          gridX: nextGridX,
          gridY: nextGridY,
          ...(area.orientation === 'free' ? {
            endX: Math.max(0, Math.min(mapWidth, initialEndX + nextGridX - initialGridX)),
            endY: Math.max(0, Math.min(mapHeight, initialEndY + nextGridY - initialGridY))
          } : {})
        }, true);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Resizing rectangle terrain areas (width and height snapped to ft)
  const handleRectResizeStart = (e, area) => {
    if (appRole === 'PLAYER') return;
    if (!isTerrainEditMode || terrainEditTool !== 'move') return;
    e.stopPropagation();
    e.preventDefault();
    setEditingAreaId(area.id);
    pushToHistory();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialWidth = area.width;
    const initialHeight = area.height;
    let lastCommittedWidth = initialWidth;
    let lastCommittedHeight = initialHeight;

    const handleMouseMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;

      const gridDx = Math.round(dx / gridSize);
      const gridDy = Math.round(dy / gridSize);

      const nextWidth = Math.max(1, initialWidth + gridDx);
      const nextHeight = Math.max(1, initialHeight + gridDy);

      if (nextWidth !== lastCommittedWidth || nextHeight !== lastCommittedHeight) {
        lastCommittedWidth = nextWidth;
        lastCommittedHeight = nextHeight;
        handleUpdateArea(area.id, { width: nextWidth, height: nextHeight }, true);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleEdgeResizeStart = (e, area) => {
    if (appRole === 'PLAYER' || !isTerrainEditMode || terrainEditTool !== 'move') return;
    e.stopPropagation();
    e.preventDefault();
    setEditingAreaId(area.id);
    pushToHistory();
    const start = area.orientation === 'vertical' ? e.clientY : e.clientX;
    const startX = e.clientX;
    const startY = e.clientY;
    const initialEndX = Number(area.endX ?? area.gridX + 1);
    const initialEndY = Number(area.endY ?? area.gridY);
    const initialLength = Number(area.length || area.width || 1);
    const handleMouseMove = (moveEvent) => {
      if (area.orientation === 'free') {
        handleUpdateArea(area.id, {
          endX: Math.max(0, Math.min(mapWidth, initialEndX + Math.round((moveEvent.clientX - startX) / scale / gridSize))),
          endY: Math.max(0, Math.min(mapHeight, initialEndY + Math.round((moveEvent.clientY - startY) / scale / gridSize)))
        }, true);
        return;
      }
      const current = area.orientation === 'vertical' ? moveEvent.clientY : moveEvent.clientX;
      const nextLength = Math.max(1, Math.round(initialLength + (current - start) / scale / gridSize));
      handleUpdateArea(area.id, {
        length: nextLength,
        width: area.orientation === 'vertical' ? Number(area.thickness || 0.15) : nextLength,
        height: area.orientation === 'vertical' ? nextLength : Number(area.thickness || 0.15)
      }, true);
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Resizing circular terrain areas (radius snapped to ft)
  const handleCircleResizeStart = (e, area) => {
    if (appRole === 'PLAYER') return;
    if (!isTerrainEditMode || terrainEditTool !== 'move') return;
    e.stopPropagation();
    e.preventDefault();
    setEditingAreaId(area.id);
    pushToHistory();

    const startX = e.clientX;
    const initialRadius = area.radius;
    let lastCommittedRadius = initialRadius;

    const handleMouseMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const gridDx = Math.round(dx / gridSize);

      const nextRadius = Math.max(1, initialRadius + gridDx);

      if (nextRadius !== lastCommittedRadius) {
        lastCommittedRadius = nextRadius;
        handleUpdateArea(area.id, { radius: nextRadius }, true);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const drawingPointFromMouse = (event) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(mapWidth, (event.clientX - rect.left) / scale / gridSize)),
      y: Math.max(0, Math.min(mapHeight, (event.clientY - rect.top) / scale / gridSize))
    };
  };

  const pushDrawingHistory = (snapshot = mapDrawings) => {
    const history = drawingHistoryRef.current.get(activeMap.id) || [];
    history.push(structuredClone(snapshot));
    if (history.length > 30) history.shift();
    drawingHistoryRef.current.set(activeMap.id, history);
    setDrawingHistoryRevision(value => value + 1);
  };

  const eraseDrawingsAt = (point) => {
    const gesture = drawingGestureRef.current;
    if (!gesture || gesture.tool !== 'eraser') return;
    for (const stroke of gesture.original) if (strokeTouchesPoint(stroke, point, gridSize)) gesture.removed.add(stroke.id);
    setErasedDrawingIds(new Set(gesture.removed));
  };

  const beginDrawingGesture = (event) => {
    if (!isDrawingMode || event.button !== 0) return;
    const point = drawingPointFromMouse(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    if (drawingTool === 'eraser') {
      drawingGestureRef.current = { tool: 'eraser', original: mapDrawings, removed: new Set() };
      eraseDrawingsAt(point);
      return;
    }
    const stroke = {
      id: `drawing_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      color: drawingColor,
      width: drawingWidth,
      points: [point]
    };
    drawingGestureRef.current = { tool: 'pen', original: mapDrawings, stroke };
    setDraftStroke(stroke);
  };

  const continueDrawingGesture = (event) => {
    const gesture = drawingGestureRef.current;
    if (!gesture) return;
    const point = drawingPointFromMouse(event);
    if (!point) return;
    if (gesture.tool === 'eraser') {
      eraseDrawingsAt(point);
      return;
    }
    const previous = gesture.stroke.points.at(-1);
    if (Math.hypot(point.x - previous.x, point.y - previous.y) < 0.08) return;
    gesture.stroke = { ...gesture.stroke, points: [...gesture.stroke.points, point] };
    setDraftStroke(gesture.stroke);
  };

  const finishDrawingGesture = () => {
    const gesture = drawingGestureRef.current;
    if (!gesture) return;
    drawingGestureRef.current = null;
    if (gesture.tool === 'pen' && gesture.stroke.points.length) {
      pushDrawingHistory(gesture.original);
      updateMap(activeMap.id, { drawings: [...gesture.original, gesture.stroke] });
    } else if (gesture.tool === 'eraser' && gesture.removed.size) {
      pushDrawingHistory(gesture.original);
      updateMap(activeMap.id, { drawings: gesture.original.filter(stroke => !gesture.removed.has(stroke.id)) });
    }
    setDraftStroke(null);
    setErasedDrawingIds(new Set());
  };

  const undoDrawing = () => {
    const history = drawingHistoryRef.current.get(activeMap.id) || [];
    if (!history.length) return;
    const previous = history.pop();
    drawingHistoryRef.current.set(activeMap.id, history);
    updateMap(activeMap.id, { drawings: previous });
    setDrawingHistoryRevision(value => value + 1);
  };

  const clearDrawings = () => {
    if (!mapDrawings.length) return;
    pushDrawingHistory(mapDrawings);
    updateMap(activeMap.id, { drawings: [] });
  };

  // Brush Painting functions
  const handleMapMouseDown = (e) => {
    if (appRole === 'PLAYER') return;
    if (isDrawingMode) {
      beginDrawingGesture(e);
      return;
    }
    if (!isTerrainEditMode && !isVisionControlMode) return;
    
    // Ignore clicks on token handles or form inputs
    if (e.target.closest('.token-node') || e.target.closest('.terrain-resize-handle') || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') {
      return;
    }

    if (isVisionControlMode) {
      if (visionSelectionTool === 'pan') return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const gridX = Math.max(0, Math.min(mapWidth - 1, Math.floor(((e.clientX - rect.left) / scale) / gridSize)));
      const gridY = Math.max(0, Math.min(mapHeight - 1, Math.floor(((e.clientY - rect.top) / scale) / gridSize)));
      setIsSelecting(visionSelectionTool !== 'cell');
      setSelectionBox({ shape: visionSelectionTool, angle: visionConeAngle, startX: gridX, startY: gridY, endX: gridX, endY: gridY });
    } else if (terrainEditTool === 'paint_block' || terrainEditTool === 'paint_erase') {
      e.preventDefault();
      pushToHistory();
      lastPaintedCellRef.current = null;
      setIsPainting(true);
      paintCellAtMouse(e);
    } else if (terrainEditTool === 'box_select') {
      e.preventDefault();
      
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / scale;
      const clickY = (e.clientY - rect.top) / scale;
      const gridX = Math.floor(clickX / gridSize);
      const gridY = Math.floor(clickY / gridSize);
      
      // Check if clicking inside an existing selection box to drag/move it!
      const isInside = selectionBox && 
        gridX >= Math.min(selectionBox.startX, selectionBox.endX) && 
        gridX <= Math.max(selectionBox.startX, selectionBox.endX) && 
        gridY >= Math.min(selectionBox.startY, selectionBox.endY) && 
        gridY <= Math.max(selectionBox.startY, selectionBox.endY);
        
      if (isInside) {
        setIsDraggingSelection(true);
        setDragStartCell({ x: gridX, y: gridY });
        setDragOffset({ x: 0, y: 0 });
      } else {
        // Drawing a new selection box
        setIsSelecting(true);
        setSelectionBox({ startX: gridX, startY: gridY, endX: gridX, endY: gridY });
        setDragOffset({ x: 0, y: 0 });
      }
    }
  };

  const handleMapMouseMove = (e) => {
    if (isDrawingMode) {
      continueDrawingGesture(e);
      return;
    }
    if (!isTerrainEditMode && !isVisionControlMode) return;
    
    if (isVisionControlMode && visionSelectionTool !== 'pan' && isSelecting) {
      const rect = containerRef.current.getBoundingClientRect();
      const gridX = Math.max(0, Math.min(mapWidth - 1, Math.floor(((e.clientX - rect.left) / scale) / gridSize)));
      const gridY = Math.max(0, Math.min(mapHeight - 1, Math.floor(((e.clientY - rect.top) / scale) / gridSize)));
      setSelectionBox(previous => previous ? { ...previous, endX: gridX, endY: gridY } : null);
    } else if (isPainting && (terrainEditTool === 'paint_block' || terrainEditTool === 'paint_erase')) {
      paintCellAtMouse(e);
    } else if (terrainEditTool === 'box_select') {
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) / scale;
      const clickY = (e.clientY - rect.top) / scale;
      const gridX = Math.floor(clickX / gridSize);
      const gridY = Math.floor(clickY / gridSize);
      
      if (isSelecting) {
        setSelectionBox(prev => prev ? { ...prev, endX: gridX, endY: gridY } : null);
      } else if (isDraggingSelection && dragStartCell) {
        const dx = gridX - dragStartCell.x;
        const dy = gridY - dragStartCell.y;
        setDragOffset({ x: dx, y: dy });
      }
    }
  };

  const handleMapMouseUp = () => {
    if (isDrawingMode) finishDrawingGesture();
    setIsPainting(false);
    if (isVisionControlMode) {
      setIsSelecting(false);
      return;
    }
    
    if (terrainEditTool === 'box_select' || isVisionControlMode) {
      if (isSelecting) {
        setIsSelecting(false);
        // If selection size is 0 (just a click), clear the selectionBox!
        if (selectionBox && selectionBox.startX === selectionBox.endX && selectionBox.startY === selectionBox.endY) {
          setSelectionBox(null);
        }
      } else if (isDraggingSelection) {
        setIsDraggingSelection(false);
        if (dragStartCell && (dragOffset.x !== 0 || dragOffset.y !== 0)) {
          // Push history for undo support!
          pushToHistory();
          
          // Move the blocked cells inside the selection!
          setBlockedCells(prev => {
            const next = { ...prev };
            const cellsToMove = [];
            
            const minX = Math.min(selectionBox.startX, selectionBox.endX);
            const maxX = Math.max(selectionBox.startX, selectionBox.endX);
            const minY = Math.min(selectionBox.startY, selectionBox.endY);
            const maxY = Math.max(selectionBox.startY, selectionBox.endY);
            
            // Collect cells to move and delete their old keys
            Object.keys(next).forEach(key => {
              const [xs, ys] = key.split('_');
              const x = parseInt(xs, 10);
              const y = parseInt(ys, 10);
              if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                cellsToMove.push({ x, y });
                delete next[key];
              }
            });
            
            // Insert cells at the new offsetted positions
            cellsToMove.forEach(cell => {
              const newX = cell.x + dragOffset.x;
              const newY = cell.y + dragOffset.y;
              if (newX >= 0 && newX < mapWidth && newY >= 0 && newY < mapHeight) {
                next[`${newX}_${newY}`] = true;
              }
            });
            
            return next;
          });
          
          // Shift the selectionBox coordinates as well so it stays with the cells!
          setSelectionBox(prev => prev ? {
            startX: prev.startX + dragOffset.x,
            startY: prev.startY + dragOffset.y,
            endX: prev.endX + dragOffset.x,
            endY: prev.endY + dragOffset.y
          } : null);
        }
        setDragStartCell(null);
        setDragOffset({ x: 0, y: 0 });
      }
    }
  };

  const handleMapMouseLeave = () => {
    if (isDrawingMode) finishDrawingGesture();
    setIsPainting(false);
    if (terrainEditTool === 'box_select') {
      setIsSelecting(false);
      setIsDraggingSelection(false);
      setDragStartCell(null);
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const handleMapClick = (e) => {
    if (isTerrainEditMode) {
      // Clear select editing id if click was on empty space
      if (e.target === containerRef.current || e.target.style.backgroundImage) {
        setEditingAreaId(null);
      }
    }
  };

  // Bresenham's line algorithm for smooth continuous grid painting/erasing
  const getLinePoints = (x0, y0, x1, y1) => {
    const points = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    while (true) {
      points.push({ x, y });
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    return points;
  };

  const paintCellAtMouse = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    const scaledX = e.clientX - rect.left;
    const scaledY = e.clientY - rect.top;
    const unscaledX = scaledX / scale;
    const unscaledY = scaledY / scale;

    const gridX = Math.floor(unscaledX / gridSize);
    const gridY = Math.floor(unscaledY / gridSize);

    if (gridX >= 0 && gridX < mapWidth && gridY >= 0 && gridY < mapHeight) {
      let points = [];
      if (lastPaintedCellRef.current) {
        points = getLinePoints(lastPaintedCellRef.current.x, lastPaintedCellRef.current.y, gridX, gridY);
      } else {
        points = [{ x: gridX, y: gridY }];
      }
      
      lastPaintedCellRef.current = { x: gridX, y: gridY };

      setBlockedCells(prev => {
        const next = { ...prev };
        let changed = false;
        points.forEach(pt => {
          if (pt.x >= 0 && pt.x < mapWidth && pt.y >= 0 && pt.y < mapHeight) {
            const cellKey = `${pt.x}_${pt.y}`;
            const isCurrentlyBlocked = !!next[cellKey];
            if (terrainEditTool === 'paint_block' && !isCurrentlyBlocked) {
              next[cellKey] = true;
              changed = true;
            } else if (terrainEditTool === 'paint_erase' && isCurrentlyBlocked) {
              delete next[cellKey];
              changed = true;
            }
          }
        });
        return changed ? next : prev;
      });
    }
  };

  // Terrain area additions
  const handleAddRectArea = () => {
    const newArea = {
      id: 'terrain_' + Date.now(),
      name: '新未命名矩形区',
      type: 'rect',
      color: 'custom',
      customColor: '#6b7280',
      hazardLevel: 'none',
      gridX: Math.floor(mapWidth / 4),
      gridY: Math.floor(mapHeight / 4),
      width: 6,
      height: 4,
      isSecret: false,
      isImpassable: defaultImpassable
    };
    setTerrainAreas([...terrainAreas, newArea]);
    setEditingAreaId(newArea.id);
  };

  const handleAddCircleArea = () => {
    const newArea = {
      id: 'terrain_' + Date.now(),
      name: '新未命名圆形区',
      type: 'circle',
      color: 'custom',
      customColor: '#6b7280',
      hazardLevel: 'none',
      gridX: Math.floor(mapWidth / 2),
      gridY: Math.floor(mapHeight / 2),
      radius: 4,
      isSecret: false,
      isImpassable: defaultImpassable
    };
    setTerrainAreas([...terrainAreas, newArea]);
    setEditingAreaId(newArea.id);
  };

  const handleAddFeature = (presetKey = featurePreset) => {
    pushToHistory();
    const newArea = createTerrainFeature(presetKey, {
      id: `terrain_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      gridX: Math.floor(mapWidth / 2),
      gridY: Math.floor(mapHeight / 2)
    });
    setTerrainAreas([...terrainAreas, newArea]);
    setEditingAreaId(newArea.id);
    setTerrainEditTool('move');
  };

  const handleUpdateArea = (id, updatedFields) => {
    setTerrainAreas(terrainAreas.map(area => {
      if (area.id === id) {
        return { ...area, ...updatedFields };
      }
      return area;
    }));
  };

  const handleDeleteArea = (id) => {
    pushToHistory();
    setTerrainAreas(terrainAreas.filter(area => area.id !== id));
    if (editingAreaId === id) setEditingAreaId(null);
  };

  const handleDuplicateArea = (area) => {
    pushToHistory();
    const newId = 'terrain_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const newArea = {
      ...area,
      id: newId,
      name: `${area.name} (副本)`,
      gridX: Math.min(mapWidth - 2, area.gridX + 2),
      gridY: Math.min(mapHeight - 2, area.gridY + 2)
    };
    setTerrainAreas([...terrainAreas, newArea]);
    setEditingAreaId(newArea.id);
    if (addLog) {
      addLog({
        type: 'COMBAT',
        content: `复制了区域地形: **${area.name}** -> **${newArea.name}**`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const handleClearAllTerrains = () => {
    if (window.confirm('确定要清空当前地图上的所有阻挡网格与区域地形吗？清空后可立即使用撤销恢复。')) {
      pushToHistory();
      setBlockedCells({});
      setTerrainAreas([]);
      setEditingAreaId(null);
    }
  };

  // Summon all PC character tokens located on other maps to the center of active map
  const handleSummonCharacters = () => {
    if (unplacedPCs.length === 0) return;

    const centerX = Math.floor(mapWidth / 2);
    const centerY = Math.floor(mapHeight / 2);

    unplacedPCs.forEach((char, idx) => {
      // Displace slightly if summoning multiple tokens to prevent overlap stacking
      const offsetX = (idx % 3) - 1;
      const offsetY = Math.floor(idx / 3) - 1;
      const targetX = Math.max(0, Math.min(mapWidth - 1, centerX + offsetX));
      const targetY = Math.max(0, Math.min(mapHeight - 1, centerY + offsetY));

      updateTokenPosition(char.id, targetX, targetY, activeMapId);
    });

    if (addLog) {
      addLog({
        type: 'COMBAT',
        content: `DM 一键召唤了所有玩家角色至当前地图 **[${activeMap.name}]** 视口中央，开启战役推演！`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  // --- Turn-based Combat initiative systems ---

  // Initialize and open Initiative Prep modal
  const handleOpenCombatSetup = () => {
    // Select all characters currently on this active map by default
    const currentMapChars = characters.filter(c => c.mapId === activeMapId);
    const initialParticipants = {};
    const initialManuals = {};
    currentMapChars.forEach(c => {
      initialParticipants[c.id] = true;
      initialManuals[c.id] = c.initiative !== undefined ? c.initiative + 10 : 10;
    });
    setTempParticipants(initialParticipants);
    setManualInitiatives(initialManuals);
    setShowInitiativePrep(true);
  };

  // Roll D20 initiative plus mods for selected participants and start combat
  const handleRollAndStartCombat = () => {
    const activeParticipantsIds = Object.keys(tempParticipants).filter(id => tempParticipants[id]);
    if (activeParticipantsIds.length === 0) {
      alert('请至少勾选一位角色参与战斗！');
      return;
    }

    const rolls = rollInitiative(characters, activeParticipantsIds);
    rolls.forEach(result => {
      const character = characters.find(candidate => candidate.id === result.id);
      if (character && addLog) {
        addLog({
          type: 'DICE',
          content: `先攻投掷: [${character.name}] 1d20(${result.roll}) + 修正(${result.modifier}) = **${result.total}**`,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    });

    // Reset each participant character's combat speeds, start grids, and turn resources
    setCharacters(prev => prev.map(c => {
      if (activeParticipantsIds.includes(c.id)) {
        return prepareCharacterForCombat(c);
      }
      return c;
    }));

    setCombatParticipants(activeParticipantsIds);
    setCombatTurnOrder(rolls);
    setCombatRound(1);
    setCurrentTurnIndex(0);
    setIsInCombat(true);
    setShowInitiativePrep(false);

    const firstActiveId = rolls[0]?.id;
    const firstChar = characters.find(c => c.id === firstActiveId);

    if (addLog) {
      addLog({
        type: 'COMBAT',
        content: `**战斗正式爆发 (回合 1)**！当前共有 ${activeParticipantsIds.length} 位角色参战。先攻行动首发者为: **[${firstChar ? firstChar.name :'未知'}]**！`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  // Exit turn-based combat completely
  const handleExitCombat = () => {
    if (window.confirm('确定要退出当前战斗状态并恢复自由探索模式吗？历史先攻顺序将被清理。')) {
      setIsInCombat(false);
      setCombatParticipants([]);
      setCombatTurnOrder([]);
      setCombatRound(1);
      setCurrentTurnIndex(0);
      if (addLog) {
        addLog({
          type: 'COMBAT',
          content: `退出战斗，系统回归自由行动模式。所有角色的行动限制已解除。`,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }
  };

  // Next character turn flow
  const handleNextTurn = () => {
    if (combatTurnOrder.length === 0) return;

    const { nextIndex, nextRound, wrapped } = advanceCombatTurn(currentTurnIndex, combatRound, combatTurnOrder.length);

    const endingActiveId = combatTurnOrder[currentTurnIndex]?.id;
    if (endingActiveId) setCharacters(previous => previous.map(character => character.id === endingActiveId ? processTurnEndConditions(character).character : character));

    if (wrapped) {
      setCombatRound(nextRound);
      setCharacters(previous => {
        const result = tickRoundConditions(previous);
        result.expired.forEach(({ characterName, condition }) => addLog?.({
          type: 'COMBAT',
          content: `状态消除：角色 [${characterName}] 身上的 [${condition.name}] 持续时间到期，状态已被完全清除。`,
          timestamp: new Date().toLocaleTimeString()
        }));
        return result.characters;
      });
    }

    setCurrentTurnIndex(nextIndex);

    const nextActiveId = combatTurnOrder[nextIndex]?.id;
    const nextChar = characters.find(c => c.id === nextActiveId);

    // 2. Refresh next active character's movement points & start grid anchors, and reset turn resources
    setCharacters(prev => prev.map(c => {
      if (c.id === nextActiveId) {
        const started = processTurnStartConditions(c).character;
        const reset = resetTurnResources(started);
        return { ...reset, combatSpeedRemaining: started.combatSpeedRemaining };
      }
      return c;
    }));

    if (addLog) {
      addLog({
        type: 'COMBAT',
        content: `行动权交接 (回合 ${nextRound})：当前轮到 **[${nextChar ? nextChar.name :'未知'}]** 执行战术决策！`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  // Add a status condition to a character
  const handleAddCondition = (charId, name, durationStr) => {
    const duration = durationStr === 'permanent' ? 'permanent' : parseInt(durationStr, 10) || 3;
    const newCond = {
      id: 'cond_' + Date.now(),
      name,
      duration,
      color: name === '眩晕' || name === '倒地' || name === '致盲' ? 'red' : 'amber'
    };

    setCharacters(prev => prev.map(c => {
      if (c.id === charId) {
        return {
          ...c,
          conditions: [...(c.conditions || []), newCond]
        };
      }
      return c;
    }));

    if (addLog) {
      const char = characters.find(ch => ch.id === charId);
      addLog({
        type: 'COMBAT',
        content: `状态变更：为 [${char ? char.name :'未知'}] 附加了特殊状态 [${name}] (持续 ${duration ==='permanent'?'永久':`${duration} 回合`})。`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
    setShowConditionPopupId(null);
  };

  // Remove a status condition manually
  const handleRemoveCondition = (charId, condId) => {
    setCharacters(prev => prev.map(c => {
      if (c.id === charId) {
        const removed = c.conditions.find(cond => cond.id === condId);
        const filtered = c.conditions.filter(cond => cond.id !== condId);
        if (removed && addLog) {
          addLog({
            type: 'COMBAT',
            content: `状态消除：DM 手动清除了 [${c.name}] 身上的特殊状态 [${removed.name}]。`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
        return { ...c, conditions: filtered };
      }
      return c;
    }));
  };

  const handleQuickPatchArea = (area, updater) => {
    if (!area) return;
    pushToHistory();
    setTerrainAreas(terrainAreas.map(candidate => {
      if (candidate.id !== area.id) return candidate;
      return typeof updater === 'function' ? updater(candidate) : { ...candidate, ...updater };
    }));
  };

  const handleQuickRevealArea = (area) => {
    handleQuickPatchArea(area, { discoveredByParty: true });
    addLog?.({ type: 'SYSTEM', visibility: 'private', content: `DM 已向玩家揭示 **${area.name}**。`, timestamp: new Date().toLocaleTimeString() });
  };

  const handleQuickDestroyArea = (area) => {
    handleQuickPatchArea(area, current => current.featureType === 'door'
      ? { ...setDoorState(current, 'broken'), currentHp: 0, visualState: current.availableStates?.includes('broken') ? 'broken' : current.visualState }
      : { ...current, currentHp: 0, visualState: current.availableStates?.includes('broken') ? 'broken' : current.availableStates?.includes('collapsed') ? 'collapsed' : current.visualState });
  };

  const handleQuickRepairArea = (area) => {
    handleQuickPatchArea(area, current => {
      const restoredState = current.availableStates?.find(state => !['broken', 'collapsed', 'damaged', 'overturned'].includes(state));
      const repaired = current.featureType === 'door' ? setDoorState(current, 'closed') : current;
      return { ...repaired, currentHp: Number(current.maxHp || 1), ...(restoredState ? { visualState: restoredState } : {}) };
    });
  };

  const handleQuickToggleDoor = (area) => {
    if (appRole === 'PLAYER' || area?.featureType !== 'door') return;
    pushToHistory();
    handleUpdateArea(area.id, toggleDoorState(area));
  };

  const handleRemoveTokenFromMap = (character) => {
    const isDefeatedEnemy = isInCombat && character.type === 'NPC' && Number(character.hp) <= 0;
    if (isDefeatedEnemy) {
      const nextCombat = removeCombatantFromState(character.id, combatParticipants, combatTurnOrder, currentTurnIndex);
      setCharacters(previous => previous.filter(entry => entry.id !== character.id));
      setCombatParticipants(nextCombat.combatParticipants);
      setCombatTurnOrder(nextCombat.combatTurnOrder);
      setCurrentTurnIndex(nextCombat.currentTurnIndex);
    } else {
      setCharacters(previous => previous.map(entry => entry.id === character.id ? { ...entry, mapId: null } : entry));
    }
    addLog?.({
      type: 'COMBAT',
      content: isDefeatedEnemy
        ? `**死亡单位清理**：[${character.name}] 在 HP 归零后被移出地图，已同时从角色列表与战斗顺序删除。`
        : `角色 [${character.name}] 已手动从地图移出。`,
      timestamp: new Date().toLocaleTimeString()
    });
    setSelectedTokenId(null);
    onCharacterSelect?.(null);
  };

  // Adjust HP values
  const adjustHp = (charId, amount) => {
    setCharacters(prev => prev.map(c => {
      if (c.id === charId) {
        const newHp = Math.max(0, Math.min(c.maxHp, c.hp + amount));
        if (addLog && newHp !== c.hp) {
          addLog({
            type: 'COMBAT',
            content: `角色 [${c.name}] HP 变更: **${c.hp}** -> **${newHp}** (最大值: ${c.maxHp})`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
        return { ...c, hp: newHp };
      }
      return c;
    }));
  };

  // Reset current turn: flashback position & restore movement speed points
  const handleResetTurnMovement = (charId) => {
    const char = characters.find(c => c.id === charId);
    if (!char) return;

    const startX = char.combatStartGridX !== undefined ? char.combatStartGridX : 2;
    const startY = char.combatStartGridY !== undefined ? char.combatStartGridY : 2;
    const initialSpeed = char.speed !== undefined ? char.speed : 30;

    // Flashback token coordinates
    updateTokenPosition(charId, startX, startY, activeMapId);

    // Restore speed points & turn resources
    setCharacters(prev => prev.map(c => {
      if (c.id === charId) {
        const updatedResources = (c.resources || []).map(res => {
          if (res.resetType === 'turn') {
            return { ...res, value: res.max };
          }
          return res;
        });
        return {
          ...c,
          combatSpeedRemaining: initialSpeed,
          resources: updatedResources
        };
      }
      return c;
    }));

    if (addLog) {
      addLog({
        type: 'COMBAT',
        content: `**重置回合**: [${char.name}] 撤销了本回合的战术跑位！棋子闪回至起点 (${startX}ft, ${startY}ft)，已用移动力完全复原！`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const selectedTokenObj = characters.find(c => c.id === selectedTokenId);
  const hoveredTokenObj = characters.find(c => c.id === hoveredTokenId);

  // Colour keys are persisted in campaign saves, so they stay; only what they
  // resolve to changed. `bg` is a 45° hatch rather than a flat tint — the plate
  // grammar draws terrain as a survey hatch — and `glow` is now just a line,
  // because the system has no glow shadows.
  const colorConfig = {
    red: { value: 'var(--pigment-madder)', bg: TERRAIN_HATCH('madder'), glow: 'var(--pigment-madder-line)', label: '烈火/熔岩' },
    emerald: { value: 'var(--pigment-verdigris)', bg: TERRAIN_HATCH('verdigris'), glow: 'var(--pigment-verdigris-line)', label: '剧毒/酸性' },
    blue: { value: 'var(--pigment-woad)', bg: TERRAIN_HATCH('woad'), glow: 'var(--pigment-woad-line)', label: '冰霜/深水' },
    amber: { value: 'var(--pigment-ochre)', bg: TERRAIN_HATCH('ochre'), glow: 'var(--pigment-ochre-line)', label: '碎石/困难' },
    purple: { value: 'var(--accent)', bg: TERRAIN_HATCH('accent'), glow: 'var(--accent-line)', label: '法术/诅咒' },
  };

  const getAreaColor = (area) => {
    if (area.color !== 'custom') return colorConfig[area.color] || colorConfig.purple;
    const value = safeTerrainColor(area);
    return {
      value,
      bg: `repeating-linear-gradient(45deg, color-mix(in srgb, ${value} 22%, transparent) 0 3px, transparent 3px 7px)`,
      glow: `color-mix(in srgb, ${value} 55%, transparent)`,
      label: '自定义颜色'
    };
  };

  // Filter terrains visible to the current perspective
  const visibleTerrains = !isVisionLimitedView ? terrainAreas : terrainAreas.flatMap(area => {
    if (area.isSecret && area.discoveredByParty !== true) return [];
    if (terrainTouchesCells(area, playerVisibility.visible)) return [area];
    const remembered = normalizeMapVision(activeMap).exploredTerrainStates?.[area.id];
    if (remembered) return [remembered];
    const dynamic = area.featureState || area.destructible === true;
    return !dynamic && terrainTouchesCells(area, playerVisibility.explored) ? [area] : [];
  });

  // Helper to determine if a cell is blocked by brush walls or impassable vector shapes
  const terrainGeometry = useMemo(() => ({ terrainAreas }), [terrainAreas]);
  const terrainSpatialIndex = useMemo(() => getTerrainSpatialIndex(terrainGeometry), [terrainGeometry]);
  const movingCharacter = useMemo(
    () => characters.find(character => character.id === draggedToken?.id),
    [characters, draggedToken?.id]
  );

  const isCellBlocked = useCallback((x, y) => {
    for (const footprintCell of footprintCoveredCells(x, y, movingCharacter)) {
      const cellX = footprintCell.x;
      const cellY = footprintCell.y;
      if (cellX < 0 || cellX >= mapWidth || cellY < 0 || cellY >= mapHeight) return true;
      if (blockedCells[`${cellX}_${cellY}`]) return true;
      for (const area of terrainAreasAtCell(terrainGeometry, cellX, cellY, terrainSpatialIndex)) {
        if (terrainBlocksMovement(area, movingCharacter)) return true;
      }
    }
    return false;
  }, [blockedCells, mapHeight, mapWidth, movingCharacter, terrainGeometry, terrainSpatialIndex]);

  // Helper to determine if a cell is difficult terrain (amber color and visible)
  const isCellDifficult = useCallback((x, y) => {
    for (const footprintCell of footprintCoveredCells(x, y, movingCharacter)) {
      for (const area of terrainAreasAtCell(terrainGeometry, footprintCell.x, footprintCell.y, terrainSpatialIndex)) {
        if (isVisionLimitedView && area.isSecret && area.discoveredByParty !== true) continue; // Skip unrevealed secret traps in player-style views
        if (isDifficultTerrain(area)) return true;
      }
    }
    return false;
  }, [isVisionLimitedView, movingCharacter, terrainGeometry, terrainSpatialIndex]);

  const canTraverseStep = useCallback(
    (fromX, fromY, toX, toY) => canTraverseTerrainStep(
      terrainGeometry, fromX, fromY, toX, toY, movingCharacter, terrainSpatialIndex
    ),
    [movingCharacter, terrainGeometry, terrainSpatialIndex]
  );

  // Calculate A* path for dragging
  let dragPath;
  let dragPathDistance = 0;
  let dragPathExists = false;
  let dragSvgPathD = '';
  let dragIsNonActiveCombatMove = false;
  let dragIsSpeedExceeded = false;
  let dragActiveCharName = '';
  let dragSpeedRemaining = 30;
  const canUndoDrawing = drawingHistoryRevision >= 0 && (drawingHistoryRef.current.get(activeMap.id)?.length || 0) > 0;
  const renderedDrawings = [
    ...mapDrawings.filter(stroke => !erasedDrawingIds.has(stroke.id)),
    ...(draftStroke ? [draftStroke] : [])
  ];

  if (draggedToken && dragHoverCoords && !draggedToken.isNewPlacement) {
    const isForced = isForcedMoveMode || dragIsShiftPressed;

    // 1. If in combat, validate turn
    if (isInCombat && !isForced) {
      const activeParticipant = combatTurnOrder[currentTurnIndex];
      const activeChar = characters.find(c => c.id === activeParticipant?.id);
      dragActiveCharName = activeChar ? compactCharacterName(activeChar.name) : '未知';
      
      if (activeParticipant?.id !== draggedToken.id) {
        dragIsNonActiveCombatMove = true;
      }
    }

    dragPath = findShortestPathCached(
      draggedToken.startX,
      draggedToken.startY,
      dragHoverCoords.x,
      dragHoverCoords.y,
      mapWidth,
      mapHeight,
      isCellBlocked,
      isCellDifficult,
      canTraverseStep
    );

    if (dragPath) {
      dragPathExists = true;
      // Calculate distance along path (Euclidean step costs + difficult terrain double cost)
      for (let i = 1; i < dragPath.length; i++) {
        const p1 = dragPath[i - 1];
        const p2 = dragPath[i];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        let stepCost = Math.hypot(dx, dy);
        if (isCellDifficult(p2.x, p2.y)) {
          stepCost *= 2.0;
        }
        dragPathDistance += stepCost;
      }
      // Generate SVG path d-string
      dragSvgPathD = dragPath.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x * gridSize + gridSize/2} ${p.y * gridSize + gridSize/2}`).join(' ');

      if (isInCombat && !dragIsNonActiveCombatMove && !isForced) {
        const draggedChar = characters.find(c => c.id === draggedToken.id);
        dragSpeedRemaining = draggedChar?.combatSpeedRemaining !== undefined ? draggedChar.combatSpeedRemaining : (draggedChar?.speed !== undefined ? draggedChar.speed : 30);
        if (dragPathDistance > dragSpeedRemaining) {
          dragIsSpeedExceeded = true;
          dragPathExists = false; // Turn line red for speed exceeded
        }
      }
    } else {
      // Straight line fallback distance if completely blocked
      const dx = dragHoverCoords.x - draggedToken.startX;
      const dy = dragHoverCoords.y - draggedToken.startY;
      let stepCost = Math.hypot(dx, dy);
      if (isCellDifficult(dragHoverCoords.x, dragHoverCoords.y)) {
        stepCost *= 2.0;
      }
      dragPathDistance = stepCost;

      // If forced movement, we still allow straight line rendering
      if (isForced) {
        dragPathExists = true;
        dragSvgPathD = `M ${draggedToken.startX * gridSize + gridSize/2} ${draggedToken.startY * gridSize + gridSize/2} L ${dragHoverCoords.x * gridSize + gridSize/2} ${dragHoverCoords.y * gridSize + gridSize/2}`;
      } else {
        dragPathExists = false;
      }
    }

    if (isInCombat && dragIsNonActiveCombatMove && !isForced) {
      dragPathExists = false; // Turn line red for wrong turn
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>

      {/* Map control toolbar */}
      <Toolbar style={{ borderBottom: 'var(--border-hairline)', background: 'var(--surface-panel)', flexShrink: 0 }} dense>
        <ToolbarLabel>Map</ToolbarLabel>
        <span style={{ width: 200 }}>
          <Select
            size="sm"
            value={activeMapId}
            onChange={(e) => { setActiveMapId(e.target.value); setSelectedTokenId(null); setEditingAreaId(null); }}
            options={maps.map(m => ({ value: m.id, label: m.name }))}
          />
        </span>

        {!isPlayerViewMode && (
          <>
            <Button
              size="sm"
              variant="secondary"
              icon="plus"
              title= "新建一张空白推演地图"
              onClick={() => {
                const name = prompt('请输入新准备的战役地图名称:', `新战役地图 ${maps.length + 1}`);
                if (name) {
                  addMap(name, 40, 30, '');
                  setShowMapConfig(true); // let the DM set dimensions / background straight away
                }
              }}
            >
              新建地图
            </Button>
            <Button
              size="sm"
              variant={showMapConfig ? 'primary' : 'ghost'}
              icon="sliders-horizontal"
              title= "配置当前激活地图的名字、背景图片 URL 与网格尺幅"
              onClick={() => setShowMapConfig(!showMapConfig)}
            >
              地图配置
            </Button>
          </>
        )}

        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
          {activeMap.width}×{activeMap.height} · 1ft
        </span>

        {isDmVisionPreviewAvailable && (
          <>
            <ToolbarDivider />
            <ToolbarLabel>视野</ToolbarLabel>
            <SegmentedControl
              ariaLabel="DM 本地视野预览"
              fullWidth={false}
              value={dmVisionPreview}
              onChange={mode => {
                setDmVisionPreview(mode);
                setTerrainHint(null);
                if (mode !== 'bright') {
                  setSelectedTokenId(null);
                  setHoveredTokenId(null);
                }
              }}
              items={DM_VISION_PREVIEW_ITEMS}
              style={{ flexShrink: 0 }}
            />
          </>
        )}

        <span style={{ flex: 1 }} />

        {!isPlayerViewMode && (
          <>
            {isInCombat ? (
              <>
                <Button size="sm" variant="danger" icon="flag-checkered" onClick={handleExitCombat} title= "退出当前战斗模式，清除先攻行动队列">
                  退出战斗
                </Button>
                <Button
                  size="sm"
                  variant={isForcedMoveMode ? 'primary' : 'secondary'}
                  icon="arrows-out-cardinal"
                  onClick={() => setIsForcedMoveMode(!isForcedMoveMode)}
                  title= "开启后，战斗中可无视回合与移动力限制强制移动任何棋子，且不扣减其移动力（或在拖拽时按住 Shift 键触发临时强制位移）"
                >
                  强制位移: {isForcedMoveMode ? '开启' : '关闭'}
                </Button>
              </>
            ) : (
              <Button size="sm" icon="sword" onClick={handleOpenCombatSetup} title= "发起战斗回合，选择参战角色投先攻">
                发起战斗
              </Button>
            )}
            <ToolbarDivider />
            <Button
              size="sm"
              variant={isVisionControlMode ? 'primary' : 'secondary'}
              icon="eye"
              onClick={() => {
                setIsVisionControlMode(value => !value);
                setIsDrawingMode(false);
                setIsTerrainEditMode(false);
                setEditingAreaId(null);
                setSelectionBox(null);
                setVisionSelectionTool('pan');
              }}
              title="控制玩家端与直播端的同步视野，并框选强制显示或遮蔽区域"
            >
              {isVisionControlMode ? '退出视野控制' : '玩家视野'}
            </Button>
            <Button
              size="sm"
              variant={isDrawingMode ? 'primary' : 'secondary'}
              icon="pencil-simple"
              onClick={() => {
                setIsDrawingMode(value => !value);
                setIsVisionControlMode(false);
                setIsTerrainEditMode(false);
                setEditingAreaId(null);
              }}
              title={isDrawingMode ? '退出地图标注模式' : '在地图上绘制会同步到直播端的标注'}
            >
              {isDrawingMode ? '退出标注' : '地图标注'}
            </Button>
            <Button
              size="sm"
              variant={isTerrainEditMode ? 'primary' : 'secondary'}
              icon={isTerrainEditMode ? 'check' : 'paint-brush'}
              onClick={() => { setIsTerrainEditMode(!isTerrainEditMode); setIsDrawingMode(false); setIsVisionControlMode(false); setEditingAreaId(null); setTerrainEditTool('pan'); setSelectionBox(null); }}
              title={isTerrainEditMode ? '保存并退出地形编辑模式' : '进入地形编辑模式，绘制阻挡格与地形区域'}
            >
              {isTerrainEditMode ? '保存并退出编辑' : '快速编辑地图'}
            </Button>
          </>
        )}
      </Toolbar>

      {isVisionControlMode && !isPlayerViewMode && (() => {
        const vision = normalizeMapVision(activeMap);
        const publicMode = vision.enabled === false ? 'bright' : vision.publicMode;
        const overrideCount = Object.keys(vision.manualVisibleCells).length + Object.keys(vision.manualHiddenCells).length;
        const selectedCellCount = selectionBox ? visionSelectionCells(selectionBox, mapWidth, mapHeight).size : 0;
        const initialMemoryCount = Object.keys(vision.memoryInitialCells).length;
        const currentMemoryCount = Object.keys(vision.memoryCurrentCells).length || Object.keys(vision.exploredCells).length;
        return <div style={{
          position: 'relative', zIndex: 1100, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
          padding: 'var(--space-3) var(--space-5)', background: 'var(--surface-sunken)', borderBottom: 'var(--border-hairline)'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-2)' }}>
            <ToolbarLabel>玩家与直播</ToolbarLabel>
            <SegmentedControl ariaLabel="玩家与直播同步视野" fullWidth={false} value={publicMode} onChange={updatePublicVisionMode} items={PUBLIC_VISION_MODE_ITEMS} style={{ flexShrink: 0 }} />
            <ToolbarDivider />
            <Badge size="sm" tone={vision.rememberExplored ? 'verdigris' : 'madder'}>
              {vision.rememberExplored ? '记忆实时记录中' : '记忆已暂停 · 仅看当前'}
            </Badge>
            {vision.rememberExplored && <Button size="sm" variant="secondary" icon="pause" onClick={pauseExplorationMemory} title="暂停显示和积累探索记忆，但保留当前与起点档案">暂停记忆</Button>}
            <Button size="sm" variant={vision.rememberExplored ? 'ghost' : 'primary'} icon="clock-counter-clockwise" onClick={() => resumeExplorationMemory('current')} title="打开当前累计的迷雾记忆，并继续实时记录">恢复当前 ({currentMemoryCount})</Button>
            <Button size="sm" variant="ghost" icon="arrow-u-up-left" onClick={() => resumeExplorationMemory('initial')} title="回到记忆记录开始前的探索状态，并继续实时记录">恢复起点 ({initialMemoryCount})</Button>
            <Button size="sm" variant="ghost" onClick={resetExplorationMemoryStart} title="把当前探索状态保存为新的起点和当前档案">设当前为起点</Button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-2)' }}>
            <ToolbarLabel>视野选区</ToolbarLabel>
            <SegmentedControl
              ariaLabel="玩家视野选区形状"
              fullWidth={false}
              value={visionSelectionTool}
              onChange={tool => { setVisionSelectionTool(tool); setSelectionBox(null); setIsSelecting(false); }}
              items={VISION_SELECTION_ITEMS}
              style={{ flexShrink: 0 }}
            />
            {visionSelectionTool === 'cone' && <Select
              size="sm" fullWidth={false} aria-label="锥形角度" value={String(visionConeAngle)}
              onChange={event => { setVisionConeAngle(Number(event.target.value) || 60); setSelectionBox(null); }}
              options={[30, 45, 60, 90, 120].map(value => ({ value: String(value), label: `${value}°` }))}
              style={{ width: 76 }}
            />}
            <ToolbarDivider />
            {selectionBox ? <>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--accent)' }}>已选 {selectedCellCount} 格</span>
              <Button size="sm" variant="secondary" icon="eye" onClick={() => applyVisionSelection('show')} title="强制玩家端与直播端显示选区">显示选区</Button>
              <Button size="sm" variant="danger" icon="eye-slash" onClick={() => applyVisionSelection('hide')} title="强制遮蔽选区，并移除该区域的探索记忆">遮蔽选区</Button>
              <Button size="sm" variant="secondary" icon="arrow-counter-clockwise" onClick={() => applyVisionSelection('auto')} title="移除选区手动覆盖，恢复角色视线、光照与遮挡判定">恢复自动</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectionBox(null)}>取消</Button>
            </> : <span style={{ color: 'var(--text-faint)', fontSize: 'var(--type-meta)' }}>
              {visionSelectionTool === 'pan' ? '拖拽地图移动视角；切换形状后再编辑视野' : visionSelectionTool === 'cell' ? '点击一个地格' : '从起点拖拽到范围边缘'}
            </span>}
            <span style={{ flex: '1 1 16px' }} />
            {overrideCount > 0 && <Button size="sm" variant="ghost" icon="broom" onClick={() => updateMap(activeMap.id, { vision: { ...vision, manualVisibleCells: {}, manualHiddenCells: {} } })} title="清除当前地图全部手动显示与遮蔽覆盖">清除覆盖 ({overrideCount})</Button>}
          </div>
        </div>;
      })()}

      {isDrawingMode && !isPlayerViewMode && (
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)',
          padding: 'var(--space-2) var(--space-5)', background: 'var(--surface-sunken)', borderBottom: 'var(--border-hairline)'
        }}>
          <ToolbarLabel>地图标注</ToolbarLabel>
          <IconButton icon="pencil-simple" active={drawingTool === 'pen'} onClick={() => setDrawingTool('pen')} title="自由画笔" />
          <IconButton icon="eraser" active={drawingTool === 'eraser'} onClick={() => setDrawingTool('eraser')} title="按笔画擦除" />
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)', fontSize: 'var(--type-meta)' }}>
            颜色
            <input
              type="color"
              value={drawingColor}
              onChange={event => setDrawingColor(event.target.value)}
              title="画笔颜色"
              style={{ width: 34, height: 26, padding: 1, border: 'var(--border-hairline)', background: 'var(--surface-raised)' }}
            />
          </label>
          <Select
            size="sm"
            fullWidth={false}
            value={String(drawingWidth)}
            onChange={event => setDrawingWidth(Number(event.target.value) || 4)}
            options={[
              { value: '2', label: '细线 2px' }, { value: '4', label: '标准 4px' },
              { value: '7', label: '粗线 7px' }, { value: '11', label: '强调 11px' }
            ]}
            style={{ width: 120 }}
          />
          <ToolbarDivider />
          <Button size="sm" variant="secondary" icon="arrow-u-up-left" disabled={!canUndoDrawing} onClick={undoDrawing} title="撤回上一次画笔、擦除或清空操作">撤回</Button>
          <Button size="sm" variant="danger" icon="broom" disabled={!mapDrawings.length} onClick={clearDrawings} title="清除当前地图全部标注；可立即撤回">一键清除</Button>
          <span style={{ color: 'var(--text-faint)', fontSize: 'var(--type-micro)' }}>仅为视觉标注，不影响地形、移动与视野判定</span>
        </div>
      )}

      {/* Map properties (DM only) */}
      {showMapConfig && !isPlayerViewMode && (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            gap: 'var(--space-4)',
            padding: 'var(--space-4) var(--space-5)',
            background: 'var(--surface-sunken)',
            borderBottom: 'var(--border-hairline)'
          }}
        >
          <TextInput
            size="sm"
            label= "重命名当前地图"
            value={activeMap.name}
            onChange={(e) => updateMap(activeMap.id, { name: e.target.value })}
            placeholder= "地图名称"
            fullWidth={false}
            style={{ width: 170 }}
          />
          <TextInput
            size="sm"
            mono
            type="number"
            label= "宽度 (ft)"
            value={activeMap.width}
            onChange={(e) => updateMap(activeMap.id, { width: Math.max(10, parseInt(e.target.value, 10) || 40) })}
            fullWidth={false}
            style={{ width: 78 }}
          />
          <TextInput
            size="sm"
            mono
            type="number"
            label= "高度 (ft)"
            value={activeMap.height}
            onChange={(e) => updateMap(activeMap.id, { height: Math.max(10, parseInt(e.target.value, 10) || 30) })}
            fullWidth={false}
            style={{ width: 78 }}
          />
          <TextInput
            size="sm"
            label= "背景图片大图 URL (可选)"
            value={activeMap.bgUrl || ''}
            onChange={(e) => updateMap(activeMap.id, { bgUrl: e.target.value })}
            placeholder= "可粘贴外部网络或本地图片 URL 地址"
            style={{ flex: 1, minWidth: 240 }}
          />
          <Select
            size="sm"
            label="环境光"
            value={normalizeMapVision(activeMap).ambientLight}
            onChange={(e) => updateMap(activeMap.id, { vision: { ...normalizeMapVision(activeMap), ambientLight: e.target.value } })}
            options={[{ value: 'bright', label: '明亮' }, { value: 'dim', label: '微光' }, { value: 'dark', label: '黑暗' }]}
          />
          <TextInput
            size="sm"
            mono
            type="number"
            label="楼层净高 (ft)"
            value={normalizeMapVision(activeMap).ceilingHeight || 10}
            onChange={(event) => updateMap(activeMap.id, { vision: { ...normalizeMapVision(activeMap), ceilingHeight: Math.max(1, Number(event.target.value) || 10) } })}
            fullWidth={false}
            style={{ width: 96 }}
          />
          <TextInput
            size="sm"
            mono
            type="number"
            label="室内视野上限 (ft)"
            value={Math.min(180, normalizeMapVision(activeMap).visionRangeCap || 180)}
            onChange={(event) => updateMap(activeMap.id, { vision: { ...normalizeMapVision(activeMap), visionRangeCap: Math.min(180, Math.max(1, Number(event.target.value) || 180)) } })}
            fullWidth={false}
            style={{ width: 126 }}
          />
          <Checkbox
            checked={normalizeMapVision(activeMap).enabled !== false}
            onChange={() => updateMap(activeMap.id, { vision: { ...normalizeMapVision(activeMap), enabled: normalizeMapVision(activeMap).enabled === false } })}
            label="启用玩家视野"
          />
          {activeMap.bgUrl && (
            <Button size="sm" variant="secondary" icon="x" onClick={() => updateMap(activeMap.id, { bgUrl: '' })} title= "清除背景图片">
              清除
            </Button>
          )}
          <Button
            size="sm"
            variant="danger"
            icon="trash"
            title= "永久删除当前地图及其全部阻挡格与地形数据"
            onClick={() => {
              if (maps.length <= 1) {
                alert('必须要保留至少一张推演地图！');
                return;
              }
              if (window.confirm(`确定要永久删除地图 [${activeMap.name}] 吗？\n该操作会清空这张地图下的所有画网格与危险区数据，且不可撤销！`)) {
                deleteMap(activeMap.id);
                setShowMapConfig(false);
              }
            }}
          >
            删除当前地图
          </Button>
        </div>
      )}

      {/* Terrain editor */}
      {isTerrainEditMode && !isPlayerViewMode && (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-5)',
            background: 'var(--surface-sunken)',
            borderBottom: 'var(--border-hairline)'
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-2)' }}>
            <ToolbarLabel>工具</ToolbarLabel>
            <IconButton icon="wall" active={terrainEditTool === 'paint_block'} onClick={() => setTerrainEditTool('paint_block')} title= "绘制实体阻挡格" />
            <IconButton icon="eraser" active={terrainEditTool === 'paint_erase'} onClick={() => setTerrainEditTool('paint_erase')} title= "擦除实体阻挡格" />
            <IconButton icon="hand" active={terrainEditTool === 'pan'} onClick={() => setTerrainEditTool('pan')} title="地图漫游：拖动地图，不会移动任何构件" />
            <IconButton icon="arrows-out-cardinal" active={terrainEditTool === 'move'} onClick={() => setTerrainEditTool('move')} title="移动构件：仅在此模式下可拖动或缩放地图构件" />
            <IconButton
              icon="selection"
              active={terrainEditTool === 'box_select'}
              onClick={() => { setTerrainEditTool('box_select'); setSelectionBox(null); }}
              title= "框选区域模式（在地图上拖拽出选区，框内阻挡格可进行平移或消除）"
            />

            {terrainEditTool === 'box_select' && selectionBox && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-2) var(--space-3)',
                  background: 'var(--accent-soft)',
                  boxShadow: 'inset 0 0 0 1px var(--accent-line)'
                }}
              >
                <span style={{ fontSize: 'var(--type-meta)', color: 'var(--accent)' }}>已框选区域</span>
                <Button
                  size="sm"
                  variant="secondary"
                  icon="eye"
                  title="永久揭示框选区域内的地形；其中的角色和物品仍只在当前视野内显示"
                  onClick={() => {
                    const vision = normalizeMapVision(activeMap);
                    const exploredCells = revealRectCells(vision.exploredCells, selectionBox, mapWidth, mapHeight);
                    const selectionCells = new Set(Object.keys(revealRectCells({}, selectionBox, mapWidth, mapHeight)));
                    updateMap(activeMap.id, {
                      vision: {
                        ...vision,
                        exploredCells,
                        exploredTerrainStates: updateExploredTerrainStates(vision.exploredTerrainStates, terrainAreas, selectionCells)
                      }
                    });
                    addLog?.({ type: 'SYSTEM', visibility: 'private', content: `DM 已揭示地图 **${activeMap.name}** 的一个框选房间区域。`, timestamp: new Date().toLocaleTimeString() });
                    setSelectionBox(null);
                  }}
                >
                  揭示框内地形
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon="trash"
                  title= "删除框选区域内的所有实体阻挡格"
                  onClick={() => {
                    pushToHistory();
                    setBlockedCells(prev => {
                      const next = { ...prev };
                      const minX = Math.min(selectionBox.startX, selectionBox.endX);
                      const maxX = Math.max(selectionBox.startX, selectionBox.endX);
                      const minY = Math.min(selectionBox.startY, selectionBox.endY);
                      const maxY = Math.max(selectionBox.startY, selectionBox.endY);
                      Object.keys(next).forEach(key => {
                        const [xs, ys] = key.split('_');
                        const x = parseInt(xs, 10);
                        const y = parseInt(ys, 10);
                        if (x >= minX && x <= maxX && y >= minY && y <= maxY) delete next[key];
                      });
                      return next;
                    });
                    setSelectionBox(null);
                  }}
                >
                  消除框内阻挡
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setSelectionBox(null)} title= "取消当前框选">取消框选</Button>
              </div>
            )}

            <ToolbarDivider />
            <ToolbarLabel>区域</ToolbarLabel>
            <IconButton icon="square" onClick={handleAddRectArea} title="新建矩形地形" />
            <IconButton icon="circle" onClick={handleAddCircleArea} title="新建圆形地形" />
            <Checkbox
              checked={defaultImpassable}
              onChange={() => setDefaultImpassable(!defaultImpassable)}
              label="新区域阻挡"
            />

            <ToolbarDivider />
            <ToolbarLabel><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><DmforgeIcon name="component-library" size={15} />构件</span></ToolbarLabel>
            <Select
              size="sm"
              fullWidth={false}
              value={featurePreset}
              onChange={(event) => setFeaturePreset(event.target.value)}
              options={TERRAIN_FEATURE_OPTIONS}
              style={{ width: 170 }}
            />
            <Button size="sm" variant="secondary" icon="plus" onClick={() => handleAddFeature()} title="按当前预设创建地图构件">
              添加
            </Button>
            <IconButton icon="wall" onClick={() => handleAddFeature('wall')} title="快速添加完整墙体" />

            <ToolbarDivider />
            <Select
              size="sm"
              fullWidth={false}
              value={editingAreaId || ''}
              onChange={(event) => setEditingAreaId(event.target.value || null)}
              options={[
                { value: '', label: `选择对象（${terrainAreas.length}）` },
                ...terrainAreas.map(area => {
                  const name = area.name?.trim() || '未命名对象';
                  const position = `X${area.gridX ?? 0} Y${area.gridY ?? 0}`;
                  return {
                    value: area.id,
                    label: terrainNameCounts.get(name) > 1 ? `${name} · ${position}` : name
                  };
                })
              ]}
              style={{ width: 190 }}
            />

            <span style={{ flex: 1 }} />
            <IconButton
              icon="arrow-u-up-left"
              disabled={!canUndo}
              onClick={handleUndo}
              title={canUndo ? '撤销上一步地形或阻挡绘制' : '暂无可以撤销的操作'}
            />
          </div>

          {editingArea && (
            <div style={{
              position: 'fixed',
              top: `${Math.max(12, (viewportRef.current?.getBoundingClientRect().top || 132) + 12)}px`,
              right: `${Math.max(12, (globalThis.innerWidth || 1280) - (viewportRef.current?.getBoundingClientRect().right || (globalThis.innerWidth || 1280)) + 12)}px`,
              width: 340,
              maxHeight: `${Math.max(280, (viewportRef.current?.getBoundingClientRect().height || 620) - 24)}px`,
              zIndex: 650,
              overflow: 'hidden',
              background: 'var(--surface-overlay)',
              boxShadow: 'inset 0 0 0 1px var(--line-strong), var(--shadow-float)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 34, padding: '0 var(--space-3)', borderBottom: 'var(--border-hairline)' }}>
                <ToolbarLabel>对象检查器</ToolbarLabel>
                <IconButton icon="x" size="sm" onClick={() => setEditingAreaId(null)} title="关闭对象检查器" />
              </div>
              <div style={{ maxHeight: `${Math.max(240, (viewportRef.current?.getBoundingClientRect().height || 620) - 58)}px`, overflowY: 'auto', padding: 'var(--space-2)' }}>
                {[editingArea].map(area => {
                  const color = getAreaColor(area);
                  const isEditing = editingAreaId === area.id;

                  return (
                    <div
                      key={area.id}
                      onClick={() => setEditingAreaId(area.id)}
                      style={{
                        minWidth: 0,
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-2)',
                        padding: 'var(--space-3)',
                        cursor: 'default',
                        background: 'var(--surface-raised)',
                        boxShadow: `inset 2px 0 0 ${color.value}, inset 0 0 0 1px ${isEditing ? 'var(--line-strong)' : 'var(--line-hairline)'}`,
                        transition: 'var(--motion-control)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <TextInput
                          size="sm"
                          value={area.name}
                          onChange={(e) => handleUpdateArea(area.id, { name: e.target.value })}
                          placeholder= "地形名称"
                        />
                        <IconButton
                          icon={area.isSecret ? 'eye-closed' : 'eye'}
                          size="sm"
                          active={area.isSecret}
                          onClick={(e) => { e.stopPropagation(); handleUpdateArea(area.id, { isSecret: !area.isSecret, discoveredByParty: area.isSecret ? area.discoveredByParty : false }); }}
                          title={area.isSecret ? '玩家不可见 (隐秘陷阱)' : '玩家可见'}
                        />
                        <IconButton icon="copy" size="sm" onClick={(e) => { e.stopPropagation(); handleDuplicateArea(area); }} title= "快速复制此地形区域" />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }} onClick={(event) => event.stopPropagation()}>
                        <Button size="sm" variant={terrainEditTool === 'move' ? 'primary' : 'secondary'} icon="arrows-out-cardinal" onClick={() => setTerrainEditTool('move')} title="进入构件移动模式">移动</Button>
                        {area.featureType === 'door' && (
                          <Button size="sm" variant="secondary" onClick={() => handleQuickPatchArea(area, current => toggleDoorState(current))}>
                            {area.featureState === 'open' ? '关门' : '开门'}
                          </Button>
                        )}
                        {area.isSecret && area.discoveredByParty !== true && (
                          <Button size="sm" variant="secondary" icon="eye" onClick={() => handleQuickRevealArea(area)}>揭示</Button>
                        )}
                        {area.destructible && terrainIsDestroyed(area) && (
                          <Button size="sm" variant="secondary" onClick={() => handleQuickRepairArea(area)}>修复</Button>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }} onClick={(event) => event.stopPropagation()}>
                        <Select
                          size="sm"
                          label="形状"
                          value={area.type}
                          disabled={area.placement === 'edge'}
                          onChange={(event) => handleUpdateArea(area.id, changeTerrainShape(area, event.target.value))}
                          options={[{ value: 'rect', label: '矩形' }, { value: 'circle', label: '圆形' }]}
                        />
                        {area.placement === 'edge' && (
                          <Select
                            size="sm"
                            label="格线方向"
                            value={area.orientation || 'horizontal'}
                            onChange={(event) => {
                              const orientation = event.target.value;
                              const length = Number(area.length || area.width || area.height || 1);
                              const thickness = Number(area.thickness || 0.15);
                              handleUpdateArea(area.id, {
                                orientation,
                                width: orientation === 'vertical' ? thickness : length,
                                height: orientation === 'vertical' ? length : thickness,
                                ...(orientation === 'free' ? { endX: Number(area.endX ?? area.gridX + length), endY: Number(area.endY ?? area.gridY) } : {})
                              });
                            }}
                            options={[{ value: 'horizontal', label: '水平' }, { value: 'vertical', label: '垂直' }, { value: 'free', label: '自由斜线' }]}
                          />
                        )}
                        {area.featureType && <Badge tone="neutral">{TERRAIN_FEATURE_OPTIONS.find(option => option.value === area.featureType)?.label || '自定义构件'}</Badge>}
                        {area.featureType === 'door' && (
                          <Select
                            size="sm"
                            label="门状态"
                            value={area.featureState || 'closed'}
                            options={DOOR_STATE_OPTIONS}
                            onChange={(event) => handleUpdateArea(area.id, setDoorState(area, event.target.value))}
                          />
                        )}
                        {area.availableStates?.length > 0 && (
                          <Select
                            size="sm"
                            label="外观状态"
                            value={area.visualState || area.availableStates[0]}
                            options={terrainFeatureStateOptions(area)}
                            onChange={(event) => handleUpdateArea(area.id, { visualState: event.target.value })}
                          />
                        )}
                      </div>

                      <ToolbarLabel>位置与尺寸</ToolbarLabel>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(72px, 1fr))', gap: 'var(--space-2)' }}>
                        <TextInput size="sm" mono type="number" label= "X(ft)" value={area.gridX} onChange={(e) => handleUpdateArea(area.id, { gridX: Math.max(0, parseInt(e.target.value, 10) || 0) })} />
                        <TextInput size="sm" mono type="number" label= "Y(ft)" value={area.gridY} onChange={(e) => handleUpdateArea(area.id, { gridY: Math.max(0, parseInt(e.target.value, 10) || 0) })} />
                        {area.placement === 'edge' && area.orientation === 'free' ? (
                          <>
                            <TextInput size="sm" mono type="number" label="终点 X" value={area.endX ?? area.gridX + 1} onChange={(e) => handleUpdateArea(area.id, { endX: Math.max(0, Number(e.target.value) || 0) })} />
                            <TextInput size="sm" mono type="number" label="终点 Y" value={area.endY ?? area.gridY} onChange={(e) => handleUpdateArea(area.id, { endY: Math.max(0, Number(e.target.value) || 0) })} />
                          </>
                        ) : area.placement === 'edge' ? (
                          <TextInput size="sm" mono type="number" label="长度" value={area.length || area.width || 1} onChange={(e) => {
                            const length = Math.max(1, Number(e.target.value) || 1);
                            handleUpdateArea(area.id, { length, width: area.orientation === 'vertical' ? Number(area.thickness || 0.15) : length, height: area.orientation === 'vertical' ? length : Number(area.thickness || 0.15) });
                          }} />
                        ) : area.type === 'rect' ? (
                          <>
                            <TextInput size="sm" mono type="number" label= "宽" value={area.width} onChange={(e) => handleUpdateArea(area.id, { width: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
                            <TextInput size="sm" mono type="number" label= "高" value={area.height} onChange={(e) => handleUpdateArea(area.id, { height: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
                          </>
                        ) : (
                          <TextInput size="sm" mono type="number" label= "半径" value={area.radius} onChange={(e) => handleUpdateArea(area.id, { radius: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
                        )}
                      </div>

                      <details className="terrain-rule-details" onClick={(event) => event.stopPropagation()}>
                        <summary>移动、视野与掩体 <span>{terrainMovementMode(area) === 'blocked' ? '阻挡' : '可通行'} · {terrainVisionMode(area) === 'blocked' ? '遮挡' : '可见'}</span></summary>
                        <div className="terrain-rule-grid">
                          <Select size="sm" label="地形穿越" value={terrainMovementMode(area)} options={TERRAIN_MOVEMENT_OPTIONS} onChange={(event) => handleUpdateArea(area.id, { movementMode: event.target.value, isImpassable: event.target.value === 'blocked' })} />
                          <Select size="sm" label="视野穿越" value={terrainVisionMode(area)} options={TERRAIN_VISION_OPTIONS} onChange={(event) => handleUpdateArea(area.id, { visionMode: event.target.value, blocksVision: event.target.value === 'blocked' })} />
                          <Select size="sm" label="掩体等级" value={terrainCoverLevel(area)} options={TERRAIN_COVER_OPTIONS} onChange={(event) => handleUpdateArea(area.id, { coverLevel: event.target.value })} />
                          <TextInput size="sm" mono type="number" label="离地高度(ft)" value={area.baseHeight || 0} onChange={(event) => handleUpdateArea(area.id, { baseHeight: Math.max(0, Number(event.target.value) || 0) })} />
                          <TextInput size="sm" mono type="number" label="构件高度(ft)" value={area.obstacleHeight ?? 10} onChange={(event) => handleUpdateArea(area.id, { obstacleHeight: Math.max(0, Number(event.target.value) || 0) })} />
                          {terrainVisionMode(area) === 'oneWay' && <TextInput size="sm" mono type="number" label="阻挡方向(°)" value={area.visionDirection || 0} onChange={(event) => handleUpdateArea(area.id, { visionDirection: Number(event.target.value) || 0 })} />}
                          {area.featureState === 'ajar' && <TextInput size="sm" mono type="number" label="门缝视角(°)" value={area.apertureAngle || 70} onChange={(event) => handleUpdateArea(area.id, { apertureAngle: Math.max(5, Math.min(175, Number(event.target.value) || 70)) })} />}
                        </div>
                        <div className="terrain-rule-checks">
                          <Checkbox checked={area.transmitsLight === true} onChange={() => handleUpdateArea(area.id, { transmitsLight: area.transmitsLight !== true })} label="光照可穿越" />
                          <Checkbox checked={area.transmitsAttacks === true} onChange={() => handleUpdateArea(area.id, { transmitsAttacks: area.transmitsAttacks !== true })} label="远程攻击可穿越" />
                        </div>
                      </details>

                      {(area.isSecret || terrainHazard(area) !== 'none' || terrainTriggerDetails(area)) && (
                        <details className="terrain-rule-details" onClick={(event) => event.stopPropagation()}>
                          <summary>陷阱与触发效果 <span>{terrainTriggerDetails(area) ? '已标注' : '待填写'}</span></summary>
                          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                            <TextInput size="sm" label="触发条件" value={area.trapTrigger || ''} placeholder="例如：单位首次进入区域" onChange={(event) => handleUpdateArea(area.id, { trapTrigger: event.target.value })} />
                            <TextInput size="sm" label="判定方式" value={area.trapCheck || ''} placeholder="例如：敏捷豁免 DC 13" onChange={(event) => handleUpdateArea(area.id, { trapCheck: event.target.value })} />
                            <TextInput size="sm" multiline rows={3} label="触发效果" value={area.trapEffect || ''} placeholder="伤害、状态、位移或警报效果" onChange={(event) => handleUpdateArea(area.id, { trapEffect: event.target.value })} />
                            <TextInput size="sm" label="持续时间" value={area.trapDuration || ''} placeholder="例如：直到下一回合结束" onChange={(event) => handleUpdateArea(area.id, { trapDuration: event.target.value })} />
                            <TextInput size="sm" label="解除方式" value={area.trapDisarm || ''} placeholder="例如：技术检定或破坏控制盒" onChange={(event) => handleUpdateArea(area.id, { trapDisarm: event.target.value })} />
                          </div>
                        </details>
                      )}

                      <details className="terrain-rule-details" onClick={(event) => event.stopPropagation()}>
                        <summary>耐久与高级设置 <span>{area.destructible ? `${area.currentHp ?? area.maxHp ?? 1}/${area.maxHp ?? 1}` : '不可破坏'}</span></summary>
                        <Checkbox checked={area.destructible === true} onChange={() => handleUpdateArea(area.id, { destructible: area.destructible !== true })} label="可破坏构件" />
                        {area.isSecret && <Checkbox checked={area.discoveredByParty === true} onChange={() => handleUpdateArea(area.id, { discoveredByParty: area.discoveredByParty !== true })} label="玩家已发现此秘密构件" />}
                        {area.destructible && (
                          <>
                            <div className="terrain-rule-grid terrain-rule-grid--two">
                              <TextInput size="sm" mono type="number" label="当前耐久" value={area.currentHp ?? area.maxHp ?? 1} onChange={(event) => handleUpdateArea(area.id, { currentHp: Math.max(0, Number(event.target.value) || 0) })} />
                              <TextInput size="sm" mono type="number" label="最大耐久" value={area.maxHp ?? 1} onChange={(event) => handleUpdateArea(area.id, { maxHp: Math.max(1, Number(event.target.value) || 1) })} />
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                              {!terrainIsDestroyed(area) ? (
                                <>
                                  <Button size="sm" variant="secondary" onClick={() => handleQuickPatchArea(area, current => ({ ...current, currentHp: Math.max(0, Number(current.currentHp ?? current.maxHp ?? 1) - 5) }))}>耐久 -5</Button>
                                  <Button size="sm" variant="secondary" onClick={() => handleQuickDestroyArea(area)}>破坏</Button>
                                </>
                              ) : <Button size="sm" variant="secondary" onClick={() => handleQuickRepairArea(area)}>修复</Button>}
                            </div>
                          </>
                        )}
                      </details>

                      <details className="terrain-rule-details" onClick={(event) => event.stopPropagation()}>
                        <summary>外观与灾害 <span>{TERRAIN_HAZARDS.find(option => option.value === terrainHazard(area))?.label || '无'}</span></summary>
                        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                          <Select
                            size="sm"
                            label="灾害级"
                            value={terrainHazard(area)}
                            onChange={(event) => handleUpdateArea(area.id, { hazardLevel: event.target.value })}
                            options={TERRAIN_HAZARDS}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>颜色</span>
                            {Object.keys(colorConfig).map(c => (
                              <button key={c} type="button" onClick={() => handleUpdateArea(area.id, { color: c })} title={colorConfig[c].label} aria-label={colorConfig[c].label} style={{ width: 18, height: 18, padding: 0, background: colorConfig[c].value, border: area.color === c ? '2px solid var(--text-body)' : '1px solid var(--line-hairline)', cursor: 'pointer' }} />
                            ))}
                            <input type="color" aria-label="自定义地形颜色" value={safeTerrainColor(area)} onChange={(event) => handleUpdateArea(area.id, { color: 'custom', customColor: event.target.value })} style={{ width: 32, height: 22, padding: 0, border: '1px solid var(--line-hairline)', background: 'transparent', cursor: 'pointer' }} />
                          </div>
                        </div>
                      </details>

                      <div style={{ display: 'grid', gap: 'var(--space-2)', marginTop: 'var(--space-2)', paddingTop: 'var(--space-3)', borderTop: 'var(--border-hairline)' }} onClick={(event) => event.stopPropagation()}>
                        <Button size="sm" variant="danger" icon="trash" onClick={() => handleDeleteArea(area.id)}>删除当前对象</Button>
                        <details className="terrain-rule-details">
                          <summary>地图级操作 <span>谨慎</span></summary>
                          <Button size="sm" variant="danger" icon="broom" fullWidth onClick={handleClearAllTerrains}>清空全部地形</Button>
                        </details>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Initiative rail */}
      {isInCombat && !compactPresentation && (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--surface-panel)',
            borderBottom: 'var(--border-hairline)',
            zIndex: 100
          }}
        >
          <div style={{ height: 76, minHeight: 76, display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-3) var(--space-5)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 70, height: 52, paddingRight: 'var(--space-4)', borderRight: 'var(--border-hairline)' }}>
              <span style={{ fontFamily: 'var(--font-label)', fontSize: 'var(--type-micro)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--accent)' }}>Round</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-numeral-xl)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-body)', lineHeight: 1 }}>
                {String(combatRound).padStart(2, '0')}
              </span>
            </div>

            <div className="no-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, minWidth: 0, overflowX: 'auto' }}>
              {combatTurnOrder.map((participant, index) => {
                const char = characters.find(c => c.id === participant.id);
                if (!char) return null;
                const isActive = index === currentTurnIndex;

                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => { setSelectedTokenId(char.id); onCharacterSelect?.(char.id); }}
                    title={`选中 ${compactCharacterName(char.name)}`}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      height: 52,
                      minWidth: 150,
                      flexShrink: 0,
                      padding: 'var(--space-2) var(--space-3)',
                      cursor: 'pointer',
                      border: 'none',
                      textAlign: 'left',
                      background: isActive ? 'var(--accent-soft)' : 'var(--surface-raised)',
                      boxShadow: `inset 0 0 0 1px ${isActive ? 'var(--accent-line)' : 'var(--line-hairline)'}`,
                      transition: 'var(--motion-control)'
                    }}
                  >
                    <MapToken kind={char.type === 'PC' ? 'PC' : 'MONSTER'} name={compactCharacterName(char.name)} image={characterAvatar(char)} size={32} active={isActive} />
                    <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)', fontSize: 'var(--type-body-sm)', color: 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {compactCharacterName(char.name)}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>
                        先攻 {participant.total} · 顺位 {index + 1}
                      </span>
                    </span>
                    {isActive && (
                      <span style={{ position: 'absolute', top: -8, right: 6, padding: '1px 5px', background: 'var(--accent)', color: 'var(--text-on-accent)', fontFamily: 'var(--font-label)', fontSize: 'var(--type-micro)', letterSpacing: 'var(--tracking-label)' }}>
                        行动中
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active-unit dashboard */}
          {combatTurnOrder[currentTurnIndex] && (() => {
            const activeParticipant = combatTurnOrder[currentTurnIndex];
            const activeChar = characters.find(c => c.id === activeParticipant.id);
            if (!activeChar) return null;
            const speedMax = activeChar.speed || 30;
            const speedLeft = Math.round(activeChar.combatSpeedRemaining ?? activeChar.speed ?? 30);

            return (
              <div
                className="no-scrollbar"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'stretch',
                  gap: 'var(--space-4)',
                  width: '100%',
                  minHeight: 118,
                  maxHeight: 252,
                  boxSizing: 'border-box',
                  padding: 'var(--space-3) var(--space-5)',
                  borderTop: 'var(--border-hairline)',
                  overflowY: 'auto'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flex: '1 1 200px', minWidth: 180, paddingRight: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <strong style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--type-body-sm)', color: 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {compactCharacterName(activeChar.name)}
                    </strong>
                    <Badge tone="accent" size="sm">当前行动</Badge>
                  </div>
                  <StatPill label= "生命值" value={`${activeChar.hp}/${activeChar.maxHp}`} size="sm" tone="madder" />
                  <StatPill label= "护甲等级" code="AC" value={activeChar.ac ?? 10} size="sm" tone="woad" />
                  <Meter label= "移动力" value={speedLeft} max={speedMax} tone="verdigris" segments={10} height={6} showNumbers={false} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)', alignSelf: 'flex-end' }}>
                    {speedLeft}/{speedMax}ft
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flex: '1 1 160px', minWidth: 150, maxWidth: 260, paddingLeft: 'var(--space-4)', borderLeft: 'var(--border-hairline)' }}>
                  <ToolbarLabel>状态效果</ToolbarLabel>
                  <div className="no-scrollbar" style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', overflowY: 'auto', maxHeight: 44 }}>
                    {activeChar.conditions && activeChar.conditions.length > 0 ? (
                      activeChar.conditions.map(cond => (
                        <Badge key={cond.id} tone="ochre" variant="soft" size="sm" onRemove={() => handleRemoveCondition(activeChar.id, cond.id)}>
                          {cond.name}（{cond.duration ==='permanent'?'':`${cond.duration}r`}）
                        </Badge>
                      ))
                    ) : (
                      <span style={{ fontSize: 'var(--type-micro)', color: 'var(--pigment-verdigris)', fontStyle: 'italic' }}>状态正常</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="plus"
                    title= "为当前行动角色附加一个状态，并指定持续回合数"
                    onClick={() => {
                      const name = prompt('输入要添加的状态名称（如：眩晕、祝福、中毒）：', '眩晕');
                      if (!name?.trim()) return;
                      const rounds = prompt(`请输入 [${name.trim()}] 持续回合数（数字，或 permanent 为永久）：`, '3');
                      if (rounds !== null) handleAddCondition(activeChar.id, name.trim(), rounds);
                    }}
                  >
                    添加状态
                  </Button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flex: '3 1 480px', minWidth: 300, paddingLeft: 'var(--space-4)', borderLeft: 'var(--border-hairline)' }}>
                  <ToolbarLabel>动作、法术与角色资源</ToolbarLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 'var(--space-2)', width: '100%', alignItems: 'start' }}>
                    {activeChar.resources && activeChar.resources.length > 0 ? (
                      activeChar.resources.map((res, resIdx) => (
                        <span key={`${res.name}-${resIdx}`} style={{ minWidth: 0 }}>
                          <ResourceSlot
                            name={res.name}
                            value={res.value}
                            max={res.max}
                            resetType={res.resetType === 'short_rest' ? 'short' : res.resetType === 'long_rest' ? 'long' : 'turn'}
                            onSpend={() => setCharacters(prev => prev.map(c => {
                              if (c.id !== activeChar.id) return c;
                              const updated = [...c.resources];
                              updated[resIdx] = { ...res, value: Math.max(0, res.value - 1) };
                              return { ...c, resources: updated };
                            }))}
                            onRestore={() => setCharacters(prev => prev.map(c => {
                              if (c.id !== activeChar.id) return c;
                              const updated = [...c.resources];
                              updated[resIdx] = { ...res, value: Math.min(res.max, res.value + 1) };
                              return { ...c, resources: updated };
                            }))}
                          />
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: 'var(--type-micro)', color: 'var(--text-faint)', fontStyle: 'italic' }}>无资源槽</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--space-2)', flex: '0 1 130px', minWidth: 118, paddingLeft: 'var(--space-4)', borderLeft: 'var(--border-hairline)' }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="arrow-u-up-left"
                    onClick={() => handleResetTurnMovement(activeChar.id)}
                    title= "撤销当前回合的棋子移动，返回本回合行动起点，并完全复原移动力"
                  >
                    重置该回合
                  </Button>
                  <Button size="sm" icon="skip-forward" onClick={handleNextTurn} title= "结束该角色当前回合，移交行动权给下一位角色">
                    结束回合
                  </Button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Map Content Box */}
      <div 
        ref={viewportRef}
        style={{ flex: 1, minHeight: 0, position: 'relative', background: 'var(--surface-sunken)', display: 'flex', overflow: 'hidden' }}
        onDragOver={handleDragOver}
        onDragLeave={handleViewportDragLeave}
        onDrop={handleDrop}
      >
        {/* Ambient Atmosphere Background Image (DMForge Sleek Morandi Ambient Overlay) */}
        {mapBgUrl && !isVisionLimitedView && !isVisionBlackout && (
          <div 
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: `url(${mapBgUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.18,
              zIndex: 0,
              pointerEvents: 'none'
            }}
          />
        )}

        <TransformWrapper
          ref={transformRef}
          onInit={handleTransform}
          initialScale={1}
          initialPositionX={0}
          initialPositionY={0}
          minScale={0.25}
          maxScale={4}
          onTransformed={handleTransform}
          onZoom={handleTransform}
          panning={{ disabled: isDrawingMode || isVisionControlMode && visionSelectionTool !== 'pan' || isTerrainEditMode && terrainEditTool !== 'pan' }}
          wheel={{ step: 0.05 }}
          smooth={false}
          limitToBounds={false}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Map Floating Zoom Controls */}
              <div style={{
                position: 'absolute',
                top: '16px',
                right: isTerrainEditMode && editingArea ? '368px' : '16px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <IconButton icon="magnifying-glass-plus" onClick={() => zoomIn()} title= "放大地图" style={{ background: 'var(--surface-overlay)', boxShadow: 'inset 0 0 0 1px var(--bracket-line)' }} />
                <IconButton icon="magnifying-glass-minus" onClick={() => zoomOut()} title= "缩小地图" style={{ background: 'var(--surface-overlay)', boxShadow: 'inset 0 0 0 1px var(--bracket-line)' }} />
                <IconButton icon="arrow-counter-clockwise" onClick={() => resetTransform()} title= "复位缩放与镜头位置" style={{ background: 'var(--surface-overlay)', boxShadow: 'inset 0 0 0 1px var(--bracket-line)' }} />
              </div>

              <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                <div 
                  ref={containerRef}
                  onMouseDown={handleMapMouseDown}
                  onMouseMove={handleMapMouseMove}
                  onMouseUp={handleMapMouseUp}
                  onMouseLeave={handleMapMouseLeave}
                  onClick={handleMapClick}
                  style={{
                    width: `${mapWidth * gridSize}px`,
                    height: `${mapHeight * gridSize}px`,
                    position: 'relative',
                    backgroundColor: 'var(--surface-sunken)',
                    backgroundImage: mapBgUrl
                      ? `linear-gradient(rgba(5, 7, 12, 0.32), rgba(5, 7, 12, 0.32)), url("${mapBgUrl.replaceAll('"', '%22')}")`
                      : undefined,
                    backgroundSize: mapBgUrl ? `${mapBgScaleX}% ${mapBgScaleY}%, ${mapBgScaleX}% ${mapBgScaleY}%` : undefined,
                    backgroundPosition: mapBgUrl ? `${mapBgPositionX}% ${mapBgPositionY}%, ${mapBgPositionX}% ${mapBgPositionY}%` : undefined,
                    backgroundRepeat: 'no-repeat',
                    border: mapBgUrl ? '1px solid var(--line-hairline)' : 'none',
                    boxShadow: 'inset 0 0 0 1px var(--line-hairline)',
                    cursor: isVisionControlMode ? (visionSelectionTool === 'pan' ? 'grab' : 'crosshair') : isDrawingMode ? (drawingTool === 'eraser' ? 'cell' : 'crosshair') :
                            isTerrainEditMode && terrainEditTool === 'paint_block' ? 'cell' :
                            isTerrainEditMode && terrainEditTool === 'paint_erase' ? 'no-drop' : 'default'
                  }}
                >
                  {/* Grid Lines Overlay representing 1ft per cell */}
                  <div 
                    style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      pointerEvents: 'none',
                      backgroundSize: `${gridSize}px ${gridSize}px`,
                      backgroundImage: `
                        linear-gradient(to right, var(--grid-line) 1px, transparent 1px),
                        linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)
                      `
                    }}
                  />

                  {/* Coordinate rulers — the map reads as a survey plate, so the
                      gutters carry XNN / YNN keys every four feet. */}
                  {Array.from({ length: Math.floor(mapHeight / 4) + 1 }, (_, i) => i * 4).map(n => (
                    <span
                      key={`ruler-y-${n}`}
                      aria-hidden="true"
                      style={{
                        position: 'absolute', left: 4, top: n * gridSize + 3, zIndex: 2, pointerEvents: 'none',
                        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.1em', color: 'var(--text-faint)'
                      }}
                    >
                      {`Y${String(n).padStart(2, '0')}`}
                    </span>
                  ))}
                  {Array.from({ length: Math.floor(mapWidth / 4) + 1 }, (_, i) => i * 4).map(n => (
                    <span
                      key={`ruler-x-${n}`}
                      aria-hidden="true"
                      style={{
                        position: 'absolute', left: n * gridSize + 4, bottom: 3, zIndex: 2, pointerEvents: 'none',
                        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.1em', color: 'var(--text-faint)'
                      }}
                    >
                      {`X${String(n).padStart(2, '0')}`}
                    </span>
                  ))}

                  {isVisionControlMode && visionSelectionTool !== 'pan' && <div
                    aria-label="框选玩家与直播视野范围"
                    onMouseDown={event => { event.stopPropagation(); handleMapMouseDown(event); }}
                    onMouseMove={event => { event.stopPropagation(); handleMapMouseMove(event); }}
                    onMouseUp={event => { event.stopPropagation(); handleMapMouseUp(); }}
                    onMouseLeave={event => { event.stopPropagation(); handleMapMouseLeave(); }}
                    style={{ position: 'absolute', inset: 0, zIndex: 59, cursor: 'crosshair' }}
                  />}

                  {/* 1px crosshair through the acting token. */}
                  {(() => {
                    const crossId = isInCombat ? combatTurnOrder[currentTurnIndex]?.id : selectedTokenId;
                    const crossChar = crossId ? activeTokens.find(c => c.id === crossId) : null;
                    if (!crossChar) return null;
                    return (
                      <>
                        <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: ((crossChar.gridY || 0) + 0.5) * gridSize, height: 1, background: 'var(--accent-line)', zIndex: 2, pointerEvents: 'none' }} />
                        <span aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: ((crossChar.gridX || 0) + 0.5) * gridSize, width: 1, background: 'var(--accent-line)', zIndex: 2, pointerEvents: 'none' }} />
                      </>
                    );
                  })()}

                  {/* Render Impassable Blocked Cells on Canvas for 60fps performance */}
                  <canvas
                    ref={blockedCanvasRef}
                    width={mapWidth * gridSize}
                    height={mapHeight * gridSize}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      pointerEvents: 'none',
                      zIndex: 1
                    }}
                  />

                  {isVisionControlMode && selectionBox && <VisionSelectionOverlay
                    selection={selectionBox}
                    gridSize={gridSize}
                    cellCount={visionSelectionCells(selectionBox, mapWidth, mapHeight).size}
                  />}

                  {/* Render terrain selection box and real-time drag translation preview */}
                  {selectionBox && !isVisionControlMode && (
                    (() => {
                      const minX = Math.min(selectionBox.startX, selectionBox.endX);
                      const maxX = Math.max(selectionBox.startX, selectionBox.endX);
                      const minY = Math.min(selectionBox.startY, selectionBox.endY);
                      const maxY = Math.max(selectionBox.startY, selectionBox.endY);
                      
                      const displayLeft = (minX + (isDraggingSelection ? dragOffset.x : 0)) * gridSize;
                      const displayTop = (minY + (isDraggingSelection ? dragOffset.y : 0)) * gridSize;
                      const displayWidth = (maxX - minX + 1) * gridSize;
                      const displayHeight = (maxY - minY + 1) * gridSize;
                      
                      return (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${displayLeft}px`,
                            top: `${displayTop}px`,
                            width: `${displayWidth}px`,
                            height: `${displayHeight}px`,
                            border: `2px dashed ${isVisionControlMode ? 'var(--pigment-verdigris)' : 'var(--accent)'}`,
                            background: isVisionControlMode ? 'var(--pigment-verdigris-soft)' : 'rgba(168, 85, 247, 0.08)',
                            boxShadow: isVisionControlMode ? '0 0 12px var(--pigment-verdigris-line)' : '0 0 12px rgba(168, 85, 247, 0.4), inset 0 0 6px rgba(168, 85, 247, 0.2)',
                            pointerEvents: 'none',
                            zIndex: isVisionControlMode ? 60 : 3
                          }}
                        >
                          <div style={{
                            position: 'absolute',
                            top: '-20px',
                            left: 0,
                            background: 'rgba(20,20,25,0.85)',
                            border: '1px solid var(--line-hairline)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '10px',
                            color: isVisionControlMode ? 'var(--pigment-verdigris)' : 'var(--accent)',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                          }}>
                            <span>{isVisionControlMode ? '玩家与直播视野选区' : '按住框选区可拖动平移'}</span>
                          </div>
                        </div>
                      );
                    })()
                  )}

                  {/* Real-time dragging cells translation preview pattern */}
                  {isDraggingSelection && selectionBox && (
                    (() => {
                      const minX = Math.min(selectionBox.startX, selectionBox.endX);
                      const maxX = Math.max(selectionBox.startX, selectionBox.endX);
                      const minY = Math.min(selectionBox.startY, selectionBox.endY);
                      const maxY = Math.max(selectionBox.startY, selectionBox.endY);
                      
                      const previewCells = [];
                      Object.keys(blockedCells).forEach(key => {
                        const [xs, ys] = key.split('_');
                        const x = parseInt(xs, 10);
                        const y = parseInt(ys, 10);
                        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                          previewCells.push({ x, y });
                        }
                      });
                      
                      return previewCells.map((cell, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: 'absolute',
                            left: `${(cell.x + dragOffset.x) * gridSize}px`,
                            top: `${(cell.y + dragOffset.y) * gridSize}px`,
                            width: `${gridSize}px`,
                            height: `${gridSize}px`,
                            background: 'repeating-linear-gradient(45deg, var(--accent-soft) 0 4px, var(--pigment-madder-soft) 4px 8px)',
                            border: '1px solid var(--accent)',
                            boxShadow: 'none',
                            pointerEvents: 'none',
                            zIndex: 2
                          }}
                        />
                      ));
                    })()
                  )}

                  {/* Render Custom Vector Hazard Regions */}
                  {visibleTerrains.map(area => {
                    const color = getAreaColor(area);
                    const isEditing = editingAreaId === area.id;
                    const movementBlocked = terrainBlocksMovement(area);
                    const canQuickToggleDoor = area.featureType === 'door' && appRole !== 'PLAYER' && !isDrawingMode;

                    if (area.type === 'rect') {
                      const isEdge = area.placement === 'edge';
                      const length = Math.max(1, Number(area.length || area.width || 1));
                      const thicknessPx = Math.max(4, Number(area.thickness || 0.15) * gridSize);
                      const isFreeEdge = isEdge && area.orientation === 'free';
                      const freeDx = Number(area.endX ?? area.gridX + 1) - Number(area.gridX || 0);
                      const freeDy = Number(area.endY ?? area.gridY) - Number(area.gridY || 0);
                      const freeLengthPx = Math.max(gridSize, Math.hypot(freeDx, freeDy) * gridSize);
                      const freeAngle = Math.atan2(freeDy, freeDx) * 180 / Math.PI;
                      return (
                        <div
                          key={area.id}
                          onMouseDown={(e) => {
                            if (canQuickToggleDoor && !isTerrainEditMode) e.stopPropagation();
                            else handleTerrainDragStart(e, area);
                          }}
                          onMouseEnter={(event) => beginTerrainHint(event, area)}
                          onMouseMove={(event) => moveTerrainHint(event, area)}
                          onMouseLeave={endTerrainHint}
                          role={canQuickToggleDoor && !isTerrainEditMode ? 'button' : undefined}
                          tabIndex={canQuickToggleDoor && !isTerrainEditMode ? 0 : undefined}
                          aria-label={canQuickToggleDoor ? `${area.name}：${area.featureState === 'open' ? '点击关闭' : '点击开启'}` : undefined}
                          data-terrain-selected={isEditing || undefined}
                          style={{
                            position: 'absolute',
                            left: `${area.gridX * gridSize}px`,
                            top: `${area.gridY * gridSize}px`,
                            width: isFreeEdge ? `${freeLengthPx}px` : isEdge ? (area.orientation === 'vertical' ? `${thicknessPx}px` : `${length * gridSize}px`) : `${area.width * gridSize}px`,
                            height: isFreeEdge ? `${thicknessPx}px` : isEdge ? (area.orientation === 'vertical' ? `${length * gridSize}px` : `${thicknessPx}px`) : `${area.height * gridSize}px`,
                            transform: isFreeEdge
                              ? `translateY(${-thicknessPx / 2}px) rotate(${freeAngle}deg)`
                              : isEdge && area.orientation === 'vertical' ? `translateX(${-thicknessPx / 2}px)` : isEdge ? `translateY(${-thicknessPx / 2}px)` : undefined,
                            transformOrigin: isFreeEdge ? 'left center' : undefined,
                            background: movementBlocked
                              ? `repeating-linear-gradient(45deg, ${color.bg} 0 8px, var(--pigment-madder-soft) 8px 16px)`
                              : color.bg,
                            border: area.suppressOutline ? 'none' : `2px ${movementBlocked ? 'solid' : 'dashed'} ${movementBlocked ? 'var(--pigment-madder)' : color.value}`,
                            boxShadow: 'none',
                            borderRadius: 0,
                            pointerEvents: isTerrainEditMode || canQuickToggleDoor || area.featureType || terrainTriggerDetails(area) ? 'auto' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: isEditing ? 4 : 2,
                            cursor: canQuickToggleDoor && !isTerrainEditMode ? 'pointer' : isTerrainEditMode && terrainEditTool === 'move' ? 'grab' : 'default',
                            transition: 'border 0.2s, box-shadow 0.2s',
                            opacity: area.isSecret ? 0.75 : 1
                          }}
                          onClick={(e) => {
                            if (isTerrainEditMode) {
                              e.stopPropagation();
                              setEditingAreaId(area.id);
                            } else if (canQuickToggleDoor) {
                              e.stopPropagation();
                              handleQuickToggleDoor(area);
                            }
                          }}
                          onKeyDown={(event) => {
                            if (!canQuickToggleDoor || isTerrainEditMode || !['Enter', ' '].includes(event.key)) return;
                            event.preventDefault();
                            event.stopPropagation();
                            handleQuickToggleDoor(area);
                          }}
                        >
                          {isEditing && <TerrainSelectionFrame edge={isEdge} orientation={area.orientation} />}
                          <MapComponentArt assetKey={area.assetKey} state={area.visualState} selected={isEditing} />
                          {area.featureType && area.featureType !== 'wall' && !area.id?.startsWith('vr_cage_') && (!area.assetKey || isTerrainEditMode || area.featureType === 'door') && <span style={{
                            fontSize: '9px',
                            color: 'var(--text-body)',
                            background: 'var(--surface-overlay)',
                            padding: '2px 5px',
                            borderRadius: 0,
                            fontWeight: 'bold',
                            border: `1px solid ${movementBlocked ? 'var(--pigment-madder)' : color.value}`,
                            userSelect: 'none',
                            boxShadow: 'none'
                          }}>
                            {area.name} {area.featureType === 'door'
                              ? `（${DOOR_STATE_OPTIONS.find(option => option.value === area.featureState)?.label || '关闭'}）`
                              : ''}
                          </span>}

                          {/* Direct Resize Handle at bottom-right */}
                          {isTerrainEditMode && terrainEditTool === 'move' && isEditing && (
                            <div
                              className="terrain-resize-handle"
                              data-testid="terrain-resize-handle"
                              style={{
                                position: 'absolute',
                                right: '-5px',
                                bottom: '-5px',
                                width: '10px',
                                height: '10px',
                                background: TERRAIN_SELECTION_HANDLE,
                                border: '2px solid rgba(18, 14, 24, 0.95)',
                                borderRadius: 0,
                                cursor: 'se-resize',
                                zIndex: 10,
                                boxShadow: 'none'
                              }}
                              onMouseDown={(e) => isEdge ? handleEdgeResizeStart(e, area) : handleRectResizeStart(e, area)}
                              title={isEdge ? '拖拽改变格线构件长度' : '拖拽改变宽度和高度'}
                            />
                          )}
                        </div>
                      );
                    } else if (area.type === 'circle') {
                      return (
                        <div
                          key={area.id}
                          onMouseDown={(e) => {
                            if (canQuickToggleDoor && !isTerrainEditMode) e.stopPropagation();
                            else handleTerrainDragStart(e, area);
                          }}
                          onMouseEnter={(event) => beginTerrainHint(event, area)}
                          onMouseMove={(event) => moveTerrainHint(event, area)}
                          onMouseLeave={endTerrainHint}
                          role={canQuickToggleDoor && !isTerrainEditMode ? 'button' : undefined}
                          tabIndex={canQuickToggleDoor && !isTerrainEditMode ? 0 : undefined}
                          data-terrain-selected={isEditing || undefined}
                          style={{
                            position: 'absolute',
                            left: `${(area.gridX - area.radius) * gridSize}px`,
                            top: `${(area.gridY - area.radius) * gridSize}px`,
                            width: `${area.radius * 2 * gridSize}px`,
                            height: `${area.radius * 2 * gridSize}px`,
                            background: movementBlocked
                              ? `repeating-linear-gradient(45deg, ${color.bg} 0 8px, var(--pigment-madder-soft) 8px 16px)`
                              : color.bg,
                            border: `2px ${movementBlocked ? 'solid' : 'dashed'} ${movementBlocked ? 'var(--pigment-madder)' : color.value}`,
                            boxShadow: 'none',
                            borderRadius: '50%',
                            pointerEvents: isTerrainEditMode || canQuickToggleDoor || area.featureType || terrainTriggerDetails(area) ? 'auto' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: isEditing ? 4 : 2,
                            cursor: canQuickToggleDoor && !isTerrainEditMode ? 'pointer' : isTerrainEditMode && terrainEditTool === 'move' ? 'grab' : 'default',
                            transition: 'border 0.2s, box-shadow 0.2s',
                            opacity: area.isSecret ? 0.75 : 1
                          }}
                          onClick={(e) => {
                            if (isTerrainEditMode) {
                              e.stopPropagation();
                              setEditingAreaId(area.id);
                            } else if (canQuickToggleDoor) {
                              e.stopPropagation();
                              handleQuickToggleDoor(area);
                            }
                          }}
                          onKeyDown={(event) => {
                            if (!canQuickToggleDoor || isTerrainEditMode || !['Enter', ' '].includes(event.key)) return;
                            event.preventDefault();
                            event.stopPropagation();
                            handleQuickToggleDoor(area);
                          }}
                        >
                          {isEditing && <TerrainSelectionFrame round />}
                          <MapComponentArt assetKey={area.assetKey} state={area.visualState} fit="contain" selected={isEditing} />
                          {area.featureType && (!area.assetKey || isTerrainEditMode || area.featureType === 'door') && <span style={{
                            fontSize: '9px',
                            color: 'var(--text-body)',
                            background: 'var(--surface-overlay)',
                            padding: '2px 5px',
                            borderRadius: 0,
                            fontWeight: 'bold',
                            border: `1px solid ${movementBlocked ? 'var(--pigment-madder)' : color.value}`,
                            userSelect: 'none',
                            boxShadow: 'none'
                          }}>
                            {area.name} {area.featureType === 'door'
                              ? `（${DOOR_STATE_OPTIONS.find(option => option.value === area.featureState)?.label || '关闭'}）`
                              : ''}
                          </span>}

                          {/* Direct Radius Resize Handle at rightmost edge */}
                          {isTerrainEditMode && terrainEditTool === 'move' && isEditing && (
                            <div
                              className="terrain-resize-handle"
                              data-testid="terrain-resize-handle"
                              style={{
                                position: 'absolute',
                                right: '-5px',
                                top: 'calc(50% - 5px)',
                                width: '10px',
                                height: '10px',
                                background: TERRAIN_SELECTION_HANDLE,
                                border: '2px solid rgba(18, 14, 24, 0.95)',
                                borderRadius: '50%',
                                cursor: 'ew-resize',
                                zIndex: 10,
                                boxShadow: 'none'
                              }}
                              onMouseDown={(e) => handleCircleResizeStart(e, area)}
                              title= "拖拽改变圆半径"
                            />
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}

                  {/* Room names use independent world-space anchors so later fixtures cannot push or cover them. */}
                  {visibleTerrains.filter(area => !area.featureType && area.suppressLabel !== true).map(area => {
                    const color = getAreaColor(area);
                    const triggerDetails = terrainTriggerDetails(area);
                    const centerX = area.type === 'circle'
                      ? Number(area.gridX || 0)
                      : Number(area.gridX || 0) + Number(area.width || 1) / 2;
                    const centerY = area.type === 'circle'
                      ? Number(area.gridY || 0)
                      : Number(area.gridY || 0) + Number(area.height || 1) / 2;
                    return <span key={`terrain-label-${area.id}`} style={{
                      position: 'absolute',
                      left: `${Number(area.labelX ?? centerX) * gridSize}px`,
                      top: `${Number(area.labelY ?? centerY) * gridSize}px`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: 3,
                      maxWidth: `${Math.max(4, Number(area.labelMaxWidth || 18)) * gridSize}px`,
                      padding: '3px 6px',
                      borderRadius: 0,
                      border: `1px solid ${color.value}`,
                      background: 'rgba(10, 12, 20, 0.88)',
                      color: 'var(--text-body)',
                      boxShadow: 'none',
                      fontSize: '10px',
                      fontWeight: 700,
                      lineHeight: 1.25,
                      textAlign: 'center',
                      whiteSpace: 'normal',
                      pointerEvents: 'none',
                      userSelect: 'none'
                    }}>
                      {triggerDetails && <DmforgeIcon name="trap" size={12} style={{ marginRight: 4, color: 'var(--pigment-ochre)', verticalAlign: -2 }} />}
                      {area.name}
                    </span>;
                  })}

                  {/* Player fog-of-war updates only after a token drop is committed. */}
                  <canvas
                    ref={fogCanvasRef}
                    width={mapWidth * gridSize}
                    height={mapHeight * gridSize}
                    aria-label="玩家视野与战争迷雾"
                    style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: isVisionBlackout ? 50 : 4 }}
                  />

                  {/* Shared visual annotations sit above fog but never affect map rules. */}
                  <svg
                    data-testid="map-drawing-layer"
                    aria-label="地图绘图标注"
                    viewBox={`0 0 ${mapWidth * gridSize} ${mapHeight * gridSize}`}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}
                  >
                    {renderedDrawings.map(stroke => {
                      const points = Array.isArray(stroke.points) ? stroke.points : [];
                      const color = /^#[0-9a-f]{6}$/i.test(stroke.color || '') ? stroke.color : '#f6c453';
                      const width = Math.max(1, Math.min(24, Number(stroke.width || 4)));
                      if (points.length === 1) return <circle key={stroke.id} cx={points[0].x * gridSize} cy={points[0].y * gridSize} r={width / 2} fill={color} />;
                      return <polyline
                        key={stroke.id}
                        points={points.map(point => `${point.x * gridSize},${point.y * gridSize}`).join(' ')}
                        fill="none"
                        stroke={color}
                        strokeWidth={width}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />;
                    })}
                  </svg>

                  {/* Distance Measurement Line helper */}
                  {selectedTokenObj && hoveredTokenObj && selectedTokenObj.id !== hoveredTokenObj.id && (
                    <svg style={{
                      position: 'absolute',
                      top: 0, left: 0,
                      width: '100%', height: '100%',
                      pointerEvents: 'none',
                      zIndex: 5
                    }}>
                      <line 
                        x1={(selectedTokenObj.gridX || 0) * gridSize + gridSize/2}
                        y1={(selectedTokenObj.gridY || 0) * gridSize + gridSize/2}
                        x2={(hoveredTokenObj.gridX || 0) * gridSize + gridSize/2}
                        y2={(hoveredTokenObj.gridY || 0) * gridSize + gridSize/2}
                        stroke="var(--accent)"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                      <rect
                        x={((selectedTokenObj.gridX || 0) + (hoveredTokenObj.gridX || 0)) * gridSize / 2 + 8}
                        y={((selectedTokenObj.gridY || 0) + (hoveredTokenObj.gridY || 0)) * gridSize / 2 - 8}
                        width="60"
                        height="18"
                        rx="4"
                        fill="rgba(18, 20, 28, 0.95)"
                        stroke="var(--accent)"
                        strokeWidth="1"
                      />
                      <text
                        x={((selectedTokenObj.gridX || 0) + (hoveredTokenObj.gridX || 0)) * gridSize / 2 + 38}
                        y={((selectedTokenObj.gridY || 0) + (hoveredTokenObj.gridY || 0)) * gridSize / 2 + 5}
                        fill="var(--text-body)"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {calculateDistance(selectedTokenObj, hoveredTokenObj)} ft
                      </text>
                    </svg>
                  )}

                  {/* Real-time Token Drag Distance Measurement helper */}
                  {draggedToken && !draggedToken.isNewPlacement && dragHoverCoords && (draggedToken.startX !== dragHoverCoords.x || draggedToken.startY !== dragHoverCoords.y) && (
                    (() => {
                      const isForced = isForcedMoveMode || dragIsShiftPressed;
                      const pathColor = isForced ? 'var(--pigment-woad)' : (dragPathExists ? 'var(--accent)' : 'var(--pigment-madder)');
                      const pathBgColor = isForced ? 'rgba(34, 211, 238, 0.05)' : (dragPathExists ? 'rgba(168, 85, 247, 0.05)' : 'rgba(239, 68, 68, 0.05)');
                      const pathBgColorHover = isForced ? 'rgba(34, 211, 238, 0.1)' : (dragPathExists ? 'rgba(168, 85, 247, 0.1)' : 'rgba(239, 68, 68, 0.1)');
                      const pathDashedColor = isForced ? 'var(--pigment-woad)' : 'var(--accent)';

                      return (
                        <>
                          <svg style={{
                            position: 'absolute',
                            top: 0, left: 0,
                            width: '100%', height: '100%',
                            pointerEvents: 'none',
                            zIndex: 6
                          }}>
                            <defs>
                              <filter id="drag-glow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                              </filter>
                            </defs>
                            {dragPathExists ? (
                              <>
                                {/* Glowing A* path line underneath */}
                                <path 
                                  d={dragSvgPathD}
                                  fill="none"
                                  stroke={pathColor}
                                  strokeWidth="4"
                                  opacity={isForced ? "0.45" : "0.35"}
                                  filter="url(#drag-glow)"
                                />
                                {/* Crisp dashed A* path line on top */}
                                <path 
                                  d={dragSvgPathD}
                                  fill="none"
                                  stroke={pathDashedColor}
                                  strokeWidth="2"
                                  strokeDasharray="6 4"
                                />
                              </>
                            ) : (
                              <>
                                {/* Glowing Straight red line underneath indicating BLOCKED */}
                                <line 
                                  x1={draggedToken.startX * gridSize + gridSize/2}
                                  y1={draggedToken.startY * gridSize + gridSize/2}
                                  x2={dragHoverCoords.x * gridSize + gridSize/2}
                                  y2={dragHoverCoords.y * gridSize + gridSize/2}
                                  stroke="var(--pigment-madder)"
                                  strokeWidth="4"
                                  opacity="0.4"
                                  filter="url(#drag-glow)"
                                />
                                {/* Crisp dashed red line on top */}
                                <line 
                                  x1={draggedToken.startX * gridSize + gridSize/2}
                                  y1={draggedToken.startY * gridSize + gridSize/2}
                                  x2={dragHoverCoords.x * gridSize + gridSize/2}
                                  y2={dragHoverCoords.y * gridSize + gridSize/2}
                                  stroke="var(--pigment-madder)"
                                  strokeWidth="2"
                                  strokeDasharray="4 4"
                                />
                              </>
                            )}
                            
                            {/* Drag Start cell highlight border */}
                            <rect 
                              x={draggedToken.startX * gridSize}
                              y={draggedToken.startY * gridSize}
                              width={gridSize}
                              height={gridSize}
                              fill={pathBgColor}
                              stroke={pathColor}
                              strokeWidth="1.5"
                              strokeDasharray="3 3"
                              rx="2"
                            />

                            {/* Drag Hover target cell highlight border */}
                            <rect 
                              x={dragHoverCoords.x * gridSize}
                              y={dragHoverCoords.y * gridSize}
                              width={gridSize}
                              height={gridSize}
                              fill={pathBgColorHover}
                              stroke={pathColor}
                              strokeWidth="2"
                              rx="2"
                            />
                          </svg>

                          {/* Distance Bubble Tooltip */}
                          <div
                            style={{
                              position: 'absolute',
                              left: `${dragHoverCoords.x * gridSize + gridSize / 2}px`,
                              top: `${dragHoverCoords.y * gridSize - 8}px`,
                              transform: 'translate(-50%, -100%)',
                              background: 'rgba(15, 11, 28, 0.95)',
                              border: `1px solid ${pathColor}`,
                              boxShadow: isForced
                                ? '0 4px 12px rgba(34, 211, 238, 0.4), 0 0 8px rgba(34, 211, 238, 0.2)'
                                : (dragPathExists 
                                  ? '0 4px 12px rgba(168, 85, 247, 0.4), 0 0 8px rgba(168, 85, 247, 0.2)'
                                  : '0 4px 12px rgba(239, 68, 68, 0.4), 0 0 8px rgba(239, 68, 68, 0.2)'),
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              color: 'var(--text-body)',
                              whiteSpace: 'nowrap',
                              zIndex: 100,
                              pointerEvents: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {isForced ? (
                              <>
                                <span style={{ fontSize:'11px'}}></span>
                                <span style={{ color: 'var(--pigment-woad)' }}>强制位移: {dragPathDistance.toFixed(1)} ft</span>
                              </>
                            ) : dragPathExists ? (
                              <>
                                <span style={{ fontSize:'11px'}}></span>
                                <span>已移动: {dragPathDistance.toFixed(1)} ft</span>
                              </>
                            ) : dragIsNonActiveCombatMove ? (
                              <>
                                <span style={{ fontSize:'11px'}}></span>
                                <span style={{ color: 'var(--pigment-madder)' }}>非当前行动回合 (当前为: {dragActiveCharName})</span>
                              </>
                            ) : dragIsSpeedExceeded ? (
                              <>
                                <span style={{ fontSize:'11px'}}></span>
                                <span style={{ color: 'var(--pigment-madder)' }}>移动力不足 (剩余: {dragSpeedRemaining.toFixed(1)} ft, 需: {dragPathDistance.toFixed(1)} ft)</span>
                              </>
                            ) : (
                              <>
                                <span style={{ fontSize:'11px'}}></span>
                                <span style={{ color: 'var(--pigment-madder)' }}>路线受阻 (直线: {dragPathDistance.toFixed(1)} ft)</span>
                              </>
                            )}
                          </div>
                        </>
                      );
                    })()
                  )}

                  {/* The roster card never becomes the map preview: show the token's real footprint instead. */}
                  {draggedToken && dragHoverCoords && (
                    (() => {
                      const previewCharacter = characters.find(character => character.id === draggedToken.id) || draggedToken;
                      const footprint = characterFootprintCells(previewCharacter);
                      const avatar = characterAvatar(previewCharacter);
                      return <div
                      data-testid="token-drop-preview"
                      aria-label={`${compactCharacterName(draggedToken.name || '棋子')}落点预览`}
                      style={{
                        position: 'absolute',
                        left: `${(dragHoverCoords.x + 0.5) * gridSize}px`,
                        top: `${(dragHoverCoords.y + 0.5) * gridSize}px`,
                        width: `${gridSize * footprint}px`,
                        height: `${gridSize * footprint}px`,
                        transform: 'translate(-50%, -50%)',
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: '50%',
                        border: '2px solid var(--accent)',
                        background: draggedToken.type === 'PC' ? 'var(--pigment-woad)' : 'var(--pigment-madder)',
                        color: 'var(--surface-panel)',
                        boxShadow: '0 0 0 2px var(--surface-scrim), 0 0 14px var(--accent-line)',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: Math.max(7, Math.min(18, Math.round(gridSize * Math.min(1.4, footprint) * 0.55))),
                        opacity: 0.72,
                        pointerEvents: 'none',
                        zIndex: 12
                      }}
                    >
                      {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : compactCharacterName(draggedToken.name || '棋子').substring(0, 2)}
                    </div>;
                    })()
                  )}

                  {/* Draggable Character Tokens */}
                  {activeTokens.filter(char => !isVisionBlackout && (!isVisionLimitedView || playerVisibility.visibleCharacterIds.has(char.id))).map(char => {
                    const tokenX = ((char.gridX || 0) + 0.5) * gridSize;
                    const tokenY = ((char.gridY || 0) + 0.5) * gridSize;
                    const footprint = characterFootprintCells(char);
                    const avatar = characterAvatar(char);
                    const isActiveTurn = isInCombat && combatTurnOrder[currentTurnIndex]?.id === char.id;
                    const isCombatSensed = isVisionLimitedView && playerVisibility.sensedCombatIds.has(char.id);

                    return (
                      <div
                        key={char.id}
                        draggable={!isDrawingMode && (!isTerrainEditMode || terrainEditTool === 'pan')}
                        onDragStart={(e) => handleTokenDragStart(e, char.id)}
                        onDragEnd={handleDragEnd}
                        onMouseEnter={() => setHoveredTokenId(char.id)}
                        onMouseLeave={() => setHoveredTokenId(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTokenId(char.id === selectedTokenId ? null : char.id);
                          onCharacterSelect?.(char.id);
                        }}
                        style={{
                          position: 'absolute',
                          left: `${tokenX}px`,
                          top: `${tokenY}px`,
                          width: `${gridSize * footprint}px`,
                          height: `${gridSize * footprint}px`,
                          transform: 'translate(-50%, -50%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          userSelect: 'none',
                          pointerEvents: isDrawingMode ? 'none' : 'auto',
                          background: char.type === 'PC' ? 'var(--pigment-woad)' : 'var(--pigment-madder)',
                          color: 'var(--surface-panel)',
                          fontFamily: 'var(--font-display)',
                          fontWeight: 700,
                          fontSize: Math.max(7, Math.min(18, Math.round(gridSize * Math.min(1.4, footprint) * 0.55))),
                          opacity: isCombatSensed ? 0.72 : 1,
                          filter: isCombatSensed ? 'grayscale(.75)' : 'none',
                          boxShadow: isCombatSensed ? '0 0 0 2px var(--pigment-ochre), 0 0 10px var(--pigment-ochre-line)' : '0 0 0 1px var(--bracket-line)',
                          outline: isActiveTurn ? '1px solid var(--accent)' : selectedTokenId === char.id ? '1px solid var(--text-body)' : 'none',
                          outlineOffset: 2,
                          zIndex: selectedTokenId === char.id ? 10 : 7,
                          cursor: isTerrainEditMode && terrainEditTool !== 'pan' ? 'not-allowed' : 'grab'
                        }}
                      >
                        {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', pointerEvents: 'none' }} /> : char.name ? compactCharacterName(char.name).substring(0, 2) : 'Token'}
                        {isCombatSensed && <span title="战斗中已知目标（不在正常视线内）" style={{ position: 'absolute', right: -5, top: -7, fontSize: 10, color: 'var(--pigment-ochre)' }}>!</span>}
                      </div>
                    );
                  })}
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>

        {/* Selected Token Floating Interaction Panel */}
        {selectedTokenObj && appRole !== 'PLAYER' && !isTerrainEditMode && (() => {
          const actionRes = (selectedTokenObj.resources || []).find(r => r.name === '动作') || { value: 1, max: 1 };
          const bonusRes = (selectedTokenObj.resources || []).find(r => r.name === '附赠动作') || { value: 1, max: 1 };
          const flashlightItem = itemPool.find(item => item.name?.includes('手电筒') && item.quantity > 0
            && item.ownerId === selectedTokenObj.id);
          const flashlightOn = Boolean(flashlightItem && selectedTokenObj.lightSource?.enabled === true);

          const updateVision = patch => setCharacters(previous => previous.map(character => character.id === selectedTokenObj.id
            ? { ...character, vision: { darkvision: 0, normalVisionLimit: 180, sharedWithParty: true, ...(character.vision || {}), ...patch } }
            : character));
          const updateGeometry = patch => setCharacters(previous => previous.map(character => {
            if (character.id !== selectedTokenObj.id) return character;
            const updated = { ...character, ...patch };
            if (patch.sizeCategory !== undefined || patch.footprintCells !== undefined) {
              const centered = clampCharacterCenterToMap(updated.gridX, updated.gridY, updated, mapWidth, mapHeight);
              return { ...updated, gridX: centered.x, gridY: centered.y };
            }
            return updated;
          }));
          const turnFacing = amount => setCharacters(previous => previous.map(character => character.id === selectedTokenObj.id
            ? { ...character, facing: ((Number(character.facing || 0) + amount) % 360 + 360) % 360,
              lightSource: character.lightSource ? { ...character.lightSource, direction: ((Number(character.facing || 0) + amount) % 360 + 360) % 360 } : character.lightSource }
            : character));
          const toggleFlashlight = () => {
            if (!flashlightItem) return;
            setCharacters(previous => previous.map(character => character.id === selectedTokenObj.id ? {
              ...character,
              lightSource: {
                id: `flashlight-${character.id}`, name: '手电筒', shape: 'cone', angle: 60,
                brightRange: 30, dimRange: 30, direction: Number(character.facing || 0),
                ...(flashlightItem?.lightSource || character.lightSource || {}), enabled: !flashlightOn
              }
            } : character));
          };

          const toggleQuickRes = (resName) => {
            setCharacters(prev => prev.map(c => {
              if (c.id !== selectedTokenObj.id) return c;
              const updated = (c.resources || []).map(r => {
                if (r.name !== resName) return r;
                const newVal = r.value > 0 ? 0 : 1;
                addLog?.({
                  type: 'COMBAT',
                  content: `角色 [${c.name}] 在地图互动栏 ${newVal > 0 ? '充能' : '消耗'}了资源 **[${resName}]**: ${r.value} -> **${newVal}** (上限: ${r.max})`,
                  timestamp: new Date().toLocaleTimeString()
                });
                return { ...r, value: newVal };
              });
              const drive = updated.find(resource => resource.name === '斗气');
              let conditions = c.conditions || [];
              if (drive?.value === 0 && !conditions.some(condition => condition.id === 'burnout' || condition.name === '斗气枯竭')) conditions = [...conditions, { id: 'burnout', name: '斗气枯竭', duration: 'permanent', source: 'resource' }];
              if (drive?.value > 0) conditions = conditions.filter(condition => condition.id !== 'burnout' && condition.name !== '斗气枯竭');
              return { ...c, resources: updated, conditions };
            }));
          };

          const adjustRes = (realIndex, amount) => {
            setCharacters(prev => prev.map(c => {
              if (c.id !== selectedTokenObj.id) return c;
              const updated = (c.resources || []).map((r, rIdx) => {
                if (rIdx !== realIndex) return r;
                const newVal = Math.max(0, Math.min(r.max, r.value + amount));
                if (newVal !== r.value) {
                  addLog?.({
                    type: 'COMBAT',
                    content: `角色 [${c.name}] 在地图互动栏 ${amount > 0 ? '恢复' : '消耗'}了资源 **[${r.name}]**: ${r.value} -> **${newVal}** (上限: ${r.max})`,
                    timestamp: new Date().toLocaleTimeString()
                  });
                }
                return { ...r, value: newVal };
              });
              const drive = updated.find(resource => resource.name === '斗气');
              let conditions = c.conditions || [];
              if (drive?.value === 0 && !conditions.some(condition => condition.id === 'burnout' || condition.name === '斗气枯竭')) conditions = [...conditions, { id: 'burnout', name: '斗气枯竭', duration: 'permanent', source: 'resource' }];
              if (drive?.value > 0) conditions = conditions.filter(condition => condition.id !== 'burnout' && condition.name !== '斗气枯竭');
              return { ...c, resources: updated, conditions };
            }));
          };

          const quickChip = (res, label, name, tone) => (
            <button
              type="button"
              onClick={() => toggleQuickRes(name)}
              title={res.value > 0 ? `点击消耗 [${name}]` : `点击恢复 [${name}]`}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                height: 'var(--control-h-sm)',
                border: 'none',
                cursor: 'pointer',
                background: res.value > 0 ? `var(--pigment-${tone}-soft)` : 'transparent',
                boxShadow: `inset 0 0 0 1px ${res.value > 0 ? `var(--pigment-${tone}-line)` : 'var(--line-hairline)'}`,
                color: res.value > 0 ? `var(--pigment-${tone})` : 'var(--text-faint)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--type-meta)',
                transition: 'var(--motion-control)'
              }}
            >
              {label}
              <span>{res.value > 0 ? '可用' : '已用'}</span>
            </button>
          );

          const addCondition = (name) => {
            const rounds = prompt(`请输入 [${name}] 持续回合数 (数字，或输入 permanent 为永久):`, '3');
            if (rounds !== null) handleAddCondition(selectedTokenObj.id, name, rounds);
          };

          return (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                right: 'var(--space-4)',
                bottom: 'var(--space-4)',
                width: 320,
                maxHeight: '85%',
                zIndex: 101,
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
                padding: 'var(--space-4)',
                overflowY: 'auto',
                background: 'var(--surface-overlay)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                boxShadow: 'inset 0 0 0 1px var(--bracket-line), var(--shadow-float)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                <MapToken kind={selectedTokenObj.type === 'PC' ? 'PC' : 'MONSTER'} name={compactCharacterName(selectedTokenObj.name)} image={characterAvatar(selectedTokenObj)} size={34} selected />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)', fontSize: 'var(--type-display-sm)', color: 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {compactCharacterName(selectedTokenObj.name)}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>
                    {selectedTokenObj.type} · {selectedTokenObj.class || '无职业'} · X{String(selectedTokenObj.gridX || 0).padStart(2, '0')} Y{String(selectedTokenObj.gridY || 0).padStart(2, '0')}
                  </div>
                </div>
                <IconButton icon="x" size="sm" onClick={() => setSelectedTokenId(null)} title= "关闭面板" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <Meter label= "生命值" value={selectedTokenObj.hp} max={selectedTokenObj.maxHp} temp={selectedTokenObj.tempHp || 0} />
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button size="sm" variant="danger" style={{ flex: 1 }} onClick={() => adjustHp(selectedTokenObj.id, -5)} title= "扣除 5 点生命值">-5</Button>
                  <Button size="sm" variant="danger" style={{ flex: 1 }} onClick={() => adjustHp(selectedTokenObj.id, -1)} title= "扣除 1 点生命值">-1</Button>
                  <Button size="sm" variant="secondary" style={{ flex: 1 }} onClick={() => adjustHp(selectedTokenObj.id, 1)} title= "恢复 1 点生命值">+1</Button>
                  <Button size="sm" variant="secondary" style={{ flex: 1 }} onClick={() => adjustHp(selectedTokenObj.id, 5)} title= "恢复 5 点生命值">+5</Button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', paddingTop: 'var(--space-3)', borderTop: 'var(--border-hairline)' }}>
                <ToolbarLabel>视野与照明</ToolbarLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                  <TextInput size="sm" type="number" label="黑暗视觉 (ft)" value={selectedTokenObj.vision?.darkvision || 0} onChange={event => updateVision({ darkvision: Math.max(0, Number(event.target.value) || 0) })} />
                  <Button size="sm" variant={flashlightOn ? 'primary' : 'secondary'} icon="flashlight" disabled={!flashlightItem} onClick={toggleFlashlight} title={flashlightItem ? '开关该角色背包中的手电筒' : '该角色背包中没有可用手电筒'}>
                    {flashlightOn ? '关闭手电筒' : '开启手电筒'}
                  </Button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
                  <TextInput size="sm" type="number" label="眼高(ft)" value={selectedTokenObj.eyeHeight || 5.5} onChange={event => updateGeometry({ eyeHeight: Math.max(0.5, Number(event.target.value) || 5.5) })} />
                  <TextInput size="sm" type="number" label="离地(ft)" value={selectedTokenObj.elevation || 0} onChange={event => updateGeometry({ elevation: Math.max(0, Number(event.target.value) || 0) })} />
                  <Select
                    size="sm"
                    label="人物体型"
                    value={selectedTokenObj.sizeCategory || sizeCategoryForFootprint(selectedTokenObj.footprintCells)}
                    options={CHARACTER_SIZE_OPTIONS}
                    onChange={event => {
                      const option = CHARACTER_SIZE_OPTIONS.find(candidate => candidate.value === event.target.value) || CHARACTER_SIZE_OPTIONS[3];
                      updateGeometry({ sizeCategory: option.value, footprintCells: option.footprint });
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 'var(--space-2)' }}>
                  <Button size="sm" variant="secondary" icon="arrow-counter-clockwise" onClick={() => turnFacing(-45)} title="向左转 45°">左转</Button>
                  <Button size="sm" variant="secondary" icon="arrow-clockwise" onClick={() => turnFacing(45)} title="向右转 45°">右转</Button>
                  <StatPill label="朝向" value={`${Number(selectedTokenObj.facing || 0)}°`} size="sm" tone="accent" />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', paddingTop: 'var(--space-3)', borderTop: 'var(--border-hairline)' }}>
                <ToolbarLabel>战斗动作与资源</ToolbarLabel>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {quickChip(actionRes, '动作', '动作', 'verdigris')}
                  {quickChip(bonusRes, '附赠', '附赠动作', 'woad')}
                </div>
                {(selectedTokenObj.resources || []).filter(r => r.name !== '动作' && r.name !== '附赠动作').map((res, idx) => {
                  const realIndex = selectedTokenObj.resources.findIndex(r => r.name === res.name);
                  return (
                    <ResourceSlot
                      key={idx}
                      name={res.name}
                      value={res.value}
                      max={res.max}
                      resetType={res.resetType === 'short_rest' ? 'short' : res.resetType === 'long_rest' ? 'long' : 'turn'}
                      onSpend={() => adjustRes(realIndex, -1)}
                      onRestore={() => adjustRes(realIndex, 1)}
                    />
                  );
                })}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', paddingTop: 'var(--space-3)', borderTop: 'var(--border-hairline)' }}>
                <ToolbarLabel>状态管理</ToolbarLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {selectedTokenObj.conditions && selectedTokenObj.conditions.length > 0 ? (
                    selectedTokenObj.conditions.map(cond => (
                      <Badge key={cond.id} tone="ochre" variant="soft" size="sm" onRemove={() => handleRemoveCondition(selectedTokenObj.id, cond.id)}>
                        {cond.name}（{cond.duration ==='permanent'?'':`${cond.duration}r`}）
                      </Badge>
                    ))
                  ) : (
                    <span style={{ fontSize: 'var(--type-micro)', color: 'var(--pigment-verdigris)', fontStyle: 'italic' }}>正常 (无特殊状态)</span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 'var(--space-2)' }}>
                  {['眩晕', '倒地', '定身', '中毒', '致盲', '隐身', '虚弱', '祝福'].map(condName => (
                    <Button key={condName} size="sm" variant="secondary" onClick={() => addCondition(condName)} title={`为此棋子附加 [${condName}] 状态`}>
                      {condName}
                    </Button>
                  ))}
                </div>
                {(selectedTokenObj.conditions || []).some(condition => condition.id === '隐身' || condition.name === '隐身') && (
                  <Button size="sm" variant={selectedTokenObj.revealedToParty ? 'primary' : 'secondary'} icon="eye" onClick={() => setCharacters(previous => previous.map(character => character.id === selectedTokenObj.id ? { ...character, revealedToParty: !character.revealedToParty } : character))}>
                    {selectedTokenObj.revealedToParty ? '全队已识破隐身' : '标记为全队识破'}
                  </Button>
                )}
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <TextInput
                    size="sm"
                    placeholder= "手填自定义状态..."
                    value={mapCondDraft}
                    onChange={(e) => setMapCondDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        addCondition(e.target.value.trim());
                        setMapCondDraft('');
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="plus"
                    title= "添加手填的自定义状态"
                    onClick={() => {
                      const name = mapCondDraft.trim();
                      if (!name) return;
                      addCondition(name);
                      setMapCondDraft('');
                    }}
                  />
                </div>
              </div>

              <Button
                variant="danger"
                size="sm"
                icon="map-pin-simple-area"
                fullWidth
                title={isInCombat && selectedTokenObj.type === 'NPC' && Number(selectedTokenObj.hp) <= 0 ? '移出并清理这名死亡敌人' : '把此棋子从当前地图上移除（角色卡保留）'}
                onClick={() => handleRemoveTokenFromMap(selectedTokenObj)}
              >
                {isInCombat && selectedTokenObj.type === 'NPC' && Number(selectedTokenObj.hp) <= 0 ? '移出并清理死亡单位' : '手动从地图移出'}
              </Button>
            </div>
          );
        })()}
      </div>

      {terrainHint && hintedArea && (
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            left: terrainHint.x + 14,
            top: terrainHint.y + 14,
            transform: terrainHint.x > (globalThis.innerWidth || 1200) - 310 ? 'translateX(-100%)' : undefined,
            zIndex: 2200,
            width: 320,
            pointerEvents: 'none',
            padding: 'var(--space-3)',
            background: 'var(--surface-overlay)',
            color: 'var(--text-body)',
            boxShadow: 'inset 0 0 0 1px var(--line-strong), var(--shadow-float)',
            fontSize: 'var(--type-meta)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <DmforgeIcon name={terrainTriggerDetails(hintedArea) ? 'trap' : 'component-library'} size={16} style={{ color: terrainTriggerDetails(hintedArea) ? 'var(--pigment-ochre)' : 'var(--accent)' }} />
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--type-body-sm)' }}>{hintedArea.name}</strong>
            <Badge tone={hintedArea.isSecret ? 'madder' : terrainIsDestroyed(hintedArea) ? 'neutral' : 'accent'} size="sm">
              {hintedArea.isSecret && !hintedArea.discoveredByParty ? 'DM 隐藏' : terrainIsDestroyed(hintedArea) ? '已破坏' : terrainTriggerDetails(hintedArea) ? '触发陷阱' : TERRAIN_FEATURE_OPTIONS.find(option => option.value === hintedArea.featureType)?.label || '地图构件'}
            </Badge>
          </div>

          <p style={{ margin: '0 0 var(--space-2)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {TERRAIN_FEATURE_DESCRIPTIONS[hintedArea.featureType] || (terrainTriggerDetails(hintedArea) ? '进入或满足条件时会触发的地图机关。' : '可在地形编辑器中调整位置、尺寸、穿越与视野规则。')}
          </p>
          {terrainTriggerDetails(hintedArea) && (() => {
            const details = terrainTriggerDetails(hintedArea);
            return <div style={{ display: 'grid', gap: 5, marginBottom: 'var(--space-2)', padding: 'var(--space-2)', background: 'var(--pigment-ochre-soft)', boxShadow: 'inset 2px 0 0 var(--pigment-ochre)' }}>
              <span><b style={{ color: 'var(--pigment-ochre)' }}>触发：</b>{details.trigger}</span>
              <span><b style={{ color: 'var(--pigment-ochre)' }}>判定：</b>{details.check}</span>
              <span><b style={{ color: 'var(--pigment-madder)' }}>效果：</b>{details.effect}</span>
              <span><b>持续：</b>{details.duration}</span>
              <span><b>解除：</b>{details.disarm}</span>
            </div>;
          })()}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6, color: 'var(--text-faint)' }}>
            <span>移动<br /><b style={{ color: 'var(--text-body)' }}>{TERRAIN_MOVEMENT_OPTIONS.find(option => option.value === terrainMovementMode(hintedArea))?.label || '自定义'}</b></span>
            <span>视线<br /><b style={{ color: 'var(--text-body)' }}>{TERRAIN_VISION_OPTIONS.find(option => option.value === terrainVisionMode(hintedArea))?.label || '自定义'}</b></span>
            <span>掩体<br /><b style={{ color: 'var(--text-body)' }}>{TERRAIN_COVER_OPTIONS.find(option => option.value === terrainCoverLevel(hintedArea))?.label || '无'}</b></span>
          </div>
          {hintedArea.destructible && <div style={{ marginTop: 'var(--space-2)', fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>耐久 {Math.max(0, Number(hintedArea.currentHp ?? hintedArea.maxHp ?? 1))}/{Number(hintedArea.maxHp ?? 1)}</div>}
        </div>
      )}

      {/* Bottom readout */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          padding: 'var(--space-3) var(--space-5)',
          background: 'var(--surface-panel)',
          borderTop: 'var(--border-hairline)',
          fontSize: 'var(--type-meta)'
        }}
      >
        {isVisionControlMode ? (
          <span style={{ color: 'var(--pigment-verdigris)' }}>
            {visionSelectionTool === 'pan'
              ? '玩家与直播视野控制已开启 · 当前为地图漫游，拖拽可移动视角'
              : `正在编辑${VISION_SELECTION_ITEMS.find(item => item.id === visionSelectionTool)?.label || ''}视野选区 · 完成后在上方选择显示、遮蔽或恢复自动`}
          </span>
        ) : isTerrainEditMode ? (
          <span style={{ color: 'var(--accent)' }}>
            正在编辑地形：
            {terrainEditTool === 'paint_block' ? '阻挡刷子激活（按住鼠标左键并在地图上拖动绘制）'
              : terrainEditTool === 'paint_erase' ? '橡皮擦激活（按住鼠标左键并在阻挡格上拖动擦除）'
                : terrainEditTool === 'move' ? '构件移动：拖动构件改变位置，拖动控制点调整大小'
                  : terrainEditTool === 'box_select' ? '框选工具：拖出矩形范围以揭示地形或消除阻挡'
                    : '地图漫游：拖动地图不会移动任何构件'}
          </span>
        ) : selectedTokenObj ? (
          <span style={{ color: 'var(--text-muted)' }}>
            已选中 <strong style={{ color: 'var(--accent)' }}>{compactCharacterName(selectedTokenObj.name)}</strong>
            <span style={{ fontFamily: 'var(--font-mono)', marginLeft: 'var(--space-2)' }}>
              X{String(selectedTokenObj.gridX || 0).padStart(2, '0')} Y{String(selectedTokenObj.gridY || 0).padStart(2, '0')}
            </span>
          </span>
        ) : (
          <span style={{ color: 'var(--text-faint)' }}>点击地图上的棋子进行选中或拖动以改变位置</span>
        )}

        {!isTerrainEditMode && unplacedPCs.length > 0 && (
          <Button
            size="sm"
            icon="users-three"
            onClick={handleSummonCharacters}
            title={`一键将未在当前地图的 ${unplacedPCs.length} 个玩家角色召集到当前地图中央`}
          >
            召回玩家角色 ({unplacedPCs.length})
          </Button>
        )}

        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>
          比例尺 <span style={{ fontFamily: 'var(--font-mono)' }}>1</span>格 = <span style={{ fontFamily: 'var(--font-mono)' }}>1ft</span>
        </span>
      </div>

      {/* Encounter setup */}
      <Modal
        open={showInitiativePrep}
        onClose={() => setShowInitiativePrep(false)}
        icon="sword"
        title= "发起遭遇战：勾选参战单位"
        width={520}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowInitiativePrep(false)}>取消</Button>
            <Button
              icon="dice-six"
              onClick={handleRollAndStartCombat}
              disabled={characters.filter(c => c.mapId === activeMapId).length === 0}
              title= "为所有勾选的单位掷先攻，按结果排序并进入战斗"
            >
              一键掷先攻并开战
            </Button>
          </>
        }
      >
        <span style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)' }}>
          选择参战成员，先攻将自动加上各自的先攻修正。
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: '42vh', overflowY: 'auto' }}>
          {characters.filter(c => c.mapId === activeMapId).map(c => {
            const isChecked = !!tempParticipants[c.id];
            return (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)',
                  background: isChecked ? 'var(--accent-soft)' : 'var(--surface-raised)',
                  boxShadow: `inset 0 0 0 1px ${isChecked ? 'var(--accent-line)' : 'var(--line-hairline)'}`,
                  transition: 'var(--motion-control)'
                }}
              >
                <Checkbox
                  checked={isChecked}
                  onChange={() => setTempParticipants(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                  label={compactCharacterName(c.name)}
                />
                <Badge size="sm" tone={c.type === 'PC' ? 'woad' : 'madder'}>{c.type}</Badge>
                <span aria-hidden="true" style={{ flex: 1, borderTop: 'var(--rule-dot)' }} />
                <StatPill label= "先攻修正" value={`+${c.initiative || 0}`} size="sm" tone="accent" style={{ flex: '0 0 auto' }} />
              </div>
            );
          })}

          {characters.filter(c => c.mapId === activeMapId).length === 0 && (
            <EmptyState icon="users-three" text= "当前地图上没有放置任何角色棋子" hint= "请先从左侧名册拖动角色上图。" />
          )}
        </div>
      </Modal>
    </div>
  );
}
