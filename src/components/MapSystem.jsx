import React, { useState, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Map, ZoomIn, ZoomOut, RefreshCw, Eye, EyeOff, Paintbrush, Eraser, Compass, Plus, Trash2 } from 'lucide-react';

// A* Pathfinding algorithm for 8-directional shortest path on tactical grids
function findShortestPath(startX, startY, endX, endY, mapWidth, mapHeight, isBlocked, isDifficult) {
  if (startX === endX && startY === endY) {
    return [{ x: startX, y: startY }];
  }

  const toKey = (x, y) => `${x}_${y}`;
  const startKey = toKey(startX, startY);
  const endKey = toKey(endX, endY);

  if (startX < 0 || startX >= mapWidth || startY < 0 || startY >= mapHeight) return null;
  if (endX < 0 || endX >= mapWidth || endY < 0 || endY >= mapHeight) return null;

  const openSet = [];
  const closedSet = new Set();

  const gScore = { [startKey]: 0 };
  const fScore = { [startKey]: Math.hypot(endX - startX, endY - startY) };
  const cameFrom = {};

  openSet.push({ x: startX, y: startY, f: fScore[startKey] });

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();
    const currKey = toKey(current.x, current.y);

    if (current.x === endX && current.y === endY) {
      const path = [];
      let tempKey = currKey;
      while (tempKey in cameFrom) {
        const [x, y] = tempKey.split('_').map(Number);
        path.push({ x, y });
        tempKey = cameFrom[tempKey];
      }
      path.push({ x: startX, y: startY });
      path.reverse();
      return path;
    }

    closedSet.add(currKey);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;

        const nx = current.x + dx;
        const ny = current.y + dy;

        if (nx < 0 || nx >= mapWidth || ny < 0 || ny >= mapHeight) continue;

        const neighborKey = toKey(nx, ny);

        if (closedSet.has(neighborKey) || isBlocked(nx, ny)) continue;

        // Diagonal corner cutting check:
        // Prevent moving diagonally through a wall corner (if both orthogonal sides are blocked)
        if (dx !== 0 && dy !== 0) {
          if (isBlocked(current.x + dx, current.y) && isBlocked(current.x, current.y + dy)) {
            continue;
          }
        }

        let stepCost = (dx !== 0 && dy !== 0) ? Math.SQRT2 : 1.0;
        if (isDifficult && isDifficult(nx, ny)) {
          stepCost *= 2.0;
        }
        
        const tentativeGScore = gScore[currKey] + stepCost;

        if (gScore[neighborKey] === undefined || tentativeGScore < gScore[neighborKey]) {
          cameFrom[neighborKey] = currKey;
          gScore[neighborKey] = tentativeGScore;
          const h = Math.hypot(endX - nx, endY - ny);
          fScore[neighborKey] = tentativeGScore + h;

          const existing = openSet.find(item => item.x === nx && item.y === ny);
          if (existing) {
            existing.f = fScore[neighborKey];
          } else {
            openSet.push({ x: nx, y: ny, f: fScore[neighborKey] });
          }
        }
      }
    }
  }

  return null;
}

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
  isInCombat = false,
  setIsInCombat,
  combatRound = 1,
  setCombatRound,
  currentTurnIndex = 0,
  setCurrentTurnIndex,
  combatParticipants = [],
  setCombatParticipants,
  combatTurnOrder = [],
  setCombatTurnOrder
}) {
  const [gridSize, setGridSize] = useState(20); // 20px represents 1ft
  
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
  const blockedCells = activeMap.blockedCells || {};
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

  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [hoveredTokenId, setHoveredTokenId] = useState(null);
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);

  // Token dragging real-time measurement states
  const [draggedToken, setDraggedToken] = useState(null); // { id, startX, startY, name }
  const [dragHoverCoords, setDragHoverCoords] = useState(null); // { x, y }

  // Terrain editing states
  const [isTerrainEditMode, setIsTerrainEditMode] = useState(false);
  const [terrainEditTool, setTerrainEditTool] = useState('select'); // paint_block, paint_erase, select
  const [isPainting, setIsPainting] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState(null);
  const [defaultImpassable, setDefaultImpassable] = useState(false);

  // Turn-based Combat Local UI states
  const [showInitiativePrep, setShowInitiativePrep] = useState(false);
  const [tempParticipants, setTempParticipants] = useState({}); // { charId: boolean }
  const [manualInitiatives, setManualInitiatives] = useState({}); // { charId: number }
  const [showConditionPopupId, setShowConditionPopupId] = useState(null);

  // Map Property Configuration panel state
  const [showMapConfig, setShowMapConfig] = useState(false);

  // Forced Movement States
  const [isForcedMoveMode, setIsForcedMoveMode] = useState(false);
  const [dragIsShiftPressed, setDragIsShiftPressed] = useState(false);

  // Filter character tokens to render only those placed on the active map
  const activeTokens = characters.filter(char => char.mapId === activeMapId);

  // Identify players that are on other maps and eligible for summon
  const unplacedPCs = characters.filter(char => char.type === 'PC' && char.mapId !== activeMapId);

  const handleTokenDragStart = (e, tokenId) => {
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
  };

  const handleDrop = (e) => {
    e.preventDefault();
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
          let warningText = '';
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
    if (!isTerrainEditMode || terrainEditTool !== 'select') return;
    
    // Do not drag if clicking resize handle
    if (e.target.title && e.target.title.includes('改变')) {
      return;
    }

    e.stopPropagation();
    e.preventDefault();
    setEditingAreaId(area.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialGridX = area.gridX;
    const initialGridY = area.gridY;

    const handleMouseMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;
      
      const gridDx = Math.round(dx / gridSize);
      const gridDy = Math.round(dy / gridSize);

      const nextGridX = Math.max(0, Math.min(mapWidth - 1, initialGridX + gridDx));
      const nextGridY = Math.max(0, Math.min(mapHeight - 1, initialGridY + gridDy));

      handleUpdateArea(area.id, { gridX: nextGridX, gridY: nextGridY });
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
    if (!isTerrainEditMode || terrainEditTool !== 'select') return;
    e.stopPropagation();
    e.preventDefault();
    setEditingAreaId(area.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialWidth = area.width;
    const initialHeight = area.height;

    const handleMouseMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;

      const gridDx = Math.round(dx / gridSize);
      const gridDy = Math.round(dy / gridSize);

      const nextWidth = Math.max(1, initialWidth + gridDx);
      const nextHeight = Math.max(1, initialHeight + gridDy);

      handleUpdateArea(area.id, { width: nextWidth, height: nextHeight });
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
    if (!isTerrainEditMode || terrainEditTool !== 'select') return;
    e.stopPropagation();
    e.preventDefault();
    setEditingAreaId(area.id);

    const startX = e.clientX;
    const initialRadius = area.radius;

    const handleMouseMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startX) / scale;
      const gridDx = Math.round(dx / gridSize);

      const nextRadius = Math.max(1, initialRadius + gridDx);

      handleUpdateArea(area.id, { radius: nextRadius });
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
    if (!isTerrainEditMode) return;
    
    // Ignore clicks on token handles or form inputs
    if (e.target.closest('.token-node') || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') {
      return;
    }

    if (terrainEditTool === 'paint_block' || terrainEditTool === 'paint_erase') {
      e.preventDefault();
      setIsPainting(true);
      paintCellAtMouse(e);
    }
  };

  const handleMapMouseMove = (e) => {
    if (!isTerrainEditMode || !isPainting) return;
    paintCellAtMouse(e);
  };

  const handleMapMouseUp = () => {
    setIsPainting(false);
  };

  const handleMapMouseLeave = () => {
    setIsPainting(false);
  };

  const handleMapClick = (e) => {
    if (isTerrainEditMode) {
      // Clear select editing id if click was on empty space
      if (e.target === containerRef.current || e.target.style.backgroundImage) {
        setEditingAreaId(null);
      }
    }
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
      const cellKey = `${gridX}_${gridY}`;
      setBlockedCells(prev => {
        const next = { ...prev };
        if (terrainEditTool === 'paint_block') {
          next[cellKey] = true;
        } else if (terrainEditTool === 'paint_erase') {
          delete next[cellKey];
        }
        return next;
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

    const rolls = [];
    activeParticipantsIds.forEach(id => {
      const char = characters.find(c => c.id === id);
      if (char) {
        // Roll d20
        const d20 = Math.floor(Math.random() * 20) + 1;
        const modifier = char.initiative !== undefined ? char.initiative : 0;
        // Total initiative
        const total = d20 + modifier;
        rolls.push({
          id,
          roll: d20,
          modifier,
          total
        });

        // Trigger log
        if (addLog) {
          addLog({
            type: 'DICE',
            content: `🎲 先攻投掷: [${char.name}] 1d20(${d20}) + 修正(${modifier}) = **${total}**`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      }
    });

    // Sort order: initiative total descending. 
    // Tie breaker: Dexterity stats (Agility) descending. 
    // Second tie breaker: PCs before NPCs.
    rolls.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      
      const charA = characters.find(c => c.id === a.id);
      const charB = characters.find(c => c.id === b.id);
      const agilA = charA?.stats ? (charA.stats['敏捷 (Agility)'] || 10) : 10;
      const agilB = charB?.stats ? (charB.stats['敏捷 (Agility)'] || 10) : 10;
      if (agilB !== agilA) return agilB - agilA;

      const typeA = charA?.type === 'PC' ? 1 : 0;
      const typeB = charB?.type === 'PC' ? 1 : 0;
      return typeB - typeA;
    });

    // Reset each participant character's combat speeds, start grids, and turn resources
    setCharacters(prev => prev.map(c => {
      if (activeParticipantsIds.includes(c.id)) {
        const updatedResources = (c.resources || []).map(res => {
          if (res.resetType === 'turn') {
            return { ...res, value: res.max };
          }
          return res;
        });
        return {
          ...c,
          combatSpeedRemaining: c.speed !== undefined ? c.speed : 30,
          combatStartGridX: c.gridX !== undefined ? c.gridX : 2,
          combatStartGridY: c.gridY !== undefined ? c.gridY : 2,
          resources: updatedResources
        };
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

    let nextIndex = currentTurnIndex + 1;
    let nextRound = combatRound;

    // Check if round finishes and wraps to next round
    if (nextIndex >= combatTurnOrder.length) {
      nextIndex = 0;
      nextRound = combatRound + 1;
      setCombatRound(nextRound);

      // 1. Tick down and remove condition statuses on round transition
      setCharacters(prev => prev.map(c => {
        if (c.conditions && c.conditions.length > 0) {
          const tickedConditions = c.conditions.map(cond => {
            if (cond.duration === 'permanent') return cond;
            return { ...cond, duration: cond.duration - 1 };
          });

          // Check for expired ones
          const expired = tickedConditions.filter(cond => cond.duration <= 0);
          const active = tickedConditions.filter(cond => cond.duration > 0);

          if (expired.length > 0 && addLog) {
            expired.forEach(ex => {
              addLog({
                type: 'COMBAT',
                content: `🟢 状态消除：角色 [${c.name}] 身上的 [${ex.name}] 持续时间到期，状态已被完全清除。`,
                timestamp: new Date().toLocaleTimeString()
              });
            });
          }

          return { ...c, conditions: active };
        }
        return c;
      }));
    }

    setCurrentTurnIndex(nextIndex);

    const nextActiveId = combatTurnOrder[nextIndex]?.id;
    const nextChar = characters.find(c => c.id === nextActiveId);

    // 2. Refresh next active character's movement points & start grid anchors, and reset turn resources
    setCharacters(prev => prev.map(c => {
      if (c.id === nextActiveId) {
        const updatedResources = (c.resources || []).map(res => {
          if (res.resetType === 'turn') {
            return { ...res, value: res.max };
          }
          return res;
        });
        return {
          ...c,
          combatSpeedRemaining: c.speed !== undefined ? c.speed : 30,
          combatStartGridX: c.gridX !== undefined ? c.gridX : 2,
          combatStartGridY: c.gridY !== undefined ? c.gridY : 2,
          resources: updatedResources
        };
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

  const colorConfig = {
    red: { value: 'var(--accent-red)', bg: 'rgba(239, 68, 68, 0.15)', glow: 'rgba(239, 68, 68, 0.3)', label: '烈火/熔岩' },
    emerald: { value: 'var(--accent-emerald)', bg: 'rgba(16, 185, 129, 0.15)', glow: 'rgba(16, 185, 129, 0.3)', label: '剧毒/酸性' },
    blue: { value: 'var(--accent-blue)', bg: 'rgba(59, 130, 246, 0.15)', glow: 'rgba(59, 130, 246, 0.3)', label: '冰霜/深水' },
    amber: { value: 'var(--accent-amber)', bg: 'rgba(245, 158, 11, 0.15)', glow: 'rgba(245, 158, 11, 0.3)', label: '碎石/困难' },
    purple: { value: 'var(--accent-purple)', bg: 'rgba(139, 92, 246, 0.15)', glow: 'rgba(139, 92, 246, 0.3)', label: '法术/诅咒' },
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
  let dragPath = null;
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
      <div className="panel-header" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)', flexWrap: 'wrap', gap: '12px' }}>
        <div className="panel-title">
          <Map size={18} style={{ color: 'var(--accent-purple)' }} />
          <span>🗺 战术网格地图 (1格 = 1ft)</span>
        </div>

        {/* Map switching selector dropdown */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>当前地图:</label>
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
              background: 'var(--bg-tertiary)', 
              border: '1px solid var(--border-light)', 
              color: '#fff',
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
                    background: isForcedMoveMode ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'var(--bg-tertiary)',
                    border: isForcedMoveMode ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid var(--border-light)',
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
                style={{ fontSize: '11px', padding: '6px 12px', height: '30px', display: 'flex', alignItems: 'center', gap: '4px', background: 'linear-gradient(135deg, #a855f7, #6b21a8)' }}
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
            background: 'var(--bg-tertiary)',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.4)',
            zIndex: 5
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>重命名当前地图:</label>
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
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>宽度 (ft):</label>
              <input
                type="number"
                value={activeMap.width}
                onChange={(e) => updateMap(activeMap.id, { width: Math.max(10, parseInt(e.target.value, 10) || 40) })}
                className="input-text"
                style={{ width: '55px', padding: '4px 8px', fontSize: '11px', height: '28px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>高度 (ft):</label>
              <input
                type="number"
                value={activeMap.height}
                onChange={(e) => updateMap(activeMap.id, { height: Math.max(10, parseInt(e.target.value, 10) || 30) })}
                className="input-text"
                style={{ width: '55px', padding: '4px 8px', fontSize: '11px', height: '28px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '220px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>背景图片大图 URL (可选):</label>
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
            background: 'var(--bg-tertiary)', 
            padding: '10px 16px', 
            borderBottom: '1px solid var(--border-light)',
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
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>网格刷子:</span>
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
            </div>

            <div style={{ width: '1px', height: '16px', background: 'var(--border-light)' }} />

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>绘制区域:</span>
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
                  color: 'var(--text-secondary)', 
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px dashed var(--border-light)',
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
                  style={{ cursor: 'pointer', accentColor: 'var(--accent-red)' }}
                />
                <label htmlFor="defaultImpassableCheck" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }} title="勾选后，新建的图形地形默认具备实体阻挡障碍物属性，防止棋子穿过">
                  <span>🚫 默认阻挡</span>
                </label>
              </div>
            </div>

            <div style={{ marginLeft: 'auto' }}>
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
              border: '1px solid var(--border-light)' 
            }}>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
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
                        border: isEditing ? `1px solid ${color.value}` : '1px solid var(--border-light)',
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
                          style={{ fontSize: '11px', padding: '2px 4px', width: '120px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-light)', color: '#fff' }}
                          placeholder="地形名称"
                        />
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpdateArea(area.id, { isImpassable: !area.isImpassable }); }}
                            style={{ background: 'transparent', border: 'none', color: area.isImpassable ? 'var(--accent-red)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'transform 0.2s' }}
                            title={area.isImpassable ? '实体阻挡已开启 (阻断角色通行)' : '自由通行区域 (角色可自由穿过)'}
                          >
                            <span style={{ fontSize: '11px', transform: area.isImpassable ? 'scale(1.2)' : 'none', display: 'inline-block' }}>{area.isImpassable ? '🚫' : '🟢'}</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUpdateArea(area.id, { isSecret: !area.isSecret }); }}
                            style={{ background: 'transparent', border: 'none', color: area.isSecret ? 'var(--accent-purple)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title={area.isSecret ? '玩家不可见 (隐秘陷阱)' : '玩家可见'}
                          >
                            {area.isSecret ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteArea(area.id); }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="删除地形"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Dimensions controls */}
                      <div style={{ display: 'flex', gap: '6px', fontSize: '9px', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <span>X(ft):</span>
                          <input
                            type="number"
                            value={area.gridX}
                            onChange={(e) => handleUpdateArea(area.id, { gridX: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                            style={{ width: '28px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '9px', padding: '1px', borderRadius: '3px', textAlign: 'center' }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <span>Y(ft):</span>
                          <input
                            type="number"
                            value={area.gridY}
                            onChange={(e) => handleUpdateArea(area.id, { gridY: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                            style={{ width: '28px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '9px', padding: '1px', borderRadius: '3px', textAlign: 'center' }}
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
                                style={{ width: '28px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '9px', padding: '1px', borderRadius: '3px', textAlign: 'center' }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <span>高:</span>
                              <input
                                type="number"
                                value={area.height}
                                onChange={(e) => handleUpdateArea(area.id, { height: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                                style={{ width: '28px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '9px', padding: '1px', borderRadius: '3px', textAlign: 'center' }}
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
                              style={{ width: '28px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', color: '#fff', fontSize: '9px', padding: '1px', borderRadius: '3px', textAlign: 'center' }}
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
                          color: area.isImpassable ? 'var(--accent-red)' : 'var(--text-secondary)',
                          background: area.isImpassable ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                          border: `1px solid ${area.isImpassable ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-light)'}`,
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
                          style={{ cursor: 'pointer', accentColor: 'var(--accent-red)' }}
                        />
                        <span style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span>🚫</span> 实体阻挡障碍 (角色不可穿越)
                        </span>
                      </div>

                      {/* Color presets selection */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '9px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>灾害级:</span>
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
                                border: area.color === c ? '1px solid #fff' : 'none',
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
            height: '76px', 
            minHeight: '76px', 
            background: 'var(--bg-glass)', 
            backdropFilter: 'blur(16px)', 
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: '12px',
            overflow: 'visible',
            zIndex: 100,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            position: 'relative'
          }}
        >
          {/* Round Indicator */}
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRight: '1px solid var(--border-light)',
              paddingRight: '16px',
              height: '80%',
              minWidth: '70px'
            }}
          >
            <span style={{ fontSize: '10px', color: 'var(--accent-purple)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Round</span>
            <span style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: 'var(--font-heading)', color: '#fff', lineHeight: 1 }}>{combatRound}</span>
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
                      ? '1px solid var(--accent-purple)' 
                      : '1px solid var(--border-light)',
                    boxShadow: isActive ? '0 0 12px var(--accent-purple-glow)' : 'none',
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
                      background: isPC ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'linear-gradient(135deg, #ef4444, #b91c1c)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: '#fff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      border: isActive ? '2px solid var(--accent-amber)' : '1.5px solid rgba(255,255,255,0.4)',
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
                          color: isActive ? '#fff' : 'var(--text-primary)',
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
                            background: 'var(--accent-amber)', 
                            color: '#000', 
                            padding: '1px 3px', 
                            borderRadius: '3px', 
                            fontWeight: '800' 
                          }}
                        >
                          ACTIVE
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: 'var(--text-secondary)' }}>
                      <span>先攻: <strong>{participant.total}</strong></span>
                      <span>🏃 <strong>{char.combatSpeedRemaining !== undefined ? char.combatSpeedRemaining.toFixed(0) : (char.speed || 30)}</strong>/{char.speed || 30}ft</span>
                    </div>
                  </div>
                </div>
              );
            })}
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
                    borderLeft: '1px solid var(--border-light)',
                    paddingLeft: '16px',
                    height: '80%',
                    marginLeft: 'auto'
                  }}
                >
                  {/* Current conditions listing & Add Condition popover */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold' }}>状态:</span>
                    
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap', overflowX: 'auto', maxWidth: '120px' }}>
                      {activeChar.conditions && activeChar.conditions.map(cond => (
                        <span 
                          key={cond.id} 
                          style={{ 
                            fontSize: '10px', 
                            padding: '2px 6px', 
                            background: 'rgba(239, 68, 68, 0.15)', 
                            color: 'var(--accent-red)', 
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
                            style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '9px', fontWeight: 'bold', padding: 0 }}
                          >
                            ✕
                          </button>
                        </span>
                      ))}

                      {(!activeChar.conditions || activeChar.conditions.length === 0) && (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>正常</span>
                      )}
                    </div>


                  </div>

                  {/* Active Unit Resources trackers (Spell slots, actions, etc) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--border-light)', paddingLeft: '12px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold' }}>资源槽:</span>
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', maxWidth: '200px' }}>
                      {activeChar.resources && activeChar.resources.map((res, resIdx) => (
                        <div 
                          key={resIdx}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border-light)',
                            borderRadius: '8px',
                            padding: '2px 6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            height: '28px',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 0 8px rgba(192, 132, 252, 0.1)'
                          }}
                        >
                          <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{res.name}</span>
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
                              style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', width: '14px', height: '14px', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}
                            >
                              -
                            </button>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--accent-purple)' }}>{res.value}</span>
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
                              style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', width: '14px', height: '14px', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px' }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}

                      {(!activeChar.resources || activeChar.resources.length === 0) && (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>无资源槽</span>
                      )}
                    </div>
                  </div>

                  {/* Turn Controls */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', borderLeft: '1px solid var(--border-light)', paddingLeft: '12px' }}>
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
                      style={{ fontSize: '11px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', height: '30px', background: 'linear-gradient(135deg, #10b981, #059669)' }}
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
        style={{ flex: 1, position: 'relative', background: '#07080c', display: 'flex', overflow: 'hidden' }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <TransformWrapper
          initialScale={1}
          initialPositionX={0}
          initialPositionY={0}
          minScale={0.25}
          maxScale={4}
          onTransformed={handleTransform}
          onZoom={handleTransform}
          panning={{ disabled: isTerrainEditMode && (terrainEditTool === 'paint_block' || terrainEditTool === 'paint_erase') }}
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
                <button onClick={() => zoomIn()} className="btn btn-secondary btn-icon-only" style={{ background: 'var(--bg-glass)' }}><ZoomIn size={16} /></button>
                <button onClick={() => zoomOut()} className="btn btn-secondary btn-icon-only" style={{ background: 'var(--bg-glass)' }}><ZoomOut size={16} /></button>
                <button onClick={() => resetTransform()} className="btn btn-secondary btn-icon-only" style={{ background: 'var(--bg-glass)' }}><RefreshCw size={14} /></button>
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
                    backgroundImage: mapBgUrl ? `url(${mapBgUrl})` : 'none',
                    backgroundSize: 'cover',
                    backgroundColor: '#0a0c14',
                    boxShadow: '0 0 40px rgba(0, 0, 0, 0.8)',
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

                  {/* Render Impassable Blocked Cells */}
                  {Object.keys(blockedCells).map(key => {
                    const [xStr, yStr] = key.split('_');
                    const cx = parseInt(xStr, 10);
                    const cy = parseInt(yStr, 10);
                    
                    // Boundary control
                    if (cx >= mapWidth || cy >= mapHeight) return null;

                    return (
                      <div
                        key={key}
                        style={{
                          position: 'absolute',
                          left: `${cx * gridSize}px`,
                          top: `${cy * gridSize}px`,
                          width: `${gridSize}px`,
                          height: `${gridSize}px`,
                          background: 'repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.2) 3px, rgba(239, 68, 68, 0.45) 3px, rgba(239, 68, 68, 0.45) 6px)',
                          border: '1px solid rgba(239, 68, 68, 0.7)',
                          boxShadow: 'inset 0 0 4px rgba(239, 68, 68, 0.4)',
                          pointerEvents: 'none',
                          zIndex: 1
                        }}
                        title="无法通过的阻挡网格"
                      />
                    );
                  })}

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
                              ? `2px solid ${area.isImpassable ? 'var(--accent-red)' : color.value}` 
                              : `2px ${area.isImpassable ? 'solid' : 'dashed'} ${area.isImpassable ? 'var(--accent-red)' : color.value}`,
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
                            color: '#fff',
                            background: 'rgba(10, 12, 20, 0.85)',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            border: `1px solid ${area.isImpassable ? 'var(--accent-red)' : color.value}`,
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
                                border: '1px solid #fff',
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
                              ? `2px solid ${area.isImpassable ? 'var(--accent-red)' : color.value}` 
                              : `2px ${area.isImpassable ? 'solid' : 'dashed'} ${area.isImpassable ? 'var(--accent-red)' : color.value}`,
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
                            color: '#fff',
                            background: 'rgba(10, 12, 20, 0.85)',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            border: `1px solid ${area.isImpassable ? 'var(--accent-red)' : color.value}`,
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
                                border: '1px solid #fff',
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
                        stroke="var(--accent-purple)"
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
                        stroke="var(--accent-purple)"
                        strokeWidth="1"
                      />
                      <text
                        x={((selectedTokenObj.gridX || 0) + (hoveredTokenObj.gridX || 0)) * gridSize / 2 + 38}
                        y={((selectedTokenObj.gridY || 0) + (hoveredTokenObj.gridY || 0)) * gridSize / 2 + 5}
                        fill="#fff"
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
                      const pathColor = isForced ? '#22d3ee' : (dragPathExists ? 'var(--accent-purple)' : 'var(--accent-red)');
                      const pathBgColor = isForced ? 'rgba(34, 211, 238, 0.05)' : (dragPathExists ? 'rgba(168, 85, 247, 0.05)' : 'rgba(239, 68, 68, 0.05)');
                      const pathBgColorHover = isForced ? 'rgba(34, 211, 238, 0.1)' : (dragPathExists ? 'rgba(168, 85, 247, 0.1)' : 'rgba(239, 68, 68, 0.1)');
                      const pathDashedColor = isForced ? '#cffafe' : '#e9d5ff';

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
                                  stroke="var(--accent-red)"
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
                                  stroke="var(--accent-red)"
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
                              color: '#fff',
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
                                <span style={{ color: '#22d3ee' }}>强制位移: {dragPathDistance.toFixed(1)} ft</span>
                              </>
                            ) : dragPathExists ? (
                              <>
                                <span style={{ fontSize: '11px' }}>👣</span>
                                <span>已移动: {dragPathDistance.toFixed(1)} ft</span>
                              </>
                            ) : dragIsNonActiveCombatMove ? (
                              <>
                                <span style={{ fontSize: '11px' }}>⚠️</span>
                                <span style={{ color: 'var(--accent-red)' }}>非当前行动回合 (当前为: {dragActiveCharName})</span>
                              </>
                            ) : dragIsSpeedExceeded ? (
                              <>
                                <span style={{ fontSize: '11px' }}>❌</span>
                                <span style={{ color: 'var(--accent-red)' }}>移动力不足 (剩余: {dragSpeedRemaining.toFixed(1)} ft, 需: {dragPathDistance.toFixed(1)} ft)</span>
                              </>
                            ) : (
                              <>
                                <span style={{ fontSize: '11px' }}>⚠️</span>
                                <span style={{ color: 'var(--accent-red)' }}>路线受阻 (直线: {dragPathDistance.toFixed(1)} ft)</span>
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
                          border: selectedTokenId === char.id ? '2px solid var(--accent-purple)' : '2px solid #fff',
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
        {selectedTokenObj && (
          <div 
            style={{
              position: 'absolute',
              bottom: '16px',
              right: '16px',
              width: '300px',
              maxHeight: '85%',
              background: 'var(--bg-glass)',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-light)', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ 
                  fontWeight: 'bold', 
                  fontSize: '14px', 
                  color: selectedTokenObj.type === 'PC' ? 'var(--accent-blue)' : 'var(--accent-red)',
                  fontFamily: 'var(--font-heading)'
                }}>
                  👤 {selectedTokenObj.name}
                </span>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                  ({selectedTokenObj.type} | {selectedTokenObj.class || '无职业'} | {selectedTokenObj.gridX || 0}ft, {selectedTokenObj.gridY || 0}ft)
                </span>
              </div>
              <button 
                onClick={() => setSelectedTokenId(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
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
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>❤️ 生命值 (HP):</span>
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
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>🔋 战斗动作与资源:</span>
              
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
                        color: actionRes.value > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)',
                        border: `1px solid ${actionRes.value > 0 ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-light)'}`,
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
                        color: bonusRes.value > 0 ? 'var(--accent-purple)' : 'var(--text-muted)',
                        border: `1px solid ${bonusRes.value > 0 ? 'rgba(139, 92, 246, 0.3)' : 'var(--border-light)'}`,
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
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>
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
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>🛡️ 状态管理:</span>
              
              {/* Render current conditions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '2px' }}>
                {selectedTokenObj.conditions && selectedTokenObj.conditions.map(cond => (
                  <span 
                    key={cond.id} 
                    style={{ 
                      fontSize: '9px', 
                      padding: '2px 5px', 
                      background: 'rgba(239, 68, 68, 0.15)', 
                      color: 'var(--accent-red)', 
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
                      style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '9px', fontWeight: 'bold', padding: 0 }}
                      title="清除状态"
                    >
                      ✕
                    </button>
                  </span>
                ))}

                {(!selectedTokenObj.conditions || selectedTokenObj.conditions.length === 0) && (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>正常 (无特殊状态)</span>
                )}
              </div>

              {/* Add condition controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0,0,0,0.15)', padding: '6px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
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
          </div>
        )}
      </div>

      {/* Map Bottom Information Panel */}
      <div 
        style={{ 
          background: 'var(--bg-secondary)', 
          padding: '10px 16px', 
          borderTop: '1px solid var(--border-light)',
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
            <span style={{ color: 'var(--accent-purple)' }}>
              🚧 正在进行地图地形编辑：
              {terrainEditTool === 'paint_block' ? '🧱 阻挡刷子激活（按住鼠标左键并在地图上拖动绘制）' :
               terrainEditTool === 'paint_erase' ? '🧽 橡皮擦激活（按住鼠标左键并在阻挡格上拖动擦除）' :
               '🖐️ 漫游模式：可在地图上直接按住拖拽移动区域地形，或拖动其边缘/边角调节大小'}
            </span>
          ) : selectedTokenObj ? (
            <span>
              已选中: <strong style={{ color: 'var(--accent-purple)' }}>{selectedTokenObj.name}</strong> 
              (位置: {selectedTokenObj.gridX || 0}ft, {selectedTokenObj.gridY || 0}ft)
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>点击地图上的棋子进行选中或拖动以改变位置</span>
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
                border: '1px solid var(--accent-purple)',
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
          <span style={{ color: 'var(--text-secondary)' }}>比例尺: 1格 = 1ft</span>
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
              background: 'var(--bg-secondary)',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚔️ 发起遭遇战：勾选参战单位</span>
              </h3>
              <button 
                onClick={() => setShowInitiativePrep(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            {/* Characters List (Only those on current map) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--accent-purple)', fontWeight: 'bold' }}>选择参战成员 (自动加上先攻 Initiative 修正):</span>
              
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
                        border: `1px solid ${isChecked ? 'rgba(168, 85, 247, 0.4)' : 'var(--border-light)'}`,
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
                          style={{ accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: '600', color: isChecked ? '#fff' : 'var(--text-primary)' }}>
                          {c.name}
                        </span>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: c.type === 'PC' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: c.type === 'PC' ? 'var(--accent-blue)' : 'var(--accent-red)', fontWeight: 'bold' }}>
                          {c.type}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          先攻修正: <strong style={{ color: 'var(--accent-amber)' }}>+{c.initiative || 0}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}

                {characters.filter(c => c.mapId === activeMapId).length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                    当前地图上没有放置任何角色 Token。请先从左侧列表拖动角色上图！
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
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
                style={{ background: 'linear-gradient(135deg, #a855f7, #6b21a8)' }}
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
