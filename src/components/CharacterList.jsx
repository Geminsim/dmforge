import React, { useState } from 'react';
import {
  Button, IconButton, TextInput, Select, Badge, StatPill,
  ResourceSlot, EmptyState, CharacterCard
} from '../ds';

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

  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [editingGroupColor, setEditingGroupColor] = useState('');

  const handleStartEditGroup = (e, group) => {
    e.stopPropagation();
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
    setEditingGroupColor(group.color || (group.id === 'group_pcs' ? '#60a5fa' : group.id === 'group_npcs' ? '#f87171' : '#c084fc'));
  };

  const handleSaveGroupEdit = (groupId) => {
    if (!editingGroupName.trim()) return;
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return { ...g, name: editingGroupName.trim(), color: editingGroupColor };
      }
      return g;
    }));
    setEditingGroupId(null);
    if (addLog) {
      addLog({
        type: 'COMBAT',
        content: `📁 分组 [${editingGroupName.trim()}] 的名称与颜色已被更新。`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

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
          const rest = { ...c };
          delete rest.groupId; // remove groupId so it falls back to type default
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
  // Keyed by character id. The old markup reached for the input through
  // document.getElementById because the field lived inside a map(); holding the
  // draft in state keeps the value where React can see it.
  const [customCondDraft, setCustomCondDraft] = useState({});

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

  const groupTone = (group) =>
    group.color || (group.id === 'group_pcs' ? 'var(--pigment-woad)' : group.id === 'group_npcs' ? 'var(--pigment-madder)' : 'var(--text-faint)');

  /** The two toggles the DM hits most during a round. */
  const renderQuickActions = (char) => {
    const action = (char.resources || []).find(r => r.name === '动作') || { value: 1, max: 1 };
    const bonus = (char.resources || []).find(r => r.name === '附赠动作') || { value: 1, max: 1 };
    const chip = (res, label, name, tone) => (
      <button
        type="button"
        onClick={(e) => handleToggleQuickResource(char.id, name, e)}
        title={res.value > 0 ? `点击消耗 [${name}]` : `点击恢复 [${name}]`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          height: 19,
          padding: '0 6px',
          border: 'none',
          cursor: 'pointer',
          background: res.value > 0 ? `var(--pigment-${tone}-soft)` : 'transparent',
          boxShadow: `inset 0 0 0 1px ${res.value > 0 ? `var(--pigment-${tone}-line)` : 'var(--line-hairline)'}`,
          color: res.value > 0 ? `var(--pigment-${tone})` : 'var(--text-faint)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--type-micro)',
          letterSpacing: '.04em',
          transition: 'var(--motion-control)'
        }}
      >
        {label}
        <span style={{ fontFamily: 'var(--font-mono)' }}>{res.value > 0 ? '可用' : '已用'}</span>
      </button>
    );
    return (
      <div style={{ display: 'flex', gap: 'var(--space-2)' }} onClick={e => e.stopPropagation()}>
        {chip(action, '动作', '动作', 'verdigris')}
        {chip(bonus, '附赠', '附赠动作', 'woad')}
      </div>
    );
  };

  /** ±1 / ±5 HP, sitting in the card's action slot. */
  const renderHpSteppers = (char) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }} onClick={e => e.stopPropagation()}>
      <IconButton icon="caret-double-down" size="sm" tone="danger" onClick={() => adjustHp(char.id, -5)} title="扣除 5 点生命值" />
      <IconButton icon="minus" size="sm" tone="danger" onClick={() => adjustHp(char.id, -1)} title="扣除 1 点生命值" />
      <IconButton icon="plus" size="sm" onClick={() => adjustHp(char.id, 1)} title="恢复 1 点生命值" />
      <IconButton icon="caret-double-up" size="sm" onClick={() => adjustHp(char.id, 5)} title="恢复 5 点生命值" />
    </div>
  );

  const renderSheetKey = (children) => (
    <span
      style={{
        fontFamily: 'var(--font-label)',
        fontSize: 'var(--type-micro)',
        letterSpacing: 'var(--tracking-label)',
        textTransform: 'uppercase',
        color: 'var(--text-faint)'
      }}
    >
      {children}
    </span>
  );

  const promptCondition = (charId, name) => {
    const rounds = prompt(`请输入 [${name}] 持续回合数 (数字，或输入 permanent 为永久):`, '3');
    if (rounds !== null) handleAddConditionCard(charId, name, rounds);
  };

  /** Everything behind the card's expand toggle. */
  const renderExpandedSheet = (char) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)',
        paddingTop: 'var(--space-4)',
        marginTop: 'var(--space-2)',
        borderTop: 'var(--border-hairline)'
      }}
      onClick={e => e.stopPropagation()}
    >
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <TextInput size="sm" label="角色/怪物名称" value={char.name} onChange={e => handleUpdateBasicInfo(char.id, 'name', e.target.value)} />
        <TextInput size="sm" label="职业 (Class)" value={char.class || ''} placeholder="无职业" onChange={e => handleUpdateBasicInfo(char.id, 'class', e.target.value)} />
        <TextInput size="sm" mono type="number" label="最大生命 (Max HP)" value={char.maxHp} onChange={e => handleUpdateBasicInfo(char.id, 'maxHp', e.target.value)} />
        <TextInput size="sm" mono type="number" label="护甲值 (AC)" value={char.ac !== undefined ? char.ac : 10} onChange={e => handleUpdateBasicInfo(char.id, 'ac', parseInt(e.target.value, 10) || 0)} />
        <TextInput size="sm" mono type="number" label="先攻加成 (Initiative)" value={char.initiative !== undefined ? char.initiative : 0} onChange={e => handleUpdateBasicInfo(char.id, 'initiative', parseInt(e.target.value, 10) || 0)} />
        <TextInput size="sm" mono type="number" label="移动速度 (Speed ft)" value={char.speed !== undefined ? char.speed : 30} onChange={e => handleUpdateBasicInfo(char.id, 'speed', parseInt(e.target.value, 10) || 0)} />
        <TextInput size="sm" mono type="number" label="临时生命 (Temp HP)" value={char.tempHp !== undefined ? char.tempHp : 0} onChange={e => handleUpdateBasicInfo(char.id, 'tempHp', Math.max(0, parseInt(e.target.value, 10) || 0))} />
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {renderSheetKey('等级与生命骰')}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 'var(--space-3)', alignItems: 'end' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-3)',
              height: 'var(--control-h-sm)',
              padding: '0 var(--space-3)',
              background: 'var(--surface-sunken)',
              boxShadow: 'inset 0 0 0 1px var(--line-hairline)'
            }}
          >
            <span style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)' }}>等级</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-numeral)', fontWeight: 'var(--weight-semibold)', color: 'var(--accent)' }}>
              {char.level || 1}
            </span>
            <span style={{ display: 'flex', gap: '2px' }}>
              <IconButton icon="minus" size="sm" tone="danger" onClick={() => handleLevelChange(char, -1)} title="降低等级并撤销生命提升 (防止误操作)" />
              <IconButton icon="plus" size="sm" onClick={() => handleLevelChange(char, 1)} title="升级并掷生命骰增加最大生命值" />
            </span>
          </div>
          <Select
            size="sm"
            value={char.hitDice || 'd8'}
            onChange={e => handleUpdateBasicInfo(char.id, 'hitDice', e.target.value)}
            options={[
              { value: 'd6', label: '生命骰: d6' },
              { value: 'd8', label: '生命骰: d8' },
              { value: 'd10', label: '生命骰: d10' },
              { value: 'd12', label: '生命骰: d12' }
            ]}
          />
        </div>
      </section>

      {char.excelPath && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--type-meta)', color: 'var(--pigment-verdigris)' }}>
          <i className="ph-fill ph-file-xls" style={{ fontSize: 12 }} aria-hidden="true" />
          已同步 Excel: [ {char.excelPath} ]
        </span>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {renderSheetKey('技能资源槽追踪')}
        {char.resources && char.resources.length > 0 ? (
          char.resources.map((res, resIndex) => (
            <ResourceSlot
              key={resIndex}
              name={res.name}
              value={res.value}
              max={res.max}
              resetType={res.resetType === 'short_rest' ? 'short' : res.resetType === 'long_rest' ? 'long' : 'turn'}
              onSpend={() => handleAdjustResource(char.id, resIndex, -1)}
              onRestore={() => handleAdjustResource(char.id, resIndex, 1)}
              onDelete={() => handleDeleteResource(char.id, resIndex, res.name)}
            />
          ))
        ) : (
          <EmptyState compact icon="flask" text="暂无任何资源追踪槽。可通过下方添加。" />
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.4fr auto', gap: 'var(--space-2)' }}>
          <TextInput size="sm" placeholder="新增槽名 (如: 法术位)" value={cardResName} onChange={e => setCardResName(e.target.value)} />
          <TextInput size="sm" mono type="number" placeholder="上限" value={cardResMax} onChange={e => setCardResMax(Math.max(1, parseInt(e.target.value, 10) || 1))} />
          <Select
            size="sm"
            value={cardResResetType}
            onChange={e => setCardResResetType(e.target.value)}
            options={[
              { value: 'turn', label: '每回合' },
              { value: 'short_rest', label: '短休' },
              { value: 'long_rest', label: '长休' }
            ]}
          />
          <Button size="sm" variant="secondary" icon="plus" onClick={() => handleAddResourceToCard(char.id)} title="为此角色增设一个资源槽" />
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {renderSheetKey('特殊状态管理')}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {char.conditions && char.conditions.length > 0 ? (
            char.conditions.map(cond => (
              <Badge
                key={cond.id}
                tone="ochre"
                variant="soft"
                onRemove={() => handleRemoveConditionCard(char.id, cond.id)}
              >
                {cond.name}（{cond.duration === 'permanent' ? '∞' : `${cond.duration} 回合`}）
              </Badge>
            ))
          ) : (
            <span style={{ fontSize: 'var(--type-meta)', color: 'var(--pigment-verdigris)', fontStyle: 'italic' }}>
              正常 (无负面/正面特殊状态)
            </span>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            padding: 'var(--space-3)',
            background: 'var(--surface-sunken)',
            boxShadow: 'inset 0 0 0 1px var(--line-hairline)'
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {['眩晕', '倒地', '定身', '中毒', '致盲', '虚弱', '狂暴', '祝福'].map(condName => (
              <Button
                key={condName}
                size="sm"
                variant="secondary"
                onClick={() => promptCondition(char.id, condName)}
                title={`为此角色附加 [${condName}] 状态，并指定持续回合数`}
              >
                {condName}
              </Button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <TextInput
              size="sm"
              placeholder="手填其他自定义效果..."
              value={customCondDraft[char.id] || ''}
              onChange={e => setCustomCondDraft(prev => ({ ...prev, [char.id]: e.target.value }))}
              onKeyDown={e => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  promptCondition(char.id, e.target.value.trim());
                  setCustomCondDraft(prev => ({ ...prev, [char.id]: '' }));
                }
              }}
            />
            <Button
              size="sm"
              variant="secondary"
              icon="plus"
              title="添加手填的自定义状态"
              onClick={() => {
                const name = (customCondDraft[char.id] || '').trim();
                if (!name) return;
                promptCondition(char.id, name);
                setCustomCondDraft(prev => ({ ...prev, [char.id]: '' }));
              }}
            >
              添加
            </Button>
          </div>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {renderSheetKey('核心属性')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--space-4)' }}>
          {Object.entries(char.stats || {}).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
              <StatPill label={customAttributeLabels[key] || key} value={val} size="sm" style={{ flex: 1, minWidth: 0 }} />
              <IconButton icon="minus" size="sm" onClick={() => handleUpdateStat(char.id, key, val - 1)} title={`降低 ${customAttributeLabels[key] || key} 1 点`} />
              <IconButton icon="plus" size="sm" onClick={() => handleUpdateStat(char.id, key, val + 1)} title={`提高 ${customAttributeLabels[key] || key} 1 点`} />
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {renderSheetKey('专长与特质描述')}
        {char.feats && Object.keys(char.feats).length > 0 ? (
          Object.entries(char.feats).map(([k, v]) => (
            <div
              key={k}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                background: 'var(--surface-sunken)',
                boxShadow: 'inset 0 0 0 1px var(--line-hairline)'
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--type-body-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-body)' }}>{k}</div>
                <div style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)', lineHeight: 'var(--type-body-lh)' }}>{v}</div>
              </div>
              <IconButton icon="trash" size="sm" tone="danger" onClick={() => handleDeleteFeat(char.id, k)} title="删除此特质/技能" />
            </div>
          ))
        ) : (
          <EmptyState compact icon="scroll" text="当前没有任何专长或技能描述。" />
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 'var(--space-2)' }}>
          <TextInput size="sm" placeholder="技能名称" value={newFeatName} onChange={e => setNewFeatName(e.target.value)} />
          <TextInput size="sm" placeholder="效果描述" value={newFeatDesc} onChange={e => setNewFeatDesc(e.target.value)} />
          <Button size="sm" variant="secondary" icon="plus" onClick={() => handleAddFeat(char.id)} title="为此角色添加技能 / 专长特质">添加</Button>
        </div>
      </section>

      {char.mapId && (
        <Button
          variant="danger"
          size="sm"
          icon="map-pin-simple-area"
          fullWidth
          onClick={() => handleRemoveFromMap(char.id, char.name)}
          title="把此棋子从当前地图上移除（角色卡保留）"
        >
          手动从地图移出
        </Button>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-2)', paddingTop: 'var(--space-3)', borderTop: 'var(--border-hairline)' }}>
        <Button size="sm" variant="secondary" icon="gear-six" style={{ flex: 1 }} onClick={() => onOpenEditCharModal(char)} title="打开完整角色编辑面板">详细编辑</Button>
        <Button size="sm" variant="secondary" icon="copy" style={{ flex: 1 }} onClick={() => onDuplicateChar(char)} title="快速复制此角色及所有当前属性和技能资源槽">快速复制</Button>
        <Button size="sm" variant="danger" icon="trash" style={{ flex: 1 }} onClick={() => handleDeleteCharacter(char.id, char.name)} title="彻底从本战役中移除此角色卡">彻底删除</Button>
      </div>
    </div>
  );

  return (
    <>
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          padding: 'var(--space-4)',
          borderBottom: 'var(--border-hairline)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: 'var(--type-micro)',
              letterSpacing: 'var(--tracking-label)',
              textTransform: 'uppercase',
              color: 'var(--accent)'
            }}
          >
            Roster
          </span>
          <h3 style={{ fontSize: 'var(--type-display-sm)' }}>角色列表与生命追踪</h3>
          <span aria-hidden="true" style={{ flex: 1, borderTop: 'var(--rule-dot)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>
            {characters.length}
          </span>
        </div>

        <Button icon="user-plus" fullWidth onClick={onOpenAddCharModal} title="新建一张角色卡（玩家角色、NPC 或怪物）">
          新建战役角色 / 怪物
        </Button>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button
            size="sm"
            variant="secondary"
            icon="campfire"
            style={{ flex: 1 }}
            onClick={() => onOpenRestModal && onOpenRestModal('short')}
            title="对选中的角色进行短休（恢复50%生命值，充能重置短休/回合资源）"
          >
            队伍短休
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon="moon-stars"
            style={{ flex: 1 }}
            onClick={() => onOpenRestModal && onOpenRestModal('long')}
            title="对选中的角色进行长休（恢复全部生命值/资源槽，重置移动力，且彻底清除负面状态）"
          >
            队伍长休
          </Button>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <TextInput
            size="sm"
            icon="folder-plus"
            placeholder="新建分组名称 (如: 地牢伏兵)..."
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateGroup(); }}
          />
          <Button size="sm" variant="secondary" icon="check" onClick={handleCreateGroup} title="创建新角色分组" />
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {groups.map(group => {
          const groupChars = characters.filter(c => getCharGroupId(c) === group.id);
          const isCollapsed = collapsedGroups[group.id];
          const isDragOver = dragOverGroupId === group.id;
          const tone = groupTone(group);
          const isEditing = editingGroupId === group.id;

          return (
            <div
              key={group.id}
              onDragOver={(e) => { e.preventDefault(); if (dragOverGroupId !== group.id) setDragOverGroupId(group.id); }}
              onDragLeave={() => setDragOverGroupId(null)}
              onDrop={(e) => { setDragOverGroupId(null); handleDropOnGroup(e, group.id); }}
              style={{
                background: isDragOver ? 'var(--accent-soft)' : 'transparent',
                boxShadow: isDragOver ? 'inset 0 0 0 1px var(--accent-line)' : 'none',
                transition: 'var(--motion-control)'
              }}
            >
              <div
                onClick={() => { if (!isEditing) toggleGroupCollapse(group.id); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-2) var(--space-4)',
                  background: 'var(--surface-sunken)',
                  boxShadow: `inset 2px 0 0 ${tone}`,
                  borderTop: 'var(--border-hairline)',
                  borderBottom: 'var(--border-hairline)',
                  cursor: isEditing ? 'default' : 'pointer',
                  userSelect: 'none'
                }}
              >
                {isEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', width: '100%' }} onClick={e => e.stopPropagation()}>
                    <TextInput size="sm" value={editingGroupName} onChange={e => setEditingGroupName(e.target.value)} placeholder="分组名称" />
                    <input
                      type="color"
                      value={editingGroupColor}
                      onChange={e => setEditingGroupColor(e.target.value)}
                      title="修改分组颜色"
                      style={{ width: 26, height: 26, padding: 0, background: 'none', border: '1px solid var(--line-hairline)', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <IconButton icon="check" size="sm" tone="accent" onClick={() => handleSaveGroupEdit(group.id)} title="保存修改" />
                    <IconButton icon="x" size="sm" onClick={() => setEditingGroupId(null)} title="取消" />
                  </div>
                ) : (
                  <>
                    <i className={`ph-fill ph-caret-${isCollapsed ? 'right' : 'down'}`} style={{ fontSize: 10, color: 'var(--text-faint)' }} aria-hidden="true" />
                    <i className="ph-fill ph-folder" style={{ fontSize: 12, color: tone }} aria-hidden="true" />
                    <span style={{ fontSize: 'var(--type-meta)', color: 'var(--text-body)', fontWeight: 'var(--weight-medium)' }}>{group.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>{groupChars.length}</span>
                    <span style={{ flex: 1 }} />
                    <IconButton icon="pencil-simple" size="sm" onClick={(e) => handleStartEditGroup(e, group)} title="更名与改色" />
                    {group.id !== 'group_pcs' && group.id !== 'group_npcs' && (
                      <IconButton
                        icon="trash"
                        size="sm"
                        tone="danger"
                        onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id, group.name); }}
                        title="删除分组"
                      />
                    )}
                  </>
                )}
              </div>

              {!isCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
                  {groupChars.length === 0 ? (
                    <EmptyState compact icon="users-three" text="拖动角色到此处以移动分组" />
                  ) : (
                    groupChars.map(char => {
                      const isExpanded = expandedCharId === char.id;
                      const isActiveChar = isInCombat && combatTurnOrder[currentTurnIndex]?.id === char.id;
                      const conditionLabels = (char.conditions || []).map(c => c.name);

                      return (
                        <div
                          key={char.id}
                          draggable
                          onDragStart={(e) => {
                            // Interactive children must stay usable inside a draggable card.
                            if (e.target.closest('input, select, button, textarea')) {
                              e.preventDefault();
                              return;
                            }
                            e.dataTransfer.setData('text/plain', char.id);
                          }}
                          style={{ cursor: 'grab' }}
                        >
                          <CharacterCard
                            name={char.name}
                            kind={char.type === 'PC' ? 'PC' : 'MONSTER'}
                            level={char.level || 1}
                            klass={char.class && char.class !== '无职业' ? char.class : undefined}
                            hp={char.hp}
                            maxHp={char.maxHp}
                            tempHp={char.tempHp || 0}
                            conditions={conditionLabels}
                            speedRemaining={char.speed !== undefined ? char.speed : 30}
                            activeTurn={isActiveChar}
                            selected={isExpanded}
                            onSelect={() => toggleExpand(char.id)}
                            actions={renderHpSteppers(char)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                              {renderQuickActions(char)}
                              <span style={{ flex: 1 }} />
                              <StatPill label="AC" value={char.ac !== undefined ? char.ac : 10} size="sm" style={{ flex: '0 0 auto' }} />
                              <StatPill
                                label="先攻"
                                value={char.initiative !== undefined ? (char.initiative >= 0 ? `+${char.initiative}` : char.initiative) : '+0'}
                                size="sm"
                                style={{ flex: '0 0 auto' }}
                              />
                              <i
                                className={`ph-fill ph-caret-${isExpanded ? 'up' : 'down'}`}
                                style={{ fontSize: 11, color: 'var(--text-faint)' }}
                                aria-hidden="true"
                              />
                            </div>
                            {isExpanded && renderExpandedSheet(char)}
                          </CharacterCard>
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
    </>
  );
}

export default React.memo(CharacterList);
