import React, { useState } from 'react';
import { Users, UserPlus, Heart, FileText, Settings, ShieldAlert, Award, Trash2, Plus, Minus, Shield, FolderPlus, Folder } from 'lucide-react';

function CharacterList({ 
  characters, 
  setCharacters, 
  addLog, 
  onOpenAddCharModal, 
  onOpenEditCharModal, 
  onDuplicateChar, 
  groups = [], 
  setGroups,
  isInCombat = false,
  combatTurnOrder = [],
  currentTurnIndex = 0,
  onOpenRestModal,
  customAttributeLabels = {}
}) {
  const [expandedCharId, setExpandedCharId] = useState(null);
  
  // Custom Character Grouping states
  const [newGroupName, setNewGroupName] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [dragOverGroupId, setDragOverGroupId] = useState(null);

  const getCharGroupId = (char) => {
    if (char.groupId) return char.groupId;
    return char.type === 'PC' ? 'group_pcs' : 'group_npcs';
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    
    // Check if group name already exists
    if (groups.some(g => g.name.toLowerCase() === newGroupName.trim().toLowerCase())) {
      alert(`⚠️ 分组 [${newGroupName.trim()}] 已经存在！`);
      return;
    }

    const newGroup = {
      id: 'group_' + Date.now(),
      name: newGroupName.trim()
    };
    
    setGroups(prev => [...prev, newGroup]);
    setNewGroupName('');
    
    if (addLog) {
      addLog({
        type: 'SYSTEM',
        content: `📂 **创建了新角色分组**: [${newGroup.name}]`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const handleDeleteGroup = (groupId, groupName) => {
    if (window.confirm(`🚨 删除分组确认 🚨\n确定要永久删除自定义分组 [${groupName}] 吗？\n该分组内的所有角色/怪物不会被删除，而是会自动安全退回到它们的默认分组（PC 归入“玩家成员”，NPC 归入“怪物与NPC”）。`)) {
      setGroups(prev => prev.filter(g => g.id !== groupId));
      
      // Safety update characters back to default groups
      setCharacters(prev => prev.map(c => {
        if (c.groupId === groupId) {
          const { groupId: _, ...rest } = c; // remove groupId so it falls back to type default
          return rest;
        }
        return c;
      }));

      if (addLog) {
        addLog({
          type: 'SYSTEM',
          content: `🗑️ **删除了分组**: [${groupName}]，该组内的角色已自动退回默认分类。`,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }
  };

  const handleDropOnGroup = (e, groupId) => {
    e.preventDefault();
    const charId = e.dataTransfer.getData('text/plain');
    if (!charId) return;

    setCharacters(prev => prev.map(c => {
      if (c.id === charId) {
        if (c.groupId === groupId) return c; // No actual change

        const targetGroup = groups.find(g => g.id === groupId);
        const groupName = targetGroup ? targetGroup.name : '未知分组';

        if (addLog) {
          addLog({
            type: 'COMBAT',
            content: `📂 **调整角色分组**: 角色 [${c.name}] 已移动至分组 **[${groupName}]**`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
        return { ...c, groupId };
      }
      return c;
    }));
  };

  const toggleGroupCollapse = (groupId) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // States for adding resources & feats directly on existing cards
  const [cardResName, setCardResName] = useState('');
  const [cardResMax, setCardResMax] = useState(4);
  const [cardResResetType, setCardResResetType] = useState('long_rest');
  const [newFeatName, setNewFeatName] = useState('');
  const [newFeatDesc, setNewFeatDesc] = useState('');

  const handleToggleQuickResource = (charId, resName, e) => {
    e.stopPropagation(); // Prevent card expansion
    setCharacters(prev => prev.map(c => {
      if (c.id === charId) {
        const updated = (c.resources || []).map(r => {
          if (r.name === resName) {
            const newVal = r.value > 0 ? 0 : 1;
            if (addLog) {
              addLog({
                type: 'COMBAT',
                content: `🔋 角色 [${c.name}] ${newVal > 0 ? '充能' : '消耗'}了资源 **[${resName}]**: ${r.value} -> **${newVal}** (上限: ${r.max})`,
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

  const handleUpdateStat = (charId, statKey, newValue) => {
    const val = parseInt(newValue, 10);
    if (isNaN(val)) return;
    setCharacters(prev => prev.map(c => {
      if (c.id === charId) {
        const updatedStats = { ...c.stats, [statKey]: val };
        return { ...c, stats: updatedStats };
      }
      return c;
    }));
  };

  const handleUpdateBasicInfo = (charId, field, value) => {
    setCharacters(prev => prev.map(c => {
      if (c.id === charId) {
        let updatedVal = value;
        if (field === 'maxHp') {
          updatedVal = parseInt(value, 10);
          if (isNaN(updatedVal) || updatedVal < 1) return c;
          const newHp = Math.min(c.hp, updatedVal);
          return { ...c, maxHp: updatedVal, hp: newHp };
        }
        return { ...c, [field]: updatedVal };
      }
      return c;
    }));
  };

  const handleLevelChange = (char, direction) => {
    const diceSize = parseInt((char.hitDice || 'd8').replace('d', ''), 10) || 8;
    
    if (direction === 1) {
      // Level Up
      const rolledHp = Math.floor(Math.random() * diceSize) + 1;
      const nextLevel = (char.level || 1) + 1;
      
      setCharacters(prev => prev.map(c => {
        if (c.id === char.id) {
          const newHistory = [...(c.levelHpIncreases || []), rolledHp];
          return {
            ...c,
            level: nextLevel,
            maxHp: c.maxHp + rolledHp,
            hp: c.hp + rolledHp,
            levelHpIncreases: newHistory
          };
        }
        return c;
      }));

      if (addLog) {
        addLog({
          type: 'COMBAT',
          content: `👤 **角色升级**: **[${char.type}] ${char.name}** 提升至 **等级 ${nextLevel}**！生命骰 (${char.hitDice || 'd8'}) 掷出了 **${rolledHp}**，最大生命值从 ${char.maxHp} 提升至 ${char.maxHp + rolledHp}。`,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    } else if (direction === -1) {
      // Level Down
      const currentLevel = char.level || 1;
      if (currentLevel <= 1) {
        alert('⚠️ 角色等级不能低于 1 级！');
        return;
      }
      
      const nextLevel = currentLevel - 1;
      const history = [...(char.levelHpIncreases || [])];
      
      // Pop the last value, fallback to average roll if history is empty
      const rolledHp = history.length > 0 ? history.pop() : (Math.round(diceSize / 2) + 1);
      
      setCharacters(prev => prev.map(c => {
        if (c.id === char.id) {
          const newHistory = [...(c.levelHpIncreases || [])];
          newHistory.pop(); // remove last rolled HP
          const newMax = Math.max(1, c.maxHp - rolledHp);
          const newHp = Math.max(1, c.hp - rolledHp);
          return {
            ...c,
            level: nextLevel,
            maxHp: newMax,
            hp: newHp,
            levelHpIncreases: newHistory
          };
        }
        return c;
      }));

      if (addLog) {
        addLog({
          type: 'COMBAT',
          content: `👤 **等级回滚**: **[${char.type}] ${char.name}** 回滚至 **等级 ${nextLevel}**。撤销了上次升级，最大生命值减少了 ${rolledHp}，恢复为 ${Math.max(1, char.maxHp - rolledHp)}。`,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }
  };

  const handleAddFeat = (charId) => {
    if (!newFeatName.trim()) return;
    setCharacters(prev => prev.map(c => {
      if (c.id === charId) {
        const desc = newFeatDesc.trim() || '无特殊能力描述';
        const updatedFeats = { ...c.feats, [newFeatName.trim()]: desc };
        
        if (addLog) {
          addLog({
            type: 'COMBAT',
            content: `⚡ 角色 [${c.name}] 新增了特质/技能: **${newFeatName.trim()}** - *${desc}*`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
        
        return { ...c, feats: updatedFeats };
      }
      return c;
    }));
    setNewFeatName('');
    setNewFeatDesc('');
  };

  const handleDeleteFeat = (charId, featName) => {
    setCharacters(prev => prev.map(c => {
      if (c.id === charId) {
        const updatedFeats = { ...c.feats };
        delete updatedFeats[featName];
        
        if (addLog) {
          addLog({
            type: 'COMBAT',
            content: `🗑️ 角色 [${c.name}] 移除了特质/技能: **${featName}**`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
        
        return { ...c, feats: updatedFeats };
      }
      return c;
    }));
  };

  // Adjust Dynamic Resource value (Spell Slots, Ki, etc.) directly on expanded card
  const handleAdjustResource = (charId, resIndex, amount) => {
    setCharacters(prev => prev.map(c => {
      if (c.id === charId) {
        const updatedResources = (c.resources || []).map((r, idx) => {
          if (idx === resIndex) {
            const newVal = Math.max(0, Math.min(r.max, r.value + amount));
            if (addLog && newVal !== r.value) {
              addLog({
                type: 'COMBAT',
                content: `🔋 角色 [${c.name}] ${amount > 0 ? '恢复' : '消耗'}了资源槽 **[${r.name}]**: ${r.value} -> **${newVal}** (上限: ${r.max})`,
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

  // Add new dynamic resource slot directly to an existing card
  const handleAddResourceToCard = (charId) => {
    if (!cardResName.trim()) return;
    const maxVal = Math.max(1, parseInt(cardResMax, 10) || 4);
    setCharacters(prev => prev.map(c => {
      if (c.id === charId) {
        const list = c.resources || [];
        const updated = [...list, { 
          name: cardResName.trim(), 
          max: maxVal, 
          value: maxVal,
          resetType: cardResResetType
        }];
        if (addLog) {
          addLog({
            type: 'COMBAT',
            content: `🔋 角色 [${c.name}] 新增了资源槽追踪 **[${cardResName.trim()}]** (上限: ${maxVal}, 重置: ${cardResResetType === 'turn' ? '每回合' : cardResResetType === 'short_rest' ? '短休' : '长休'})`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
        return { ...c, resources: updated };
      }
      return c;
    }));
    setCardResName('');
    setCardResMax(4);
    setCardResResetType('long_rest');
  };

  // Remove a dynamic resource slot from an existing card
  const handleDeleteResource = (charId, resIndex, resName) => {
    if (window.confirm(`确定要物理移除角色 [${characters.find(c => c.id === charId)?.name}] 的资源槽 [${resName}] 吗？`)) {
      setCharacters(prev => prev.map(c => {
        if (c.id === charId) {
          const updated = (c.resources || []).filter((_, idx) => idx !== resIndex);
          if (addLog) {
            addLog({
              type: 'COMBAT',
              content: `🗑️ 角色 [${c.name}] 移除了资源槽追踪 **[${resName}]**`,
              timestamp: new Date().toLocaleTimeString()
            });
          }
          return { ...c, resources: updated };
        }
        return c;
      }));
    }
  };

  const handleAddConditionCard = (charId, name, durationStr) => {
    const duration = durationStr === 'permanent' ? 'permanent' : parseInt(durationStr, 10) || 3;
    const newCond = {
      id: 'cond_' + Date.now() + Math.floor(Math.random() * 1000),
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
        content: `🩸 **状态变更**: 为 [${char ? char.name : '未知'}] 附加了特殊状态 **[${name}]** (${duration === 'permanent' ? '永久' : `持续 ${duration} 回合`})。`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const handleRemoveConditionCard = (charId, condId) => {
    setCharacters(prev => prev.map(c => {
      if (c.id === charId) {
        const removed = c.conditions.find(cond => cond.id === condId);
        const filtered = (c.conditions || []).filter(cond => cond.id !== condId);
        if (removed && addLog) {
          addLog({
            type: 'COMBAT',
            content: `🟢 **状态消除**: 手动清除了 [${c.name}] 身上的特殊状态 **[${removed.name}]**。`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
        return { ...c, conditions: filtered };
      }
      return c;
    }));
  };

  const handleDeleteCharacter = (charId, charName) => {
    if (window.confirm(`确定要彻底从本战役中移除角色/NPC [${charName}] 吗？`)) {
      setCharacters(prev => prev.filter(c => c.id !== charId));
      if (addLog) {
        addLog({
          type: 'COMBAT',
          content: `🗑️ 彻底移除了角色: **${charName}**`,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }
  };

  const handleRemoveFromMap = (charId, charName) => {
    setCharacters(prev => prev.map(c => {
      if (c.id === charId) {
        return { ...c, mapId: null };
      }
      return c;
    }));
    if (addLog) {
      addLog({
        type: 'COMBAT',
        content: `📍 角色 [${charName}] 已手动从地图移出。`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const adjustHp = (charId, amount) => {
    setCharacters(prev => {
      return prev.map(c => {
        if (c.id === charId) {
          const temp = c.tempHp || 0;
          let newHp = c.hp;
          let newTempHp = temp;

          if (amount < 0) {
            // Damage: absorb via temp HP first
            const damage = Math.abs(amount);
            if (newTempHp >= damage) {
              newTempHp -= damage;
            } else {
              const remainingDamage = damage - newTempHp;
              newTempHp = 0;
              newHp = Math.max(0, newHp - remainingDamage);
            }
          } else {
            // Healing: only heals actual HP up to maxHp
            newHp = Math.max(0, Math.min(c.maxHp, c.hp + amount));
          }
          
          if (addLog && (newHp !== c.hp || newTempHp !== temp)) {
            let logMsg = `❤️ 角色 [${c.name}] HP 变更: `;
            if (temp > 0 || newTempHp > 0) {
              logMsg += `生命值 **${c.hp}** (+${temp} 临时) -> **${newHp}** (+${newTempHp} 临时) (最大生命: ${c.maxHp})`;
            } else {
              logMsg += `**${c.hp}** -> **${newHp}** (最大值: ${c.maxHp})`;
            }
            addLog({
              type: 'COMBAT',
              content: logMsg,
              timestamp: new Date().toLocaleTimeString()
            });
          }

          return { ...c, hp: newHp, tempHp: newTempHp };
        }
        return c;
      });
    });
  };

  const toggleExpand = (id) => {
    setExpandedCharId(id === expandedCharId ? null : id);
  };

  return (
    <div className="glass-panel panel-content" style={{ height: '100%', overflowY: 'auto' }}>
      <div className="panel-title">
        <Users size={18} style={{ color: 'var(--accent-purple)' }} />
        <span>👥 角色列表与生命追踪</span>
      </div>

      {/* 1. Modal trigger button (Calls Root-level App.jsx Modal) */}
      <button 
        onClick={onOpenAddCharModal}
        className="btn btn-primary"
        style={{
          width: '100%',
          height: '38px',
          justifyContent: 'center',
          marginBottom: '8px',
          border: '1px solid rgba(192, 132, 252, 0.3)',
          boxShadow: '0 0 10px rgba(192, 132, 252, 0.1)',
          cursor: 'pointer'
        }}
      >
        <UserPlus size={16} />
        <span>➕ 新建战役角色 / 怪物</span>
      </button>

      {/* Rest & Recovery Buttons Row */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        <button
          onClick={() => onOpenRestModal && onOpenRestModal('short')}
          className="btn btn-secondary"
          style={{
            flex: 1,
            height: '28px',
            justifyContent: 'center',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            background: 'rgba(59, 130, 246, 0.05)',
            fontSize: '11px',
            cursor: 'pointer',
            margin: 0
          }}
          title="对选中的角色进行短休（恢复50%生命值，充能重置短休/回合资源）"
        >
          <span>⏳ 队伍短休</span>
        </button>
        <button
          onClick={() => onOpenRestModal && onOpenRestModal('long')}
          className="btn btn-secondary"
          style={{
            flex: 1,
            height: '28px',
            justifyContent: 'center',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            background: 'rgba(168, 85, 247, 0.05)',
            fontSize: '11px',
            cursor: 'pointer',
            margin: 0
          }}
          title="对选中的角色进行长休（恢复全部生命值/资源槽，重置移动力，且彻底清除负面状态）"
        >
          <span>💤 队伍长休</span>
        </button>
      </div>

      {/* 1.5 Group Creator Input Bar */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '16px',
        alignItems: 'center',
        background: 'rgba(0,0,0,0.15)',
        padding: '6px 10px',
        borderRadius: '8px',
        border: '1px solid var(--border-light)'
      }}>
        <input 
          type="text" 
          placeholder="📁 新建分组名称 (如: 地牢伏兵)..." 
          value={newGroupName}
          onChange={e => setNewGroupName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleCreateGroup();
          }}
          style={{
            flex: 1,
            height: '28px',
            fontSize: '11px',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--border-light)',
            borderRadius: '4px',
            padding: '0 8px',
            color: 'var(--text-primary)',
            outline: 'none'
          }}
        />
        <button 
          onClick={handleCreateGroup}
          className="btn btn-secondary"
          style={{
            height: '28px',
            padding: '0 10px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            margin: 0,
            cursor: 'pointer'
          }}
          title="创建新角色分组"
        >
          <FolderPlus size={12} />
          <span>新建</span>
        </button>
      </div>

      {/* 2. Characters Group List with drag drop zones and health bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {groups.map(group => {
          const groupChars = characters.filter(c => getCharGroupId(c) === group.id);
          const isCollapsed = collapsedGroups[group.id];
          const isDragOver = dragOverGroupId === group.id;

          return (
            <div 
              key={group.id} 
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverGroupId !== group.id) setDragOverGroupId(group.id);
              }}
              onDragLeave={() => {
                setDragOverGroupId(null);
              }}
              onDrop={(e) => {
                setDragOverGroupId(null);
                handleDropOnGroup(e, group.id);
              }}
              style={{
                border: isDragOver ? '2px dashed var(--accent-purple)' : '1px solid rgba(255,255,255,0.03)',
                background: isDragOver ? 'rgba(192, 132, 252, 0.06)' : 'rgba(18, 20, 28, 0.25)',
                boxShadow: isDragOver ? '0 0 15px rgba(192, 132, 252, 0.15)' : 'none',
                borderRadius: '10px',
                padding: '10px',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              {/* Group Header */}
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                  paddingBottom: isCollapsed ? '0px' : '8px',
                  borderBottom: isCollapsed ? 'none' : '1px dashed rgba(255,255,255,0.06)'
                }}
                onClick={() => toggleGroupCollapse(group.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '12px', textAlign: 'center' }}>
                    {isCollapsed ? '▶' : '▼'}
                  </span>
                  <span style={{ 
                    fontWeight: '700', 
                    fontSize: '12px', 
                    color: group.id === 'group_pcs' ? 'var(--accent-blue)' : group.id === 'group_npcs' ? 'var(--accent-red)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-heading)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Folder size={13} style={{ opacity: 0.7 }} />
                    {group.name}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    background: 'rgba(255,255,255,0.06)',
                    padding: '1px 5px',
                    borderRadius: '8px',
                    color: 'var(--text-muted)',
                    fontWeight: 'bold'
                  }}>
                    {groupChars.length}
                  </span>
                </div>

                {/* If it's a custom group, allow deleting it */}
                {group.id !== 'group_pcs' && group.id !== 'group_npcs' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(group.id, group.name);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'color 0.2s ease'
                    }}
                    className="delete-group-btn"
                    title="删除此分组（分组内角色将退回到默认分组）"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              {/* Group Characters List */}
              {!isCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                  {groupChars.length === 0 ? (
                    <div style={{ 
                      padding: '16px 10px', 
                      textAlign: 'center', 
                      color: 'var(--text-muted)', 
                      fontSize: '11px',
                      fontStyle: 'italic',
                      border: '1px dashed rgba(255,255,255,0.03)',
                      borderRadius: '6px',
                      background: 'rgba(0,0,0,0.1)'
                    }}>
                      拖动角色到此处以移动分组
                    </div>
                  ) : (
                    groupChars.map(char => {
                      const hpPercentage = (char.hp / char.maxHp) * 100;
                      const isExpanded = expandedCharId === char.id;
                      const isActiveChar = isInCombat && combatTurnOrder[currentTurnIndex]?.id === char.id;

                      return (
                        <div 
                          key={char.id} 
                          draggable={true}
                          onDragStart={(e) => {
                            // Prevent dragging if the user is clicking on interactive elements
                            if (e.target.closest('input') || e.target.closest('select') || e.target.closest('button') || e.target.closest('textarea')) {
                              e.preventDefault();
                              return;
                            }
                            e.dataTransfer.setData('text/plain', char.id);
                          }}
                          className={isActiveChar ? 'card-active-combat' : ''}
                          style={{
                            border: isActiveChar ? '1.5px solid var(--accent-purple)' : '1px solid var(--border-light)',
                            borderRadius: '8px',
                            background: isActiveChar ? 'rgba(168, 85, 247, 0.08)' : 'rgba(10, 11, 16, 0.25)',
                            overflow: 'hidden',
                            cursor: 'grab',
                            boxShadow: isActiveChar ? '0 0 12px var(--accent-purple-glow)' : (isExpanded ? '0 0 10px rgba(192, 132, 252, 0.05)' : 'none')
                          }}
                        >
                          {/* Header card view */}
                          <div 
                            onClick={() => toggleExpand(char.id)}
                            style={{
                              padding: '10px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              background: isExpanded ? 'rgba(255, 255, 255, 0.03)' : 'transparent'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '2px' }}>
                                <strong style={{ color: char.type === 'PC' ? 'var(--accent-blue)' : 'var(--accent-red)', fontSize: '13px' }}>
                                  {char.name}
                                </strong>
                                {isActiveChar && (
                                  <span style={{ fontSize: '8px', background: 'var(--accent-amber)', color: '#000', padding: '1px 4px', borderRadius: '3px', fontWeight: '800', marginLeft: '4px', boxShadow: '0 0 8px rgba(251,191,36,0.3)' }}>
                                    ACTIVE
                                  </span>
                                )}
                                <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                                  ({char.type})
                                </span>

                                {/* Quick Action / Bonus Action triggers */}
                                {(() => {
                                  const actionRes = (char.resources || []).find(r => r.name === '动作') || { value: 1, max: 1 };
                                  const bonusRes = (char.resources || []).find(r => r.name === '附赠动作') || { value: 1, max: 1 };
                                  return (
                                    <div style={{ display: 'flex', gap: '3px', marginLeft: '6px' }} onClick={e => e.stopPropagation()}>
                                      <div 
                                        onClick={(e) => handleToggleQuickResource(char.id, '动作', e)}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          fontSize: '8px',
                                          fontWeight: 'bold',
                                          padding: '0px 3px',
                                          height: '14px',
                                          borderRadius: '3px',
                                          cursor: 'pointer',
                                          background: actionRes.value > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                          color: actionRes.value > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)',
                                          border: `1px solid ${actionRes.value > 0 ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-light)'}`,
                                          transition: 'all 0.2s',
                                          userSelect: 'none'
                                        }}
                                        title={actionRes.value > 0 ? '点击消耗 [动作]' : '点击恢复 [动作]'}
                                      >
                                        ⚔️ {actionRes.value > 0 ? '可用动' : '已用动'}
                                      </div>
                                      <div 
                                        onClick={(e) => handleToggleQuickResource(char.id, '附赠动作', e)}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          fontSize: '8px',
                                          fontWeight: 'bold',
                                          padding: '0px 3px',
                                          height: '14px',
                                          borderRadius: '3px',
                                          cursor: 'pointer',
                                          background: bonusRes.value > 0 ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                          color: bonusRes.value > 0 ? 'var(--accent-purple)' : 'var(--text-muted)',
                                          border: `1px solid ${bonusRes.value > 0 ? 'rgba(139, 92, 246, 0.3)' : 'var(--border-light)'}`,
                                          transition: 'all 0.2s',
                                          userSelect: 'none'
                                        }}
                                        title={bonusRes.value > 0 ? '点击消耗 [附赠动作]' : '点击恢复 [附赠动作]'}
                                      >
                                        ⚡ {bonusRes.value > 0 ? '可用附' : '已用附'}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                              
                              {/* Quick HP Adjustment */}
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                                <button onClick={() => adjustHp(char.id, -1)} className="btn btn-secondary" style={{ padding: '2px 5px', fontSize: '10px', height: '18px' }}>-1</button>
                                <button onClick={() => adjustHp(char.id, -5)} className="btn btn-secondary" style={{ padding: '2px 5px', fontSize: '10px', height: '18px' }}>-5</button>
                                
                                <span style={{ fontSize: '11px', minWidth: '46px', textAlign: 'center', fontWeight: 'bold' }}>
                                  {char.hp}
                                  {char.tempHp > 0 && (
                                    <span style={{ color: 'var(--accent-purple)', fontSize: '10px', marginLeft: '1.5px', textShadow: '0 0 4px var(--accent-purple-glow)' }} title={`包含 ${char.tempHp} 点临时生命缓冲垫`}>
                                      +{char.tempHp}
                                    </span>
                                  )}
                                  /{char.maxHp}
                                </span>
                                
                                <button onClick={() => adjustHp(char.id, 1)} className="btn btn-secondary" style={{ padding: '2px 5px', fontSize: '10px', height: '18px' }}>+1</button>
                                <button onClick={() => adjustHp(char.id, 5)} className="btn btn-secondary" style={{ padding: '2px 5px', fontSize: '10px', height: '18px' }}>+5</button>
                              </div>
                            </div>

                            {/* Subtitle labels (Class, AC, Initiative, Speed badges) */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px', fontSize: '9px' }}>
                              <span style={{ padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                🛡️ {char.ac !== undefined ? char.ac : 10}
                              </span>
                              <span style={{ padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                ⚡ {char.initiative !== undefined ? (char.initiative >= 0 ? `+${char.initiative}` : char.initiative) : '+0'}
                              </span>
                              <span style={{ padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                🏃 {char.speed !== undefined ? char.speed : 30}ft
                              </span>
                              {char.class && char.class !== '无职业' && (
                                <span style={{ padding: '1px 5px', borderRadius: '4px', background: 'rgba(192,132,252,0.1)', color: 'var(--accent-purple)', fontWeight: 'bold' }}>
                                  {char.class}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Custom Health Bar */}
                          <div style={{ height: '3px', background: 'rgba(255, 255, 255, 0.05)', width: '100%' }}>
                            <div 
                              style={{ 
                                height: '100%', 
                                width: `${hpPercentage}%`, 
                                background: hpPercentage > 50 ? 'var(--accent-emerald)' : hpPercentage > 20 ? 'var(--accent-amber)' : 'var(--accent-red)',
                                transition: 'width 0.3s ease'
                              }}
                            />
                          </div>

                          {/* Expand details for customized attributes */}
                          {isExpanded && (
                            <div style={{ padding: '12px', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.1)' }}>
                              
                              {/* Basic Info edit (Name, Class, Max HP, AC, Initiative, Speed) */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderBottom: '1px dashed var(--border-light)', paddingBottom: '10px' }}>
                                <div>
                                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>角色/怪物名称</span>
                                  <input 
                                    type="text"
                                    className="input-text"
                                    style={{ padding: '4px 8px', fontSize: '11px', marginTop: '2px', background: 'rgba(255,255,255,0.02)' }}
                                    value={char.name}
                                    onChange={(e) => handleUpdateBasicInfo(char.id, 'name', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>职业 (Class)</span>
                                  <input 
                                    type="text"
                                    className="input-text"
                                    style={{ padding: '4px 8px', fontSize: '11px', marginTop: '2px', background: 'rgba(255,255,255,0.02)' }}
                                    value={char.class || ''}
                                    onChange={(e) => handleUpdateBasicInfo(char.id, 'class', e.target.value)}
                                    placeholder="无职业"
                                  />
                                </div>
                                <div>
                                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>最大生命 (Max HP)</span>
                                  <input 
                                    type="number"
                                    className="input-text"
                                    style={{ padding: '4px 8px', fontSize: '11px', marginTop: '2px', background: 'rgba(255,255,255,0.02)' }}
                                    value={char.maxHp}
                                    onChange={(e) => handleUpdateBasicInfo(char.id, 'maxHp', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>护甲值 (AC)</span>
                                  <input 
                                    type="number"
                                    className="input-text"
                                    style={{ padding: '4px 8px', fontSize: '11px', marginTop: '2px', background: 'rgba(255,255,255,0.02)' }}
                                    value={char.ac !== undefined ? char.ac : 10}
                                    onChange={(e) => handleUpdateBasicInfo(char.id, 'ac', parseInt(e.target.value, 10) || 0)}
                                  />
                                </div>
                                <div>
                                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>先攻加成 (Initiative)</span>
                                  <input 
                                    type="number"
                                    className="input-text"
                                    style={{ padding: '4px 8px', fontSize: '11px', marginTop: '2px', background: 'rgba(255,255,255,0.02)' }}
                                    value={char.initiative !== undefined ? char.initiative : 0}
                                    onChange={(e) => handleUpdateBasicInfo(char.id, 'initiative', parseInt(e.target.value, 10) || 0)}
                                  />
                                </div>
                                <div>
                                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>移动速度 (Speed ft)</span>
                                  <input 
                                    type="number"
                                    className="input-text"
                                    style={{ padding: '4px 8px', fontSize: '11px', marginTop: '2px', background: 'rgba(255,255,255,0.02)' }}
                                    value={char.speed !== undefined ? char.speed : 30}
                                    onChange={(e) => handleUpdateBasicInfo(char.id, 'speed', parseInt(e.target.value, 10) || 0)}
                                  />
                                </div>
                                <div>
                                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>临时生命 (Temp HP)</span>
                                  <input 
                                    type="number"
                                    className="input-text"
                                    style={{ padding: '4px 8px', fontSize: '11px', marginTop: '2px', background: 'rgba(255,255,255,0.02)' }}
                                    value={char.tempHp !== undefined ? char.tempHp : 0}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                      handleUpdateBasicInfo(char.id, 'tempHp', val);
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Level & Hit Dice Upgrade Controls */}
                              <div style={{ borderBottom: '1px dashed var(--border-light)', paddingBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  🛡️ 等级与生命骰升级 (Level & Hit Dice Upgrades)
                                </span>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', alignItems: 'center' }}>
                                  {/* Level Control */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-light)', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                      等级: <strong style={{ color: 'var(--accent-purple)', fontSize: '13px' }}>{char.level || 1}</strong>
                                    </span>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleLevelChange(char, -1)}
                                        style={{ border: 'none', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)', width: '22px', height: '22px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}
                                        title="降低等级并撤销生命提升 (防止误操作)"
                                      >
                                        -
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleLevelChange(char, 1)}
                                        style={{ border: 'none', background: 'rgba(52, 211, 153, 0.15)', color: 'var(--accent-emerald)', width: '22px', height: '22px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}
                                        title="升级并掷生命骰增加最大生命值"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {/* Hit Dice Dropdown */}
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <select
                                      className="input-text"
                                      style={{ height: '32px', padding: '0 6px', fontSize: '11px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', width: '100%', outline: 'none' }}
                                      value={char.hitDice || 'd8'}
                                      onChange={(e) => handleUpdateBasicInfo(char.id, 'hitDice', e.target.value)}
                                    >
                                      <option value="d6">生命骰: d6</option>
                                      <option value="d8">生命骰: d8</option>
                                      <option value="d10">生命骰: d10</option>
                                      <option value="d12">生命骰: d12</option>
                                    </select>
                                  </div>
                                </div>
                              </div>

                              {/* Local Excel binding if exists */}
                              {char.excelPath && (
                                <div style={{ fontSize: '11px', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <FileText size={10} />
                                  <span>已同步 Excel: [ {char.excelPath} ]</span>
                                </div>
                              )}

                              {/* 3. Skill Resources slots tracking */}
                              <div style={{ borderBottom: '1px dashed var(--border-light)', paddingBottom: '10px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                                  <Award size={10} style={{ color: 'var(--accent-purple)' }} /> 🔋 技能资源槽追踪 (Spell & Feature Slots)
                                </span>
                                
                                {/* Resource list with quick adjustment steppers */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {char.resources && char.resources.length > 0 ? (
                                    char.resources.map((res, resIndex) => {
                                      const percentage = (res.value / res.max) * 100;
                                      return (
                                        <div 
                                          key={resIndex}
                                          style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px',
                                            background: 'rgba(255,255,255,0.02)',
                                            padding: '8px 10px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-light)'
                                          }}
                                        >
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{res.name}</span>
                                              <span style={{ fontSize: '8px', padding: '1px 3px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                                                {res.resetType === 'turn' ? '每回合' : res.resetType === 'short_rest' ? '短休' : '长休'}
                                              </span>
                                            </div>
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <button 
                                                onClick={() => handleAdjustResource(char.id, resIndex, -1)}
                                                className="btn btn-secondary"
                                                style={{ padding: '1px 5px', fontSize: '10px', height: '18px', width: '22px' }}
                                                title="消耗 1 次"
                                              >
                                                -
                                              </button>
                                              
                                              <span style={{ fontSize: '11px', fontWeight: 'bold', minWidth: '40px', textAlign: 'center' }}>
                                                {res.value} / {res.max}
                                              </span>

                                              <button 
                                                onClick={() => handleAdjustResource(char.id, resIndex, 1)}
                                                className="btn btn-secondary"
                                                style={{ padding: '1px 5px', fontSize: '10px', height: '18px', width: '22px' }}
                                                title="恢复 1 次"
                                              >
                                                +
                                              </button>
                                              
                                              <button 
                                                onClick={() => handleDeleteResource(char.id, resIndex, res.name)}
                                                style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px', marginLeft: '4px' }}
                                                title="删除此资源槽"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                          </div>

                                          {/* Tiny progress bar */}
                                          <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', width: '100%', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{
                                              height: '100%',
                                              width: `${percentage}%`,
                                              background: 'var(--accent-purple)',
                                              boxShadow: '0 0 5px var(--accent-purple-glow)',
                                              transition: 'width 0.2s ease'
                                            }} />
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px' }}>
                                      暂无任何资源追踪槽。可通过下方添加。
                                    </div>
                                  )}
                                </div>

                                {/* Add Resource to existing character form */}
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr auto', gap: '6px', alignItems: 'center', marginTop: '10px', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                                  <input 
                                    type="text" 
                                    placeholder="新增槽名 (如: 法术位)"
                                    className="input-text"
                                    style={{ padding: '4px 6px', fontSize: '11px', background: 'rgba(255,255,255,0.01)' }}
                                    value={cardResName}
                                    onChange={e => setCardResName(e.target.value)}
                                  />
                                  <input 
                                    type="number" 
                                    placeholder="上限"
                                    className="input-text"
                                    style={{ padding: '4px 6px', fontSize: '11px', background: 'rgba(255,255,255,0.01)' }}
                                    value={cardResMax}
                                    onChange={e => setCardResMax(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                  />
                                  <select
                                    className="input-text"
                                    style={{ padding: '4px 6px', fontSize: '11px', background: 'rgba(255,255,255,0.01)', height: '24px', cursor: 'pointer' }}
                                    value={cardResResetType}
                                    onChange={e => setCardResResetType(e.target.value)}
                                  >
                                    <option value="turn">每回合</option>
                                    <option value="short_rest">短休</option>
                                    <option value="long_rest">长休</option>
                                  </select>
                                  <button 
                                    onClick={() => handleAddResourceToCard(char.id)}
                                    className="btn btn-secondary"
                                    style={{ padding: '4px 8px', fontSize: '11px', height: '24px', margin: 0 }}
                                  >
                                    + 增设
                                  </button>
                                </div>
                              </div>

                              {/* 3.5 Conditions Status Management */}
                              <div style={{ borderBottom: '1px dashed var(--border-light)', paddingBottom: '10px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                                  <ShieldAlert size={10} style={{ color: 'var(--accent-red)' }} /> 🛡️ 特殊状态管理 (Active Conditions)
                                </span>

                                {/* Render current conditions */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                                  {char.conditions && char.conditions.map(cond => (
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
                                        onClick={() => handleRemoveConditionCard(char.id, cond.id)}
                                        style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '9px', fontWeight: 'bold', padding: 0 }}
                                        title="清除状态"
                                      >
                                        ✕
                                      </button>
                                    </span>
                                  ))}

                                  {(!char.conditions || char.conditions.length === 0) && (
                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>正常 (无负面/正面特殊状态)</span>
                                  )}
                                </div>

                                {/* Preset condition quick buttons & custom hand-filled condition form */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0,0,0,0.15)', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {['眩晕', '倒地', '定身', '中毒', '致盲', '虚弱', '狂暴', '祝福'].map(condName => (
                                      <button
                                        key={condName}
                                        type="button"
                                        onClick={() => {
                                          const rounds = prompt(`请输入 [${condName}] 持续回合数 (数字，或输入 permanent 为永久):`, '3');
                                          if (rounds !== null) {
                                            handleAddConditionCard(char.id, condName, rounds);
                                          }
                                        }}
                                        className="btn btn-secondary"
                                        style={{ fontSize: '9px', padding: '2px 4px', height: '18px', margin: 0, cursor: 'pointer' }}
                                      >
                                        {condName}
                                      </button>
                                    ))}
                                  </div>
                                  
                                  {/* Custom hand-fill condition input */}
                                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    <input 
                                      type="text" 
                                      placeholder="手填其他自定义效果..."
                                      id={`customCondCardInput_${char.id}`}
                                      className="input-text"
                                      style={{ fontSize: '10px', padding: '2px 6px', height: '22px', flex: 1, background: 'rgba(255,255,255,0.01)' }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                          const name = e.target.value.trim();
                                          const rounds = prompt(`请输入 [${name}] 持续回合数 (数字，或输入 permanent 为永久):`, '3');
                                          if (rounds !== null) {
                                            handleAddConditionCard(char.id, name, rounds);
                                          }
                                          e.target.value = '';
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const input = document.getElementById(`customCondCardInput_${char.id}`);
                                        if (input && input.value.trim()) {
                                          const name = input.value.trim();
                                          const rounds = prompt(`请输入 [${name}] 持续回合数 (数字，或输入 permanent 为永久):`, '3');
                                          if (rounds !== null) {
                                            handleAddConditionCard(char.id, name, rounds);
                                          }
                                          input.value = '';
                                        }
                                      }}
                                      className="btn btn-secondary"
                                      style={{ fontSize: '10px', padding: '0 8px', height: '22px', margin: 0, cursor: 'pointer' }}
                                    >
                                      添加
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Attribute stats view / edit */}
                              <div style={{ borderBottom: '1px dashed var(--border-light)', paddingBottom: '10px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                                  <Settings size={10} /> 修改自制 6维/非标属性
                                </span>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                  {Object.entries(char.stats || {}).map(([key, val]) => (
                                    <div key={key} className="custom-stat-pill" style={{ padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                                      <span className="stat-name" style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85px' }} title={customAttributeLabels[key] || key}>{customAttributeLabels[key] || key}</span>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <button 
                                          type="button" 
                                          onClick={() => handleUpdateStat(char.id, key, val - 1)}
                                          style={{ border: 'none', background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', width: '16px', height: '16px', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}
                                        >
                                          -
                                        </button>
                                        <input 
                                          type="number"
                                          value={val}
                                          onChange={(e) => handleUpdateStat(char.id, key, e.target.value)}
                                          style={{
                                            width: '32px',
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--text-primary)',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                            textAlign: 'center',
                                            padding: 0
                                          }}
                                        />
                                        <button 
                                          type="button" 
                                          onClick={() => handleUpdateStat(char.id, key, val + 1)}
                                          style={{ border: 'none', background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', width: '16px', height: '16px', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Feats and traits view & deletion */}
                              <div>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                                  <Award size={10} /> 专长与特质描述 (可增删技能)
                                </span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {char.feats && Object.keys(char.feats).length > 0 ? (
                                    Object.entries(char.feats).map(([k, v]) => (
                                      <div 
                                        key={k} 
                                        style={{ 
                                          background: 'rgba(0,0,0,0.2)', 
                                          padding: '6px 8px', 
                                          borderRadius: '4px', 
                                          fontSize: '11px', 
                                          color: 'var(--text-secondary)',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'start',
                                          gap: '8px'
                                        }}
                                      >
                                        <div style={{ flex: 1 }}>
                                          <strong style={{ color: 'var(--text-primary)' }}>{k}</strong>: {v}
                                        </div>
                                        <button 
                                          type="button"
                                          onClick={() => handleDeleteFeat(char.id, k)}
                                          style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--accent-red)',
                                            cursor: 'pointer',
                                            padding: '0 2px',
                                            fontSize: '12px',
                                            fontWeight: 'bold'
                                          }}
                                          title="删除此特质/技能"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))
                                  ) : (
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px' }}>
                                      当前没有任何专长或技能描述。
                                    </div>
                                  )}
                                </div>

                                {/* Quick Add Feat Form */}
                                <div style={{ borderTop: '1px dashed var(--border-light)', paddingTop: '8px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>+ 添加技能 / 专长特质</span>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '6px', alignItems: 'center' }}>
                                    <input 
                                      type="text" 
                                      placeholder="技能名称"
                                      className="input-text" 
                                      style={{ padding: '4px 6px', fontSize: '11px', background: 'rgba(255,255,255,0.02)' }}
                                      value={newFeatName}
                                      onChange={(e) => setNewFeatName(e.target.value)}
                                    />
                                    <input 
                                      type="text" 
                                      placeholder="效果描述"
                                      className="input-text" 
                                      style={{ padding: '4px 6px', fontSize: '11px', background: 'rgba(255,255,255,0.02)' }}
                                      value={newFeatDesc}
                                      onChange={(e) => setNewFeatDesc(e.target.value)}
                                    />
                                    <button 
                                      type="button"
                                      className="btn btn-secondary" 
                                      style={{ padding: '4px 8px', fontSize: '11px' }}
                                      onClick={() => handleAddFeat(char.id)}
                                    >
                                      添加
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {char.mapId && (
                                <div style={{ borderTop: '1px dashed var(--border-light)', paddingTop: '10px', marginTop: '10px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFromMap(char.id, char.name)}
                                    className="btn"
                                    style={{
                                      width: '100%',
                                      padding: '6px 12px',
                                      fontSize: '11px',
                                      color: '#f87171',
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
                              )}

                              {/* Complete Delete, Edit & Duplicate buttons for this Character/NPC */}
                              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '10px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                                <button 
                                  type="button" 
                                  onClick={() => onOpenEditCharModal(char)}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', border: '1px solid rgba(192, 132, 252, 0.3)', flex: 1, justifyContent: 'center' }}
                                >
                                  ⚙️ 详细编辑
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => onDuplicateChar(char)}
                                  className="btn btn-secondary"
                                  style={{ 
                                    padding: '4px 8px', 
                                    fontSize: '11px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '3px', 
                                    cursor: 'pointer', 
                                    border: '1px solid rgba(96, 165, 250, 0.3)', 
                                    background: 'rgba(96, 165, 250, 0.05)',
                                    flex: 1,
                                    justifyContent: 'center'
                                  }}
                                  title="快速复制此角色及所有当前属性和技能资源槽"
                                >
                                  <span>👥 快速复制</span>
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => handleDeleteCharacter(char.id, char.name)}
                                  className="btn btn-danger"
                                  style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', background: 'rgba(239, 68, 68, 0.15)', flex: 1, justifyContent: 'center' }}
                                >
                                  <Trash2 size={11} /> 彻底删除
                                </button>
                              </div>

                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}

export default React.memo(CharacterList);
