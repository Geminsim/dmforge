import { useState, useRef, useEffect, useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Map, ZoomIn, ZoomOut, RefreshCw, Eye, EyeOff, Paintbrush, Eraser, Compass, Plus, Trash2, Scissors, Copy } from 'lucide-react';
import { findShortestPath } from '../utils/pathfinding';
import { advanceCombatTurn, resetTurnResources, rollInitiative, tickRoundConditions } from '../utils/combatRules';

/** 45° survey hatch for terrain fills — the grammar's alternative to flat tints. */
const TERRAIN_HATCH = (tone) => {
  const soft = tone === 'accent' ? 'var(--accent-soft)' : `var(--pigment-${tone}-soft)`;
  return `repeating-linear-gradient(45deg, ${soft} 0 3px, transparent 3px 7px)`;
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
  setCombatParticipants,
  combatTurnOrder = [],
  setCombatTurnOrder,
  onPresentationCameraChange,
  onPresentationInteractionChange,
  presentationInteraction,
  presentationCamera,
  presentationCameraMode = 'independent'
}) {
  const [gridSize] = useState(20); // 20px represents 1ft
  
  // Retrieve the active map state
  const activeMap = maps.find(m => m.id === activeMapId) || maps[0] || {
    id: 'temp_map',
    name: '临时战役地图',
    width: 60,
    height: 40,
    bgUrl: '',
    blockedCells: {},
    terrainAreas: []
  };

  const mapWidth = activeMap.width || 60;
  const mapHeight = activeMap.height || 40;
  const mapBgUrl = activeMap.bgUrl || '';
  const blockedCells = useMemo(() => activeMap.blockedCells || {}, [activeMap.blockedCells]);
  const terrainAreas = activeMap.terrainAreas || [];

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
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);
  const blockedCanvasRef = useRef(null);
  const transformRef = useRef(null);

  // Undo history states & refs
  const [canUndo, setCanUndo] = useState(false);
  const historyRef = useRef([]);
  const lastPaintedCellRef = useRef(null);

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

  // Terrain editing states
  const [isTerrainEditMode, setIsTerrainEditMode] = useState(false);
  const [terrainEditTool, setTerrainEditTool] = useState('select'); // paint_block, paint_erase, select, box_select
  const [isPainting, setIsPainting] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState(null);
  const [defaultImpassable, setDefaultImpassable] = useState(false);



  // Turn-based Combat Local UI states
  const [showInitiativePrep, setShowInitiativePrep] = useState(false);
  const [tempParticipants, setTempParticipants] = useState({}); // { charId: boolean }
  const [, setManualInitiatives] = useState({}); // { charId: number }
  const [, setShowConditionPopupId] = useState(null);

  // Map Property Configuration panel state
  const [showMapConfig, setShowMapConfig] = useState(false);

  // Forced Movement States
  const [isForcedMoveMode, setIsForcedMoveMode] = useState(false);
  const [dragIsShiftPressed, setDragIsShiftPressed] = useState(false);

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
    transformRef.current?.setTransform(
      presentationCamera.x || 0,
      presentationCamera.y || 0,
      presentationCamera.scale || 1,
      120,
      'easeOut'
    );
  }, [appRole, presentationCamera, presentationCameraMode]);

  useEffect(() => {
    if (appRole !== 'PLAYER' || presentationCameraMode !== 'follow-active') return;
    const activeId = combatTurnOrder[currentTurnIndex]?.id;
    const activeCharacter = characters.find(character => character.id === activeId && character.mapId === activeMapId);
    const viewport = containerRef.current?.parentElement?.getBoundingClientRect();
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
  const activeTokens = characters.filter(char => char.mapId === activeMapId);

  // Identify players that are on other maps and eligible for summon
  const unplacedPCs = characters.filter(char => char.type === 'PC' && char.mapId !== activeMapId);

  const handleTokenDragStart = (e, tokenId) => {
    if (appRole === 'PLAYER') {
      e.preventDefault();
      return;
    }
    // If we're painting, don't drag tokens
    if (isTerrainEditMode && terrainEditTool !== 'select') {
      e.preventDefault();
      return;
    }
    setSelectedTokenId(tokenId);
    e.dataTransfer.setData('text/plain', tokenId);

    const char = characters.find(c => c.id === tokenId);
    if (char) {
      setDraggedToken({
        id: tokenId,
        startX: char.gridX || 0,
        startY: char.gridY || 0,
        name: char.name
      });
      setDragHoverCoords({ x: char.gridX || 0, y: char.gridY || 0 });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!draggedToken || !containerRef.current) return;

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

    const gridX = Math.max(0, Math.min(mapWidth - 1, Math.floor(unscaledX / gridSize)));
    const gridY = Math.max(0, Math.min(mapHeight - 1, Math.floor(unscaledY / gridSize)));

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
    onPresentationCameraChange?.({ scale: ref.state.scale, x: ref.state.positionX || 0, y: ref.state.positionY || 0 });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (appRole === 'PLAYER') return;
    setDraggedToken(null);
    setDragHoverCoords(null);
    const tokenId = e.dataTransfer.getData('text/plain');
    if (!tokenId || !containerRef.current) return;

    const token = characters.find(c => c.id === tokenId);
    if (!token) return;

    const rect = containerRef.current.getBoundingClientRect();
    
    // Get mouse coordinates relative to map container (which is scaled and panned on screen)
    const scaledX = e.clientX - rect.left;
    const scaledY = e.clientY - rect.top;

    // Divide by current scale to translate back to unscaled coordinate space
    const unscaledX = scaledX / scale;
    const unscaledY = scaledY / scale;

    // Convert pixels to 1ft grids
    const gridX = Math.max(0, Math.min(mapWidth - 1, Math.floor(unscaledX / gridSize)));
    const gridY = Math.max(0, Math.min(mapHeight - 1, Math.floor(unscaledY / gridSize)));

    let movementCost = 0;

    if (isInCombat) {
      const isForced = isForcedMoveMode || e.shiftKey;

      if (!isForced) {
        const activeParticipant = combatTurnOrder[currentTurnIndex];
        if (activeParticipant?.id !== tokenId) {
          alert(`⚠️ 无法拖动：当前非 [${token.name}] 的行动回合！`);
          return;
        }
      }

      // Calculate path and cost
      const path = findShortestPath(
        token.gridX || 0,
        token.gridY || 0,
        gridX,
        gridY,
        mapWidth,
        mapHeight,
        isCellBlocked,
        isCellDifficult
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
          alert(`❌ 无法移动：该路线受阻，无法绕过障碍物！`);
          return;
        }

        const speedRemaining = token.combatSpeedRemaining !== undefined ? token.combatSpeedRemaining : (token.speed !== undefined ? token.speed : 30);
        if (movementCost > speedRemaining) {
          alert(`❌ 移动力不足！当前回合仅剩 ${speedRemaining.toFixed(1)} ft 移动力，无法移动 ${movementCost.toFixed(1)} ft。`);
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
            content: `🏃 **[${token.name}]** 消耗了 **${movementCost.toFixed(1)} ft** 移动力，本回合还剩 **${remainingSpeed.toFixed(1)} ft**。`,
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
            content: `💥 **[${token.name}]** 遭受了**强制位移 / 传送**，位移了 **${movementCost.toFixed(1)} ft**（本次移动未消耗其回合移动力）。`,
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
          content: `📍 棋子 [${token.name}] 移动到位置: (${gridX}ft, ${gridY}ft) [地图: ${activeMap.name}]`,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }

    if (addLog) {
      // 2. Blocked Grid cell warning
      const cellKey = `${gridX}_${gridY}`;
      let isImpassableBlock = blockedCells[cellKey];
      let blockedAreaName = '';
      if (!isImpassableBlock) {
        for (const area of terrainAreas) {
          if (area.isImpassable) {
            if (area.type === 'rect') {
              if (gridX >= area.gridX && gridX < area.gridX + area.width &&
                  gridY >= area.gridY && gridY < area.gridY + area.height) {
                isImpassableBlock = true;
                blockedAreaName = area.name;
                break;
              }
            } else if (area.type === 'circle') {
              const dist = Math.hypot(gridX - area.gridX, gridY - area.gridY);
              if (dist <= area.radius) {
                isImpassableBlock = true;
                blockedAreaName = area.name;
                break;
              }
            }
          }
        }
      }

      if (isImpassableBlock) {
        addLog({
          type: 'COMBAT',
          content: `⚠️ 警告：棋子 [${token.name}] 移动到了不可通过的 [${blockedAreaName ? `阻挡地形: ${blockedAreaName}` : '阻挡格'}] 障碍物上！`,
          timestamp: new Date().toLocaleTimeString()
        });
      }

      // 3. Custom terrain area collision detection
      terrainAreas.forEach(area => {
        let intersected = false;
        if (area.type === 'rect') {
          intersected = gridX >= area.gridX && gridX < area.gridX + area.width &&
                        gridY >= area.gridY && gridY < area.gridY + area.height;
        } else if (area.type === 'circle') {
          const dist = Math.sqrt(Math.pow(gridX - area.gridX, 2) + Math.pow(gridY - area.gridY, 2));
          intersected = dist <= area.radius;
        }

        if (intersected) {
          let warningText;
          if (area.color === 'red') {
            warningText = `🔥 警告：[${token.name}] 踏入了 [${area.name}] (烈火地形)！请注意扣减生命值并做反射豁免！`;
          } else if (area.color === 'emerald') {
            warningText = `🤢 警告：[${token.name}] 踏入了 [${area.name}] (毒性/酸性地形)！请每回合进行体质豁免鉴定！`;
          } else if (area.color === 'blue') {
            warningText = `❄️ 提示：[${token.name}] 进入了 [${area.name}] (寒冰/水体地形)，移动速度可能受阻。`;
          } else if (area.color === 'amber') {
            warningText = `🧱 提示：[${token.name}] 进入了 [${area.name}] (困难地形/碎石)，在困难地形内移动需要消耗双倍移动力。`;
          } else if (area.color === 'purple') {
            warningText = `🔮 警告：[${token.name}] 进入了 [${area.name}] (法术/诅咒地形)，请进行意志豁免判定！`;
          } else {
            warningText = `⚠️ 提示：[${token.name}] 进入了 [${area.name}] 地形区。`;
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
    if (!isTerrainEditMode || terrainEditTool !== 'select') return;
    
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
        handleUpdateArea(area.id, { gridX: nextGridX, gridY: nextGridY }, true);
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
    if (!isTerrainEditMode || terrainEditTool !== 'select') return;
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

  // Resizing circular terrain areas (radius snapped to ft)
  const handleCircleResizeStart = (e, area) => {
    if (appRole === 'PLAYER') return;
    if (!isTerrainEditMode || terrainEditTool !== 'select') return;
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

  // Brush Painting functions
  const handleMapMouseDown = (e) => {
    if (appRole === 'PLAYER') return;
    if (!isTerrainEditMode) return;
    
    // Ignore clicks on token handles or form inputs
    if (e.target.closest('.token-node') || e.target.closest('.terrain-resize-handle') || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') {
      return;
    }

    if (terrainEditTool === 'paint_block' || terrainEditTool === 'paint_erase') {
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
    if (!isTerrainEditMode) return;
    
    if (isPainting && (terrainEditTool === 'paint_block' || terrainEditTool === 'paint_erase')) {
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
    setIsPainting(false);
    
    if (terrainEditTool === 'box_select') {
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
      color: 'purple',
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
      color: 'purple',
      gridX: Math.floor(mapWidth / 2),
      gridY: Math.floor(mapHeight / 2),
      radius: 4,
      isSecret: false,
      isImpassable: defaultImpassable
    };
    setTerrainAreas([...terrainAreas, newArea]);
    setEditingAreaId(newArea.id);
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
        content: `🚧 复制了区域地形: **${area.name}** -> **${newArea.name}**`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const handleClearAllTerrains = () => {
    if (window.confirm('确定要清空当前地图上的所有阻挡网格与区域地形吗？该操作不可撤销！')) {
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
        content: `🔮 DM 一键召唤了所有玩家角色至当前地图 **[${activeMap.name}]** 视口中央，开启战役推演！`,
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
          content: `🎲 先攻投掷: [${character.name}] 1d20(${result.roll}) + 修正(${result.modifier}) = **${result.total}**`,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    });

    // Reset each participant character's combat speeds, start grids, and turn resources
    setCharacters(prev => prev.map(c => {
      if (activeParticipantsIds.includes(c.id)) {
        return resetTurnResources(c);
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
        content: `⚔️ **战斗正式爆发 (回合 1)**！当前共有 ${activeParticipantsIds.length} 位角色参战。先攻行动首发者为: **[${firstChar ? firstChar.name : '未知'}]**！`,
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
          content: `🟢 退出战斗，系统回归自由行动模式。所有角色的行动限制已解除。`,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }
  };

  // Next character turn flow
  const handleNextTurn = () => {
    if (combatTurnOrder.length === 0) return;

    const { nextIndex, nextRound, wrapped } = advanceCombatTurn(currentTurnIndex, combatRound, combatTurnOrder.length);

    if (wrapped) {
      setCombatRound(nextRound);
      setCharacters(previous => {
        const result = tickRoundConditions(previous);
        result.expired.forEach(({ characterName, condition }) => addLog?.({
          type: 'COMBAT',
          content: `🟢 状态消除：角色 [${characterName}] 身上的 [${condition.name}] 持续时间到期，状态已被完全清除。`,
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
        return resetTurnResources(c);
      }
      return c;
    }));

    if (addLog) {
      addLog({
        type: 'COMBAT',
        content: `⏭️ 行动权交接 (回合 ${nextRound})：当前轮到 **[${nextChar ? nextChar.name : '未知'}]** 执行战术决策！`,
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
        content: `🩸 状态变更：为 [${char ? char.name : '未知'}] 附加了特殊状态 [${name}] (持续 ${duration === 'permanent' ? '永久' : `${duration} 回合`})。`,
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
            content: `🟢 状态消除：DM 手动清除了 [${c.name}] 身上的特殊状态 [${removed.name}]。`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
        return { ...c, conditions: filtered };
      }
      return c;
    }));
  };

  // Adjust HP values
  const adjustHp = (charId, amount) => {
    setCharacters(prev => prev.map(c => {
      if (c.id === charId) {
        const newHp = Math.max(0, Math.min(c.maxHp, c.hp + amount));
        if (addLog && newHp !== c.hp) {
          addLog({
            type: 'COMBAT',
            content: `❤️ 角色 [${c.name}] HP 变更: **${c.hp}** -> **${newHp}** (最大值: ${c.maxHp})`,
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
        content: `🔄 **重置回合**: [${char.name}] 撤销了本回合的战术跑位！棋子闪回至起点 (${startX}ft, ${startY}ft)，已用移动力完全复原！`,
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

  // Filter terrains visible to the current perspective
  const visibleTerrains = terrainAreas.filter(area => !isPlayerViewMode || !area.isSecret);

  // Helper to determine if a cell is blocked by brush walls or impassable vector shapes
  const isCellBlocked = (x, y) => {
    // 1. Check brush-drawn blocked cells
    if (blockedCells[`${x}_${y}`]) return true;

    // 2. Check impassable vector terrain areas
    for (const area of terrainAreas) {
      if (area.isImpassable) {
        if (area.type === 'rect') {
          if (x >= area.gridX && x < area.gridX + area.width &&
              y >= area.gridY && y < area.gridY + area.height) {
            return true;
          }
        } else if (area.type === 'circle') {
          const dist = Math.hypot(x - area.gridX, y - area.gridY);
          if (dist <= area.radius) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Helper to determine if a cell is difficult terrain (amber color and visible)
  const isCellDifficult = (x, y) => {
    for (const area of terrainAreas) {
      if (isPlayerViewMode && area.isSecret) continue; // Skip hidden secret traps in player mode
      if (area.color === 'amber') {
        if (area.type === 'rect') {
          if (x >= area.gridX && x < area.gridX + area.width &&
              y >= area.gridY && y < area.gridY + area.height) {
            return true;
          }
        } else if (area.type === 'circle') {
          const dist = Math.hypot(x - area.gridX, y - area.gridY);
          if (dist <= area.radius) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Calculate A* path for dragging
  let dragPath;
  let dragPathDistance = 0;
  let dragPathExists = false;
  let dragSvgPathD = '';
  let dragIsNonActiveCombatMove = false;
  let dragIsSpeedExceeded = false;
  let dragActiveCharName = '';
  let dragSpeedRemaining = 30;

  if (draggedToken && dragHoverCoords) {
    const isForced = isForcedMoveMode || dragIsShiftPressed;

    // 1. If in combat, validate turn
    if (isInCombat && !isForced) {
      const activeParticipant = combatTurnOrder[currentTurnIndex];
      const activeChar = characters.find(c => c.id === activeParticipant?.id);
      dragActiveCharName = activeChar ? activeChar.name : '未知';
      
      if (activeParticipant?.id !== draggedToken.id) {
        dragIsNonActiveCombatMove = true;
      }
    }

    dragPath = findShortestPath(
      draggedToken.startX,
      draggedToken.startY,
      dragHoverCoords.x,
      dragHoverCoords.y,
      mapWidth,
      mapHeight,
      isCellBlocked,
      isCellDifficult
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Map Control Header */}
      <div className="panel-header" style={{ background: 'var(--surface-panel)', borderBottom: '1px solid var(--line-hairline)', flexWrap: 'wrap', gap: '12px' }}>
        <div className="panel-title">
          <Map size={18} style={{ color: 'var(--accent)' }} />
          <span>🗺 战术网格地图 (1格 = 1ft)</span>
        </div>

        {/* Map switching selector dropdown */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>当前地图:</label>
          <select
            value={activeMapId}
            onChange={(e) => {
              setActiveMapId(e.target.value);
              setSelectedTokenId(null);
              setEditingAreaId(null);
            }}
            className="input-text"
            style={{ 
              padding: '4px 8px', 
              fontSize: '11px', 
              background: 'var(--surface-raised)', 
              border: '1px solid var(--line-hairline)', 
              color: 'var(--text-body)',
              borderRadius: '4px',
              cursor: 'pointer',
              height: '30px'
            }}
          >
            {maps.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Map Creator and config trigger buttons (DM Private) */}
        {!isPlayerViewMode && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => {
                const name = prompt('请输入新准备的战役地图名称:', `新战役地图 ${maps.length + 1}`);
                if (name) {
                  addMap(name, 40, 30, '');
                  setShowMapConfig(true); // Auto-open config to let DM customize dimensions/background URL
                }
              }}
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px', height: '30px' }}
              title="新建一张空白推演地图"
            >
              <Plus size={12} />
              <span>新建地图</span>
            </button>
            
            <button
              onClick={() => setShowMapConfig(!showMapConfig)}
              className={`btn ${showMapConfig ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px', height: '30px' }}
              title="配置当前激活地图的名字、背景图片 URL 与网格尺幅"
            >
              <span>⚙️ 地图配置</span>
            </button>
          </div>
        )}

        {/* Combat Mode Controls */}
        {!isPlayerViewMode && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {isInCombat ? (
              <>
                <button
                  onClick={handleExitCombat}
                  className="btn btn-danger"
                  style={{ fontSize: '11px', padding: '6px 12px', height: '30px', border: '1px solid rgba(239,68,68,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="退出当前战斗模式，清除先攻行动队列"
                >
                  <span>⚔️ 退出战斗</span>
                </button>
                
                <button
                  onClick={() => setIsForcedMoveMode(!isForcedMoveMode)}
                  className={`btn ${isForcedMoveMode ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ 
                    fontSize: '11px', 
                    padding: '6px 12px', 
                    height: '30px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    background: isForcedMoveMode ? 'var(--pigment-woad)' : 'var(--surface-raised)',
                    border: isForcedMoveMode ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid var(--line-hairline)',
                    boxShadow: isForcedMoveMode ? '0 0 10px rgba(6, 182, 212, 0.3)' : 'none'
                  }}
                  title="开启后，战斗中可无视回合与移动力限制强制移动任何棋子，且不扣减其移动力（或在拖拽时按住 Shift 键触发临时强制位移）"
                >
                  <span>💥 强制位移: {isForcedMoveMode ? '开启' : '关闭'}</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleOpenCombatSetup}
                className="btn btn-primary"
                style={{ fontSize: '11px', padding: '6px 12px', height: '30px', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--accent)' }}
                title="发起战斗回合，选择参战角色投先攻"
              >
                <span>⚔️ 发起战斗</span>
              </button>
            )}
          </div>
        )}

        {/* DM Edit Mode Switch (Hidden in presentation mode) */}
        {!isPlayerViewMode && (
          <button
            onClick={() => {
              setIsTerrainEditMode(!isTerrainEditMode);
              setEditingAreaId(null);
              setTerrainEditTool('select');
            }}
            className={`btn ${isTerrainEditMode ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '6px 12px', height: '30px', marginLeft: 'auto' }}
          >
            <span>{isTerrainEditMode ? '💾 保存并退出编辑' : '🛠️ 地形编辑画笔'}</span>
          </button>
        )}
      </div>

      {/* Map Property Configuration Panel (DM Only) */}
      {showMapConfig && !isPlayerViewMode && (
        <div
          style={{
            background: 'var(--surface-raised)',
            padding: '12px 16px',
            borderBottom: '1px solid var(--line-hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.4)',
            zIndex: 5
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold' }}>重命名当前地图:</label>
              <input
                type="text"
                value={activeMap.name}
                onChange={(e) => updateMap(activeMap.id, { name: e.target.value })}
                className="input-text"
                style={{ width: '150px', padding: '4px 8px', fontSize: '11px', height: '28px' }}
                placeholder="地图名称"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold' }}>宽度 (ft):</label>
              <input
                type="number"
                value={activeMap.width}
                onChange={(e) => updateMap(activeMap.id, { width: Math.max(10, parseInt(e.target.value, 10) || 40) })}
                className="input-text"
                style={{ width: '55px', padding: '4px 8px', fontSize: '11px', height: '28px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold' }}>高度 (ft):</label>
              <input
                type="number"
                value={activeMap.height}
                onChange={(e) => updateMap(activeMap.id, { height: Math.max(10, parseInt(e.target.value, 10) || 30) })}
                className="input-text"
                style={{ width: '55px', padding: '4px 8px', fontSize: '11px', height: '28px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '220px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold' }}>背景图片大图 URL (可选):</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={activeMap.bgUrl || ''}
                  onChange={(e) => updateMap(activeMap.id, { bgUrl: e.target.value })}
                  className="input-text"
                  style={{ flex: 1, padding: '4px 8px', fontSize: '11px', height: '28px' }}
                  placeholder="可粘贴外部网络或本地图片 URL 地址"
                />
                {activeMap.bgUrl && (
                  <button
                    onClick={() => updateMap(activeMap.id, { bgUrl: '' })}
                    className="btn btn-secondary"
                    style={{ fontSize: '10px', padding: '4px 8px', height: '28px' }}
                  >
                    清除
                  </button>
                )}
              </div>
            </div>

            <div style={{ alignSelf: 'flex-end', marginLeft: 'auto' }}>
              <button
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
                className="btn btn-danger"
                style={{ fontSize: '11px', padding: '6px 12px', height: '28px' }}
              >
                🗑️ 删除当前地图
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terrain Editor Sub-Header Panel */}
      {isTerrainEditMode && !isPlayerViewMode && (
        <div 
          style={{ 
            background: 'var(--surface-raised)', 
            padding: '10px 16px', 
            borderBottom: '1px solid var(--line-hairline)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.4)',
            zIndex: 4
          }}
        >
          {/* Action buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>网格刷子:</span>
              <button
                onClick={() => setTerrainEditTool('paint_block')}
                className={`btn ${terrainEditTool === 'paint_block' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Paintbrush size={11} />
                <span>🧱 绘制阻挡格</span>
              </button>
              <button
                onClick={() => setTerrainEditTool('paint_erase')}
                className={`btn ${terrainEditTool === 'paint_erase' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Eraser size={11} />
                <span>🧽 阻挡橡皮</span>
              </button>
              <button
                onClick={() => setTerrainEditTool('select')}
                className={`btn ${terrainEditTool === 'select' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="选择/漫游模式（在地图上直接拖动区域更改位置，或拖拽边缘边角缩放大小）"
              >
                <Compass size={11} />
                <span>🖐️ 漫游与拖拽地形</span>
              </button>
              <button
                onClick={() => {
                  setTerrainEditTool('box_select');
                  setSelectionBox(null);
                }}
                className={`btn ${terrainEditTool === 'box_select' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="框选区域模式（在地图上拖拽出选区，框内阻挡格可进行平移或消除）"
              >
                <Scissors size={11} />
                <span>✂️ 区域选择/框选阻挡</span>
              </button>
            </div>

            {terrainEditTool === 'box_select' && selectionBox && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'rgba(168, 85, 247, 0.1)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
                <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 'bold' }}>已框选区域:</span>
                <button
                  type="button"
                  onClick={() => {
                    // Push to history for undo
                    pushToHistory();
                    
                    // Delete all blocked cells in the selection box
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
                        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                          delete next[key];
                        }
                      });
                      return next;
                    });
                    setSelectionBox(null);
                  }}
                  className="btn"
                  style={{ 
                    padding: '2px 8px', 
                    fontSize: '11px', 
                    height: '22px', 
                    borderRadius: '4px', 
                    background: 'rgba(239, 68, 68, 0.15)', 
                    border: '1px solid rgba(239, 68, 68, 0.3)', 
                    color: 'var(--pigment-madder)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer'
                  }}
                  title="删除框选区域内的所有实体阻挡格"
                >
                  <Trash2 size={11} />
                  <span>🗑️ 消除框内阻挡</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionBox(null)}
                  className="btn btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '11px', height: '22px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  取消框选
                </button>
              </div>
            )}

            <div style={{ width: '1px', height: '16px', background: 'var(--line-hairline)' }} />

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>绘制区域:</span>
              <button
                onClick={handleAddRectArea}
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', height: '26px' }}
              >
                <Plus size={11} />
                <span>🟩 矩形地形</span>
              </button>
              <button
                onClick={handleAddCircleArea}
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', height: '26px' }}
              >
                <Plus size={11} />
                <span>🟡 圆形地形</span>
              </button>
              
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  fontSize: '11px', 
                  color: 'var(--text-muted)', 
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px dashed var(--line-hairline)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  marginLeft: '4px'
                }}
                onClick={() => setDefaultImpassable(!defaultImpassable)}
              >
                <input
                  id="defaultImpassableCheck"
                  type="checkbox"
                  checked={defaultImpassable}
                  onChange={() => {}}
                  style={{ cursor: 'pointer', accentColor: 'var(--pigment-madder)' }}
                />
                <label htmlFor="defaultImpassableCheck" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }} title="勾选后，新建的图形地形默认具备实体阻挡障碍物属性，防止棋子穿过">
                  <span>🚫 默认阻挡</span>
                </label>
              </div>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="btn btn-secondary"
                style={{ 
                  fontSize: '11px', 
                  padding: '4px 10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  opacity: canUndo ? 1 : 0.45,
                  cursor: canUndo ? 'pointer' : 'not-allowed',
                  border: canUndo ? '1px solid var(--accent)' : '1px solid transparent',
                  boxShadow: canUndo ? '0 0 6px var(--accent-line)' : 'none'
                }}
                title={canUndo ? '撤销上一步地形或阻挡绘制' : '暂无可以撤销的操作'}
              >
                <span>↩️ 撤销绘制</span>
              </button>
              <button
                onClick={handleClearAllTerrains}
                className="btn btn-danger"
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                🧹 清空所有地形
              </button>
            </div>
          </div>

          {/* Edit placed vector terrains */}
          {terrainAreas.length > 0 && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '6px', 
              background: 'rgba(0,0,0,0.2)', 
              padding: '8px', 
              borderRadius: '6px',
              border: '1px solid var(--line-hairline)' 
            }}>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                📋 区域地形列表 ({terrainAreas.length}) - 在地图上点击图形或修改下方参数以调节大小与状态
              </span>
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '2px' }}>
                {terrainAreas.map(area => {
                  const color = colorConfig[area.color] || colorConfig.purple;
                  const isEditing = editingAreaId === area.id;

                  return (
                    <div
                      key={area.id}
                      style={{
                        minWidth: '220px',
                        background: isEditing ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                        border: isEditing ? `1px solid ${color.value}` : '1px solid var(--line-hairline)',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        transition: 'all 0.2s',
                        boxShadow: isEditing ? `0 0 6px ${color.glow}` : 'none',
                        cursor: 'pointer'
                      }}
                      onClick={() => setEditingAreaId(area.id)}
                    >
                      {/* Title input & Delete */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={area.name}
                          onChange={(e) => handleUpdateArea(area.id, { name: e.target.value })}
                          className="input-text"
                          style={{ fontSize: '11px', padding: '2px 4px', width: '120px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--line-hairline)', color: 'var(--text-body)' }}
                          placeholder="地形名称"
                        />
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpdateArea(area.id, { isImpassable: !area.isImpassable }); }}
                            style={{ background: 'transparent', border: 'none', color: area.isImpassable ? 'var(--pigment-madder)' : 'var(--text-faint)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'transform 0.2s' }}
                            title={area.isImpassable ? '实体阻挡已开启 (阻断角色通行)' : '自由通行区域 (角色可自由穿过)'}
                          >
                            <span style={{ fontSize: '11px', transform: area.isImpassable ? 'scale(1.2)' : 'none', display: 'inline-block' }}>{area.isImpassable ? '🚫' : '🟢'}</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpdateArea(area.id, { isSecret: !area.isSecret }); }}
                            style={{ background: 'transparent', border: 'none', color: area.isSecret ? 'var(--accent)' : 'var(--text-faint)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title={area.isSecret ? '玩家不可见 (隐秘陷阱)' : '玩家可见'}
                          >
                            {area.isSecret ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDuplicateArea(area); }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="快速复制此地形区域"
                          >
                            <Copy size={11} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteArea(area.id); }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="删除地形"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Dimensions controls */}
                      <div style={{ display: 'flex', gap: '6px', fontSize: '9px', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <span>X(ft):</span>
                          <input
                            type="number"
                            value={area.gridX}
                            onChange={(e) => handleUpdateArea(area.id, { gridX: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                            style={{ width: '28px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--line-hairline)', color: 'var(--text-body)', fontSize: '9px', padding: '1px', borderRadius: '3px', textAlign: 'center' }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <span>Y(ft):</span>
                          <input
                            type="number"
                            value={area.gridY}
                            onChange={(e) => handleUpdateArea(area.id, { gridY: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                            style={{ width: '28px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--line-hairline)', color: 'var(--text-body)', fontSize: '9px', padding: '1px', borderRadius: '3px', textAlign: 'center' }}
                          />
                        </div>
                        {area.type === 'rect' ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <span>宽:</span>
                              <input
                                type="number"
                                value={area.width}
                                onChange={(e) => handleUpdateArea(area.id, { width: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                                style={{ width: '28px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--line-hairline)', color: 'var(--text-body)', fontSize: '9px', padding: '1px', borderRadius: '3px', textAlign: 'center' }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <span>高:</span>
                              <input
                                type="number"
                                value={area.height}
                                onChange={(e) => handleUpdateArea(area.id, { height: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                                style={{ width: '28px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--line-hairline)', color: 'var(--text-body)', fontSize: '9px', padding: '1px', borderRadius: '3px', textAlign: 'center' }}
                              />
                            </div>
                          </>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <span>半径:</span>
                            <input
                              type="number"
                              value={area.radius}
                              onChange={(e) => handleUpdateArea(area.id, { radius: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                              style={{ width: '28px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--line-hairline)', color: 'var(--text-body)', fontSize: '9px', padding: '1px', borderRadius: '3px', textAlign: 'center' }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Impassable Toggle */}
                      <div 
                        onClick={(e) => { e.stopPropagation(); handleUpdateArea(area.id, { isImpassable: !area.isImpassable }); }}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          fontSize: '10px', 
                          color: area.isImpassable ? 'var(--pigment-madder)' : 'var(--text-muted)',
                          background: area.isImpassable ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                          border: `1px solid ${area.isImpassable ? 'rgba(239, 68, 68, 0.3)' : 'var(--line-hairline)'}`,
                          padding: '4px 6px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          userSelect: 'none',
                          marginTop: '2px',
                          marginBottom: '2px'
                        }}
                        title={area.isImpassable ? '关闭实体阻挡，变为自由通行区域' : '开启实体阻挡，使其成为计算绕行的无法穿过障碍物'}
                      >
                        <input
                          type="checkbox"
                          checked={!!area.isImpassable}
                          onChange={() => {}}
                          style={{ cursor: 'pointer', accentColor: 'var(--pigment-madder)' }}
                        />
                        <span style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span>🚫</span> 实体阻挡障碍 (角色不可穿越)
                        </span>
                      </div>

                      {/* Color presets selection */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '9px' }}>
                        <span style={{ color: 'var(--text-faint)' }}>灾害级:</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {Object.keys(colorConfig).map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleUpdateArea(area.id, { color: c }); }}
                              style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                background: colorConfig[c].value,
                                border: area.color === c ? '2px solid var(--text-body)' : '1px solid var(--line-hairline)',
                                cursor: 'pointer',
                                padding: 0
                              }}
                              title={colorConfig[c].label}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Turn Order先攻条 (Combat Timeline Bar) */}
      {isInCombat && (
        <div 
          style={{ 
            background: 'var(--surface-overlay)', 
            backdropFilter: 'blur(16px)', 
            borderBottom: '1px solid var(--line-hairline)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            padding: 0,
            overflow: 'hidden',
            zIndex: 100,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            position: 'relative'
          }}
        >
          {/* Row 1: initiative only. Explicit height prevents cyclic percentage sizing. */}
          <div style={{ width: '100%', height: '76px', minHeight: '76px', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', boxSizing: 'border-box' }}>
          {/* Round Indicator */}
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRight: '1px solid var(--line-hairline)',
              paddingRight: '16px',
              height: '52px',
              minWidth: '70px'
            }}
          >
            <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Round</span>
            <span style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'var(--font-display)', color: 'var(--text-body)', lineHeight: 1 }}>{combatRound}</span>
          </div>

          {/* Timeline Order List */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflowX: 'auto', padding: '4px 0' }}>
            {combatTurnOrder.map((participant, index) => {
              const char = characters.find(c => c.id === participant.id);
              if (!char) return null;

              const isActive = index === currentTurnIndex;
              const isPC = char.type === 'PC';

              return (
                <div 
                  key={char.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    background: isActive ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    border: isActive 
                      ? '1px solid var(--accent)' 
                      : '1px solid var(--line-hairline)',
                    boxShadow: isActive ? '0 0 12px var(--accent-line)' : 'none',
                    height: '52px',
                    minWidth: '140px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setSelectedTokenId(char.id);
                  }}
                >
                  {/* Small Avatar/Token Circle */}
                  <div 
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isPC ? 'var(--pigment-woad)' : 'var(--pigment-madder)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: 'var(--text-body)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      border: isActive ? '2px solid var(--pigment-ochre)' : '1.5px solid rgba(255,255,255,0.4)',
                    }}
                  >
                    {char.name ? char.name.substring(0, 2) : 'TK'}
                  </div>

                  {/* Name and Initiative Roll */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                      <span 
                        style={{ 
                          fontSize: '12px', 
                          fontWeight: 'bold', 
                          color: isActive ? 'var(--text-body)' : 'var(--text-body)',
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {char.name}
                      </span>
                      {isActive && (
                        <span 
                          style={{ 
                            fontSize: '8px', 
                            background: 'var(--pigment-ochre)', 
                            color: 'var(--text-on-accent)', 
                            padding: '1px 3px', 
                            borderRadius: '3px', 
                            fontWeight: '800' 
                          }}
                        >
                          ACTIVE
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: 'var(--text-muted)' }}>
                      <span>先攻: <strong>{participant.total}</strong></span>
                      <span>顺位 {index + 1}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </div>

          {/* Active Unit Fast Dashboard (Highlighting Resources, Conditions, and turn controls) */}
          {combatTurnOrder[currentTurnIndex] && (
            (() => {
              const activeParticipant = combatTurnOrder[currentTurnIndex];
              const activeChar = characters.find(c => c.id === activeParticipant.id);
              if (!activeChar) return null;

              return (
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    borderTop: '1px solid var(--line-hairline)',
                    padding: '10px 16px',
                    height: '118px',
                    minHeight: '118px',
                    maxHeight: '118px',
                    boxSizing: 'border-box',
                    overflowX: 'auto'
                  }}
                >
                  {/* Active character summary, deliberately separated from initiative order */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '190px', paddingRight: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--text-body)', maxWidth: '125px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeChar.name}</strong>
                      <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '999px', background: 'rgba(245,158,11,.18)', color: 'var(--pigment-ochre)', border: '1px solid rgba(245,158,11,.35)' }}>当前行动</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                      <div title="当前生命值" style={{ fontSize: '10px', padding: '4px 6px', borderRadius: '5px', background: 'var(--pigment-madder-soft)', color: 'var(--pigment-madder)' }}>❤️ {activeChar.hp}/{activeChar.maxHp}</div>
                      <div title="护甲等级" style={{ fontSize: '10px', padding: '4px 6px', borderRadius: '5px', background: 'var(--pigment-woad-soft)', color: 'var(--pigment-woad)' }}>🛡️ AC {activeChar.ac ?? 10}</div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                        <span>🏃 移动力</span>
                        <strong>{Math.round(activeChar.combatSpeedRemaining ?? activeChar.speed ?? 30)}/{activeChar.speed || 30}ft</strong>
                      </div>
                      <div style={{ height: '5px', borderRadius: '999px', background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, ((activeChar.combatSpeedRemaining ?? activeChar.speed ?? 30) / (activeChar.speed || 30)) * 100))}%`, background: 'linear-gradient(90deg,var(--pigment-verdigris),var(--pigment-verdigris))', transition: 'width .25s ease' }} />
                      </div>
                    </div>
                  </div>

                  {/* Current conditions listing & Add Condition popover */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '6px', position: 'relative', minWidth: '150px', maxWidth: '240px', borderLeft: '1px solid var(--line-hairline)', paddingLeft: '14px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: 'bold' }}>🏷️ 状态效果</span>
                    
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', overflowY: 'auto', maxHeight: '42px' }}>
                      {activeChar.conditions && activeChar.conditions.map(cond => (
                        <span 
                          key={cond.id} 
                          style={{ 
                            fontSize: '10px', 
                            padding: '3px 7px', 
                            background: 'linear-gradient(135deg,rgba(239,68,68,.2),rgba(127,29,29,.14))', 
                            color: 'var(--pigment-madder)', 
                            borderRadius: '4px',
                            border: '1px solid rgba(239,68,68,0.3)',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {cond.name}({cond.duration === 'permanent' ? '∞' : `${cond.duration}r`})
                          <button 
                            onClick={() => handleRemoveCondition(activeChar.id, cond.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--pigment-madder)', cursor: 'pointer', fontSize: '9px', fontWeight: 'bold', padding: 0 }}
                          >
                            ✕
                          </button>
                        </span>
                      ))}

                      {(!activeChar.conditions || activeChar.conditions.length === 0) && (
                        <span style={{ fontSize: '10px', color: 'var(--text-faint)', fontStyle: 'italic' }}>正常</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        const name = prompt('输入要添加的状态名称（如：眩晕、祝福、中毒）：', '眩晕');
                        if (!name?.trim()) return;
                        const rounds = prompt(`请输入 [${name.trim()}] 持续回合数（数字，或 permanent 为永久）：`, '3');
                        if (rounds !== null) handleAddCondition(activeChar.id, name.trim(), rounds);
                      }}
                      style={{ fontSize: '9px', height: '22px', padding: '2px 7px', alignSelf: 'flex-start' }}
                    >
                      ＋ 添加状态
                    </button>
                  </div>

                  {/* Active Unit Resources trackers (Spell slots, actions, etc) */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '6px', borderLeft: '1px solid var(--line-hairline)', paddingLeft: '14px', flex: 1, minWidth: '280px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-faint)', fontWeight: 'bold' }}>🔋 动作、法术与角色资源</span>
                    <div style={{ display: 'flex', gap: '7px', overflowX: 'auto', paddingBottom: '2px' }}>
                      {activeChar.resources && activeChar.resources.map((res, resIdx) => (
                        <div 
                          key={resIdx}
                          style={{
                            background: res.value <= 0 ? 'rgba(239,68,68,.08)' : 'rgba(139,92,246,.1)',
                            border: `1px solid ${res.value <= 0 ? 'rgba(239,68,68,.3)' : 'rgba(192,132,252,.32)'}`,
                            borderRadius: '8px',
                            padding: '5px 7px',
                            display: 'grid',
                            gridTemplateColumns: 'auto auto',
                            alignItems: 'center',
                            gap: '4px 7px',
                            minHeight: '46px',
                            minWidth: '105px',
                            whiteSpace: 'nowrap',
                            boxShadow: res.value > 0 ? '0 0 8px rgba(192,132,252,.08)' : 'none'
                          }}
                        >
                          <span style={{ fontSize: '10px', color: res.value <= 0 ? 'var(--pigment-madder)' : 'var(--text-body)', fontWeight: 'bold' }}>{res.name === '动作' ? '⚔️ ' : res.name === '附赠动作' ? '⚡ ' : /法术|魔法/.test(res.name) ? '🔮 ' : '◆ '}{res.name}</span>
                          <span style={{ fontSize: '9px', color: res.value <= 0 ? 'var(--pigment-madder)' : 'var(--accent)', justifySelf: 'end' }}>{res.value <= 0 ? '已耗尽' : `${res.value}/${res.max}`}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <button 
                              onClick={() => {
                                setCharacters(prev => prev.map(c => {
                                  if (c.id === activeChar.id) {
                                    const updatedRes = [...c.resources];
                                    updatedRes[resIdx] = { ...res, value: Math.max(0, res.value - 1) };
                                    return { ...c, resources: updatedRes };
                                  }
                                  return c;
                                }));
                              }}
                              disabled={res.value <= 0}
                              style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--text-body)', width: '18px', height: '18px', borderRadius: '3px', cursor: res.value <= 0 ? 'not-allowed' : 'pointer', opacity: res.value <= 0 ? .35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}
                            >
                              -
                            </button>
                            <div style={{ display: 'flex', gap: '2px', minWidth: '35px', justifyContent: 'center' }} title={`${res.value}/${res.max}`}>
                              {Array.from({ length: Math.min(res.max || 0, 8) }, (_, slot) => <span key={slot} style={{ width: '4px', height: '12px', borderRadius: '2px', background: slot < res.value ? 'var(--accent)' : 'rgba(255,255,255,.1)' }} />)}
                              {(res.max || 0) > 8 && <span style={{ fontSize: '9px', color: 'var(--text-faint)' }}>×{res.max}</span>}
                            </div>
                            <button 
                              onClick={() => {
                                setCharacters(prev => prev.map(c => {
                                  if (c.id === activeChar.id) {
                                    const updatedRes = [...c.resources];
                                    updatedRes[resIdx] = { ...res, value: Math.min(res.max, res.value + 1) };
                                    return { ...c, resources: updatedRes };
                                  }
                                  return c;
                                }));
                              }}
                              disabled={res.value >= res.max}
                              style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--text-body)', width: '18px', height: '18px', borderRadius: '3px', cursor: res.value >= res.max ? 'not-allowed' : 'pointer', opacity: res.value >= res.max ? .35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}

                      {(!activeChar.resources || activeChar.resources.length === 0) && (
                        <span style={{ fontSize: '10px', color: 'var(--text-faint)', fontStyle: 'italic' }}>无资源槽</span>
                      )}
                    </div>
                  </div>

                  {/* Turn Controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'stretch', borderLeft: '1px solid var(--line-hairline)', paddingLeft: '14px', minWidth: '112px' }}>
                    <button 
                      onClick={() => handleResetTurnMovement(activeChar.id)}
                      className="btn btn-secondary"
                      style={{ fontSize: '11px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px', height: '30px' }}
                      title="撤销当前回合的棋子移动，返回本回合行动起点，并完全复原移动力"
                    >
                      <span>🔄 重置该回合</span>
                    </button>
                    
                    <button 
                      onClick={handleNextTurn}
                      className="btn btn-primary"
                      style={{ fontSize: '11px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', height: '30px', background: 'var(--pigment-verdigris)' }}
                      title="结束该角色当前回合，移交行动权给下一位角色"
                    >
                      <span>⏭️ 结束回合</span>
                    </button>
                  </div>

                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Map Content Box */}
      <div 
        style={{ flex: 1, minHeight: 0, position: 'relative', background: 'var(--surface-sunken)', display: 'flex', overflow: 'hidden' }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Ambient Atmosphere Background Image (DMForge Sleek Morandi Ambient Overlay) */}
        {mapBgUrl && (
          <div 
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: `url(${mapBgUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.35, // High-end dimmed ambient backdrop
              zIndex: 0,
              pointerEvents: 'none'
            }}
          />
        )}

        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          initialPositionX={0}
          initialPositionY={0}
          minScale={0.25}
          maxScale={4}
          onTransformed={handleTransform}
          onZoom={handleTransform}
          panning={{ disabled: isTerrainEditMode && (terrainEditTool === 'paint_block' || terrainEditTool === 'paint_erase' || terrainEditTool === 'box_select') }}
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
                right: '16px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <button onClick={() => zoomIn()} className="btn btn-secondary btn-icon-only" style={{ background: 'var(--surface-overlay)' }}><ZoomIn size={16} /></button>
                <button onClick={() => zoomOut()} className="btn btn-secondary btn-icon-only" style={{ background: 'var(--surface-overlay)' }}><ZoomOut size={16} /></button>
                <button onClick={() => resetTransform()} className="btn btn-secondary btn-icon-only" style={{ background: 'var(--surface-overlay)' }}><RefreshCw size={14} /></button>
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
                    backgroundColor: mapBgUrl ? 'var(--surface-scrim)' : 'var(--surface-sunken)',
                    backdropFilter: mapBgUrl ? 'blur(10px)' : 'none',
                    WebkitBackdropFilter: mapBgUrl ? 'blur(10px)' : 'none',
                    border: mapBgUrl ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 0, 0, 0.4)',
                    cursor: isTerrainEditMode && terrainEditTool === 'paint_block' ? 'cell' :
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
                        linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
                      `
                    }}
                  />

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

                  {/* Render selection box and real-time drag translation preview */}
                  {selectionBox && (
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
                            border: '2px dashed var(--accent)',
                            background: 'rgba(168, 85, 247, 0.08)',
                            boxShadow: '0 0 12px rgba(168, 85, 247, 0.4), inset 0 0 6px rgba(168, 85, 247, 0.2)',
                            pointerEvents: 'none',
                            zIndex: 3
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
                            color: 'var(--accent)',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                          }}>
                            <span>✥ 按住框选区可拖动平移</span>
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
                            background: 'repeating-linear-gradient(45deg, rgba(168, 85, 247, 0.3), rgba(168, 85, 247, 0.3) 4px, rgba(239, 68, 68, 0.3) 4px, rgba(239, 68, 68, 0.3) 8px)',
                            border: '1px solid var(--accent)',
                            boxShadow: '0 0 8px rgba(168, 85, 247, 0.5)',
                            pointerEvents: 'none',
                            zIndex: 2
                          }}
                        />
                      ));
                    })()
                  )}

                  {/* Render Custom Vector Hazard Regions */}
                  {visibleTerrains.map(area => {
                    const color = colorConfig[area.color] || colorConfig.purple;
                    const isEditing = editingAreaId === area.id;

                    if (area.type === 'rect') {
                      return (
                        <div
                          key={area.id}
                          onMouseDown={(e) => handleTerrainDragStart(e, area)}
                          style={{
                            position: 'absolute',
                            left: `${area.gridX * gridSize}px`,
                            top: `${area.gridY * gridSize}px`,
                            width: `${area.width * gridSize}px`,
                            height: `${area.height * gridSize}px`,
                            background: area.isImpassable 
                              ? `repeating-linear-gradient(45deg, ${color.bg}, ${color.bg} 8px, rgba(239, 68, 68, 0.15) 8px, rgba(239, 68, 68, 0.15) 16px)`
                              : color.bg,
                            border: isEditing 
                              ? `2px solid ${area.isImpassable ? 'var(--pigment-madder)' : color.value}` 
                              : `2px ${area.isImpassable ? 'solid' : 'dashed'} ${area.isImpassable ? 'var(--pigment-madder)' : color.value}`,
                            boxShadow: isEditing ? `0 0 12px ${color.glow}, inset 0 0 6px ${color.glow}` : `0 0 8px ${color.glow}`,
                            borderRadius: '4px',
                            pointerEvents: isTerrainEditMode ? 'auto' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2,
                            cursor: isTerrainEditMode && terrainEditTool === 'select' ? 'grab' : 'default',
                            transition: 'border 0.2s, box-shadow 0.2s',
                            opacity: area.isSecret ? 0.75 : 1
                          }}
                          onClick={(e) => {
                            if (isTerrainEditMode) {
                              e.stopPropagation();
                              setEditingAreaId(area.id);
                            }
                          }}
                        >
                          <span style={{
                            fontSize: '9px',
                            color: 'var(--text-body)',
                            background: 'rgba(10, 12, 20, 0.85)',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            border: `1px solid ${area.isImpassable ? 'var(--pigment-madder)' : color.value}`,
                            userSelect: 'none',
                            boxShadow: `0 2px 4px rgba(0,0,0,0.5)`
                          }}>
                            {area.name} {area.isImpassable && '🚫'} {area.isSecret && '👁️‍🗨️'}
                          </span>

                          {/* Direct Resize Handle at bottom-right */}
                          {isTerrainEditMode && terrainEditTool === 'select' && (
                            <div
                              style={{
                                position: 'absolute',
                                right: '-5px',
                                bottom: '-5px',
                                width: '10px',
                                height: '10px',
                                background: color.value,
                                border: '1px solid var(--bracket-line)',
                                borderRadius: '2px',
                                cursor: 'se-resize',
                                zIndex: 10,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.5)'
                              }}
                              onMouseDown={(e) => handleRectResizeStart(e, area)}
                              title="拖拽改变宽度和高度"
                            />
                          )}
                        </div>
                      );
                    } else if (area.type === 'circle') {
                      return (
                        <div
                          key={area.id}
                          onMouseDown={(e) => handleTerrainDragStart(e, area)}
                          style={{
                            position: 'absolute',
                            left: `${(area.gridX - area.radius) * gridSize}px`,
                            top: `${(area.gridY - area.radius) * gridSize}px`,
                            width: `${area.radius * 2 * gridSize}px`,
                            height: `${area.radius * 2 * gridSize}px`,
                            background: area.isImpassable 
                              ? `repeating-linear-gradient(45deg, ${color.bg}, ${color.bg} 8px, rgba(239, 68, 68, 0.15) 8px, rgba(239, 68, 68, 0.15) 16px)`
                              : color.bg,
                            border: isEditing 
                              ? `2px solid ${area.isImpassable ? 'var(--pigment-madder)' : color.value}` 
                              : `2px ${area.isImpassable ? 'solid' : 'dashed'} ${area.isImpassable ? 'var(--pigment-madder)' : color.value}`,
                            boxShadow: isEditing ? `0 0 12px ${color.glow}, inset 0 0 6px ${color.glow}` : `0 0 8px ${color.glow}`,
                            borderRadius: '50%',
                            pointerEvents: isTerrainEditMode ? 'auto' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2,
                            cursor: isTerrainEditMode && terrainEditTool === 'select' ? 'grab' : 'default',
                            transition: 'border 0.2s, box-shadow 0.2s',
                            opacity: area.isSecret ? 0.75 : 1
                          }}
                          onClick={(e) => {
                            if (isTerrainEditMode) {
                              e.stopPropagation();
                              setEditingAreaId(area.id);
                            }
                          }}
                        >
                          <span style={{
                            fontSize: '9px',
                            color: 'var(--text-body)',
                            background: 'rgba(10, 12, 20, 0.85)',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            border: `1px solid ${area.isImpassable ? 'var(--pigment-madder)' : color.value}`,
                            userSelect: 'none',
                            boxShadow: `0 2px 4px rgba(0,0,0,0.5)`
                          }}>
                            {area.name} {area.isImpassable && '🚫'} {area.isSecret && '👁️‍🗨️'}
                          </span>

                          {/* Direct Radius Resize Handle at rightmost edge */}
                          {isTerrainEditMode && terrainEditTool === 'select' && (
                            <div
                              style={{
                                position: 'absolute',
                                right: '-5px',
                                top: 'calc(50% - 5px)',
                                width: '10px',
                                height: '10px',
                                background: color.value,
                                border: '1px solid var(--bracket-line)',
                                borderRadius: '50%',
                                cursor: 'ew-resize',
                                zIndex: 10,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.5)'
                              }}
                              onMouseDown={(e) => handleCircleResizeStart(e, area)}
                              title="拖拽改变圆半径"
                            />
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}

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
                  {draggedToken && dragHoverCoords && (draggedToken.startX !== dragHoverCoords.x || draggedToken.startY !== dragHoverCoords.y) && (
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
                                <span style={{ fontSize: '11px' }}>💥</span>
                                <span style={{ color: 'var(--pigment-woad)' }}>强制位移: {dragPathDistance.toFixed(1)} ft</span>
                              </>
                            ) : dragPathExists ? (
                              <>
                                <span style={{ fontSize: '11px' }}>👣</span>
                                <span>已移动: {dragPathDistance.toFixed(1)} ft</span>
                              </>
                            ) : dragIsNonActiveCombatMove ? (
                              <>
                                <span style={{ fontSize: '11px' }}>⚠️</span>
                                <span style={{ color: 'var(--pigment-madder)' }}>非当前行动回合 (当前为: {dragActiveCharName})</span>
                              </>
                            ) : dragIsSpeedExceeded ? (
                              <>
                                <span style={{ fontSize: '11px' }}>❌</span>
                                <span style={{ color: 'var(--pigment-madder)' }}>移动力不足 (剩余: {dragSpeedRemaining.toFixed(1)} ft, 需: {dragPathDistance.toFixed(1)} ft)</span>
                              </>
                            ) : (
                              <>
                                <span style={{ fontSize: '11px' }}>⚠️</span>
                                <span style={{ color: 'var(--pigment-madder)' }}>路线受阻 (直线: {dragPathDistance.toFixed(1)} ft)</span>
                              </>
                            )}
                          </div>
                        </>
                      );
                    })()
                  )}

                  {/* Draggable Character Tokens */}
                  {activeTokens.map(char => {
                    const tokenX = (char.gridX || 0) * gridSize;
                    const tokenY = (char.gridY || 0) * gridSize;
                    const isActiveTurn = isInCombat && combatTurnOrder[currentTurnIndex]?.id === char.id;

                    return (
                      <div
                        key={char.id}
                        draggable={!isTerrainEditMode || terrainEditTool === 'select'}
                        onDragStart={(e) => handleTokenDragStart(e, char.id)}
                        onDragEnd={handleDragEnd}
                        onMouseEnter={() => setHoveredTokenId(char.id)}
                        onMouseLeave={() => setHoveredTokenId(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTokenId(char.id === selectedTokenId ? null : char.id);
                        }}
                        className={`token-node ${char.type === 'PC' ? 'token-pc' : 'token-npc'} ${isActiveTurn ? 'token-active-combat' : ''}`}
                        style={{
                          left: `${tokenX}px`,
                          top: `${tokenY}px`,
                          width: `${gridSize * 1.5}px`, // Slight padding for token nodes
                          height: `${gridSize * 1.5}px`,
                          transform: selectedTokenId === char.id ? 'scale(1.2)' : 'none',
                          border: selectedTokenId === char.id ? '1px solid var(--accent)' : '1px solid var(--bracket-line)',
                          zIndex: selectedTokenId === char.id ? 10 : 3,
                          cursor: isTerrainEditMode && terrainEditTool !== 'select' ? 'not-allowed' : 'grab'
                        }}
                      >
                        {char.name ? char.name.substring(0, 2) : 'Token'}
                      </div>
                    );
                  })}
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>

        {/* Selected Token Floating Interaction Panel */}
        {selectedTokenObj && appRole !== 'PLAYER' && (
          <div 
            style={{
              position: 'absolute',
              bottom: '16px',
              right: '16px',
              width: '300px',
              maxHeight: '85%',
              background: 'var(--surface-overlay)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(192, 132, 252, 0.3)',
              borderRadius: '12px',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5), 0 0 15px rgba(192, 132, 252, 0.1)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              zIndex: 101, // Over selected tokens and tools, but below modals
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()} // Prevent deselecting when clicking inside
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--line-hairline)', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ 
                  fontWeight: 'bold', 
                  fontSize: '14px', 
                  color: selectedTokenObj.type === 'PC' ? 'var(--pigment-woad)' : 'var(--pigment-madder)',
                  fontFamily: 'var(--font-display)'
                }}>
                  👤 {selectedTokenObj.name}
                </span>
                <span style={{ fontSize: '9px', color: 'var(--text-faint)' }}>
                  ({selectedTokenObj.type} | {selectedTokenObj.class || '无职业'} | {selectedTokenObj.gridX || 0}ft, {selectedTokenObj.gridY || 0}ft)
                </span>
              </div>
              <button 
                onClick={() => setSelectedTokenId(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-faint)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  padding: '2px 6px'
                }}
                title="关闭面板"
              >
                ✕
              </button>
            </div>

            {/* HP Tracking Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>❤️ 生命值 (HP):</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                  {selectedTokenObj.hp} / {selectedTokenObj.maxHp}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '2px' }}>
                <button 
                  onClick={() => adjustHp(selectedTokenObj.id, -1)} 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '2px 0', fontSize: '10px', height: '22px' }}
                >
                  -1
                </button>
                <button 
                  onClick={() => adjustHp(selectedTokenObj.id, -5)} 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '2px 0', fontSize: '10px', height: '22px' }}
                >
                  -5
                </button>
                <button 
                  onClick={() => adjustHp(selectedTokenObj.id, 1)} 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '2px 0', fontSize: '10px', height: '22px' }}
                >
                  +1
                </button>
                <button 
                  onClick={() => adjustHp(selectedTokenObj.id, 5)} 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '2px 0', fontSize: '10px', height: '22px' }}
                >
                  +5
                </button>
              </div>
            </div>

            {/* Combat Actions & Resources */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>🔋 战斗动作与资源:</span>
              
              {/* Quick Actions (Action & Bonus Action) */}
              {(() => {
                const actionRes = (selectedTokenObj.resources || []).find(r => r.name === '动作') || { value: 1, max: 1 };
                const bonusRes = (selectedTokenObj.resources || []).find(r => r.name === '附赠动作') || { value: 1, max: 1 };
                
                const handleToggleCardRes = (resName) => {
                  setCharacters(prev => prev.map(c => {
                    if (c.id === selectedTokenObj.id) {
                      const updated = (c.resources || []).map(r => {
                        if (r.name === resName) {
                          const newVal = r.value > 0 ? 0 : 1;
                          if (addLog) {
                            addLog({
                              type: 'COMBAT',
                              content: `🔋 角色 [${c.name}] 在地图建议互动栏 ${newVal > 0 ? '充能' : '消耗'}了资源 **[${resName}]**: ${r.value} -> **${newVal}** (上限: ${r.max})`,
                              timestamp: new Date().toLocaleTimeString()
                            });
                          }
                          return { ...r, value: newVal };
                        }
                        return r;
                      });
                      return { ...c, resources: updated };
                    }
                    return c;
                  }));
                };

                return (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <div 
                      onClick={() => handleToggleCardRes('动作')}
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        padding: '4px 0',
                        height: '24px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: actionRes.value > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: actionRes.value > 0 ? 'var(--pigment-verdigris)' : 'var(--text-faint)',
                        border: `1px solid ${actionRes.value > 0 ? 'rgba(16, 185, 129, 0.3)' : 'var(--line-hairline)'}`,
                        transition: 'all 0.2s',
                        userSelect: 'none'
                      }}
                      title={actionRes.value > 0 ? '点击消耗 [动作]' : '点击恢复 [动作]'}
                    >
                      ⚔️ {actionRes.value > 0 ? '可用动作' : '已用动作'}
                    </div>
                    <div 
                      onClick={() => handleToggleCardRes('附赠动作')}
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        padding: '4px 0',
                        height: '24px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: bonusRes.value > 0 ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: bonusRes.value > 0 ? 'var(--accent)' : 'var(--text-faint)',
                        border: `1px solid ${bonusRes.value > 0 ? 'rgba(139, 92, 246, 0.3)' : 'var(--line-hairline)'}`,
                        transition: 'all 0.2s',
                        userSelect: 'none'
                      }}
                      title={bonusRes.value > 0 ? '点击消耗 [附赠动作]' : '点击恢复 [附赠动作]'}
                    >
                      ⚡ {bonusRes.value > 0 ? '可用附赠' : '已用附赠'}
                    </div>
                  </div>
                );
              })()}

              {/* Other custom resources list */}
              {selectedTokenObj.resources && selectedTokenObj.resources.filter(r => r.name !== '动作' && r.name !== '附赠动作').length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  {selectedTokenObj.resources.filter(r => r.name !== '动作' && r.name !== '附赠动作').map((res, idx) => {
                    const realIndex = selectedTokenObj.resources.findIndex(r => r.name === res.name);
                    const handleAdjustCardResource = (amount) => {
                      setCharacters(prev => prev.map(c => {
                        if (c.id === selectedTokenObj.id) {
                          const updatedResources = (c.resources || []).map((r, rIdx) => {
                            if (rIdx === realIndex) {
                              const newVal = Math.max(0, Math.min(r.max, r.value + amount));
                              if (addLog && newVal !== r.value) {
                                addLog({
                                  type: 'COMBAT',
                                  content: `🔋 角色 [${c.name}] 在地图建议互动栏 ${amount > 0 ? '恢复' : '消耗'}了资源 **[${r.name}]**: ${r.value} -> **${newVal}** (上限: ${r.max})`,
                                  timestamp: new Date().toLocaleTimeString()
                                });
                              }
                              return { ...r, value: newVal };
                            }
                            return r;
                          });
                          return { ...c, resources: updatedResources };
                        }
                        return c;
                      }));
                    };

                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--line-hairline)' }}>
                        <span style={{ fontSize: '10px' }}>{res.name} ({res.value}/{res.max})</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => handleAdjustCardResource(-1)} className="btn btn-secondary" style={{ padding: '0 4px', fontSize: '9px', height: '16px', width: '16px' }}>-</button>
                          <button onClick={() => handleAdjustCardResource(1)} className="btn btn-secondary" style={{ padding: '0 4px', fontSize: '9px', height: '16px', width: '16px' }}>+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Conditions Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>🛡️ 状态管理:</span>
              
              {/* Render current conditions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '2px' }}>
                {selectedTokenObj.conditions && selectedTokenObj.conditions.map(cond => (
                  <span 
                    key={cond.id} 
                    style={{ 
                      fontSize: '9px', 
                      padding: '2px 5px', 
                      background: 'rgba(239, 68, 68, 0.15)', 
                      color: 'var(--pigment-madder)', 
                      borderRadius: '4px',
                      border: '1px solid rgba(239,68,68,0.3)',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    {cond.name}({cond.duration === 'permanent' ? '∞' : `${cond.duration}r`})
                    <button 
                      onClick={() => handleRemoveCondition(selectedTokenObj.id, cond.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--pigment-madder)', cursor: 'pointer', fontSize: '9px', fontWeight: 'bold', padding: 0 }}
                      title="清除状态"
                    >
                      ✕
                    </button>
                  </span>
                ))}

                {(!selectedTokenObj.conditions || selectedTokenObj.conditions.length === 0) && (
                  <span style={{ fontSize: '10px', color: 'var(--text-faint)', fontStyle: 'italic' }}>正常 (无特殊状态)</span>
                )}
              </div>

              {/* Add condition controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0,0,0,0.15)', padding: '6px', borderRadius: '6px', border: '1px solid var(--line-hairline)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '3px' }}>
                  {['眩晕', '倒地', '定身', '中毒', '致盲', '虚弱', '狂暴', '祝福'].map(condName => (
                    <button
                      key={condName}
                      type="button"
                      onClick={() => {
                        const rounds = prompt(`请输入 [${condName}] 持续回合数 (数字，或输入 permanent 为永久):`, '3');
                        if (rounds !== null) {
                          handleAddCondition(selectedTokenObj.id, condName, rounds);
                        }
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: '9px', padding: '2px 0', height: '18px', margin: 0, minWidth: 0, textAlign: 'center' }}
                    >
                      {condName}
                    </button>
                  ))}
                </div>

                {/* Hand-fill condition */}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    placeholder="手填自定义状态..."
                    id={`customCondMapInput_${selectedTokenObj.id}`}
                    className="input-text"
                    style={{ fontSize: '9px', padding: '2px 6px', height: '20px', flex: 1, background: 'rgba(255,255,255,0.01)' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        const name = e.target.value.trim();
                        const rounds = prompt(`请输入 [${name}] 持续回合数 (数字，或输入 permanent 为永久):`, '3');
                        if (rounds !== null) {
                          handleAddCondition(selectedTokenObj.id, name, rounds);
                        }
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById(`customCondMapInput_${selectedTokenObj.id}`);
                      if (input && input.value.trim()) {
                        const name = input.value.trim();
                        const rounds = prompt(`请输入 [${name}] 持续回合数 (数字，或输入 permanent 为永久):`, '3');
                        if (rounds !== null) {
                          handleAddCondition(selectedTokenObj.id, name, rounds);
                        }
                        input.value = '';
                      }
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '9px', padding: '0 6px', height: '20px', margin: 0, cursor: 'pointer' }}
                  >
                    加
                  </button>
                </div>
              </div>
            </div>

            {/* Remove from Map section */}
            <div style={{ borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '6px' }}>
              <button
                onClick={() => {
                  setCharacters(prev => prev.map(c => {
                    if (c.id === selectedTokenObj.id) {
                      return { ...c, mapId: null };
                    }
                    return c;
                  }));
                  if (addLog) {
                    addLog({
                      type: 'COMBAT',
                      content: `📍 角色 [${selectedTokenObj.name}] 已手动从地图移出。`,
                      timestamp: new Date().toLocaleTimeString()
                    });
                  }
                  setSelectedTokenId(null);
                }}
                className="btn"
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  fontSize: '11px',
                  color: 'var(--pigment-madder)',
                  background: 'rgba(248, 113, 113, 0.05)',
                  border: '1px solid rgba(248, 113, 113, 0.25)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(248, 113, 113, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.5)';
                  e.currentTarget.style.boxShadow = '0 0 8px rgba(248, 113, 113, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(248, 113, 113, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.25)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                📍 手动从地图移出
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Map Bottom Information Panel */}
      <div 
        style={{ 
          background: 'var(--surface-panel)', 
          padding: '10px 16px', 
          borderTop: '1px solid var(--line-hairline)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isTerrainEditMode ? (
            <span style={{ color: 'var(--accent)' }}>
              🚧 正在进行地图地形编辑：
              {terrainEditTool === 'paint_block' ? '🧱 阻挡刷子激活（按住鼠标左键并在地图上拖动绘制）' :
               terrainEditTool === 'paint_erase' ? '🧽 橡皮擦激活（按住鼠标左键并在阻挡格上拖动擦除）' :
               '🖐️ 漫游模式：可在地图上直接按住拖拽移动区域地形，或拖动其边缘/边角调节大小'}
            </span>
          ) : selectedTokenObj ? (
            <span>
              已选中: <strong style={{ color: 'var(--accent)' }}>{selectedTokenObj.name}</strong> 
              (位置: {selectedTokenObj.gridX || 0}ft, {selectedTokenObj.gridY || 0}ft)
            </span>
          ) : (
            <span style={{ color: 'var(--text-faint)' }}>点击地图上的棋子进行选中或拖动以改变位置</span>
          )}

          {/* Summon PC character tokens button */}
          {!isTerrainEditMode && unplacedPCs.length > 0 && (
            <button
              onClick={handleSummonCharacters}
              className="btn btn-primary"
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 0 8px rgba(168, 85, 247, 0.4)',
                border: '1px solid var(--accent)',
                animation: 'pulse 2s infinite',
                height: '24px'
              }}
              title={`一键将未在当前地图的 ${unplacedPCs.length} 个玩家角色召集到当前地图中央`}
            >
              <span>🧙 召回玩家角色 ({unplacedPCs.length})</span>
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)' }}>比例尺: 1格 = 1ft</span>
        </div>
      </div>

      {/* 先攻准备与参战选择模态窗 */}
      {showInitiativePrep && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(10, 11, 16, 0.75)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowInitiativePrep(false)}
        >
          <div 
            style={{
              width: '480px',
              maxHeight: '80vh',
              background: 'var(--surface-panel)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 25px rgba(168, 85, 247, 0.1)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              overflowY: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line-hairline)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: 'var(--text-body)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚔️ 发起遭遇战：勾选参战单位</span>
              </h3>
              <button 
                onClick={() => setShowInitiativePrep(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            {/* Characters List (Only those on current map) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 'bold' }}>选择参战成员 (自动加上先攻 Initiative 修正):</span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '40vh', overflowY: 'auto', paddingRight: '4px' }}>
                {characters.filter(c => c.mapId === activeMapId).map(c => {
                  const isChecked = !!tempParticipants[c.id];
                  return (
                    <div 
                      key={c.id} 
                      onClick={() => setTempParticipants(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: isChecked ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${isChecked ? 'rgba(168, 85, 247, 0.4)' : 'var(--line-hairline)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Click is handled by parent div
                          style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: '600', color: isChecked ? 'var(--text-body)' : 'var(--text-body)' }}>
                          {c.name}
                        </span>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: c.type === 'PC' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: c.type === 'PC' ? 'var(--pigment-woad)' : 'var(--pigment-madder)', fontWeight: 'bold' }}>
                          {c.type}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                          先攻修正: <strong style={{ color: 'var(--pigment-ochre)' }}>+{c.initiative || 0}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}

                {characters.filter(c => c.mapId === activeMapId).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-faint)', fontSize: '12px', fontStyle: 'italic' }}>
                    当前地图上没有放置任何角色 Token。请先从左侧列表拖动角色上图！
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--line-hairline)', paddingTop: '16px' }}>
              <button 
                type="button" 
                onClick={() => setShowInitiativePrep(false)}
                className="btn btn-secondary"
              >
                取消
              </button>
              <button 
                type="button" 
                onClick={handleRollAndStartCombat}
                className="btn btn-primary"
                style={{ background: 'var(--accent)' }}
                disabled={characters.filter(c => c.mapId === activeMapId).length === 0}
              >
                🎲 一键掷先攻并开战！
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
