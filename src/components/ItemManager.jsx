import React, { useState } from 'react';
import { Package, Plus, Send, RefreshCw, Trash2 } from 'lucide-react';

const CATEGORIES = [
  { value: '消耗品', label: '🧪 消耗品' },
  { value: '装备及服装', label: '🛡️ 装备及服装' },
  { value: '饰品', label: '💍 饰品' },
  { value: '武器', label: '⚔️ 武器' }
];

export default function ItemManager({ characters, itemPool, setItemPool, itemTemplates = [], setItemTemplates, addLog }) {
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('消耗品');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemDesc, setNewItemDesc] = useState('');

  const [distributeQty, setDistributeQty] = useState(1);
  const [selectedCharId, setSelectedCharId] = useState('');

  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferQty, setTransferQty] = useState(1);

  const [selectedFilterTab, setSelectedFilterTab] = useState('全部');
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [sortBy, setSortBy] = useState('default'); // 'default' or 'name'
  const [charSortBy, setCharSortBy] = useState('default'); // 'default' or 'name'

  // Automatic consolidation effect for WORLD items
  React.useEffect(() => {
    if (!itemPool || !setItemPool) return;
    
    // Find all unacquired items
    const worldItems = itemPool.filter(i => i.ownerId === 'WORLD');
    const seenNames = new Set();
    let hasDuplicates = false;
    
    for (const item of worldItems) {
      const normName = item.name.trim().toLowerCase();
      if (seenNames.has(normName)) {
        hasDuplicates = true;
        break;
      }
      seenNames.add(normName);
    }

    if (hasDuplicates) {
      setItemPool(prev => {
        const consolidated = [];
        const worldItemsMap = new Map(); // name.toLowerCase() -> item
        
        for (const item of prev) {
          if (item.ownerId === 'WORLD') {
            const normName = item.name.trim().toLowerCase();
            if (worldItemsMap.has(normName)) {
              const existing = worldItemsMap.get(normName);
              // Sum quantities
              existing.quantity += item.quantity;
              // Combine or keep descriptions
              if (item.description && !existing.description) {
                existing.description = item.description;
              } else if (item.description && existing.description && !existing.description.includes(item.description)) {
                existing.description = `${existing.description} | ${item.description}`;
              }
            } else {
              // Clone to avoid direct mutation
              worldItemsMap.set(normName, { ...item });
            }
          } else {
            consolidated.push(item);
          }
        }
        
        // Add consolidated world items back
        consolidated.push(...worldItemsMap.values());
        return consolidated;
      });
    }
  }, [itemPool, setItemPool]);

  const handleNameChange = (val) => {
    setNewItemName(val);
    
    // Look up in templates
    const matched = itemTemplates.find(t => t.name.trim().toLowerCase() === val.trim().toLowerCase());
    if (matched) {
      setNewItemCategory(matched.category);
      setNewItemDesc(matched.description);
    }
  };

  const addItemToWorld = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const trimmedName = newItemName.trim();

    const newItem = {
      id: 'item_' + Date.now(),
      name: trimmedName,
      category: newItemCategory,
      quantity: parseInt(newItemQty, 10) || 1,
      description: newItemDesc.trim(),
      ownerId: 'WORLD' // WORLD represents unacquired world loot
    };

    setItemPool(prev => {
      const existingIdx = prev.findIndex(i => i.ownerId === 'WORLD' && i.name.trim().toLowerCase() === trimmedName.toLowerCase());
      if (existingIdx > -1) {
        const updated = [...prev];
        const existing = updated[existingIdx];
        const newQty = existing.quantity + (parseInt(newItemQty, 10) || 1);
        
        let mergedDesc = existing.description;
        const newDescTrimmed = newItemDesc.trim();
        if (newDescTrimmed) {
          if (!mergedDesc) {
            mergedDesc = newDescTrimmed;
          } else if (!mergedDesc.includes(newDescTrimmed)) {
            mergedDesc = `${mergedDesc} | ${newDescTrimmed}`;
          }
        }

        updated[existingIdx] = {
          ...existing,
          quantity: newQty,
          category: newItemCategory,
          description: mergedDesc
        };
        return updated;
      } else {
        return [...prev, newItem];
      }
    });
    
    // Automatically save or update this item blueprint in the template database
    if (setItemTemplates) {
      setItemTemplates(prev => {
        const filtered = prev.filter(t => t.name.toLowerCase() !== trimmedName.toLowerCase());
        return [...filtered, {
          name: trimmedName,
          category: newItemCategory,
          description: newItemDesc.trim()
        }];
      });
    }

    if (addLog) {
      addLog({
        type: 'ITEMS',
        content: `📦 新增未获得物品到池 [${newItemCategory}]: **${trimmedName}** x${newItemQty}`,
        timestamp: new Date().toLocaleTimeString()
      });
    }

    setNewItemName('');
    setNewItemDesc('');
    setNewItemQty(1);
  };

  const distributeItem = (itemId, charId, qty) => {
    const item = itemPool.find(i => i.id === itemId);
    const character = characters.find(c => c.id === charId);
    if (!item || !character) return;

    const qtyToMove = Math.min(qty, item.quantity);

    // Deduct from world pool
    setItemPool(prev => {
      return prev.map(i => {
        if (i.id === itemId) {
          return { ...i, quantity: i.quantity - qtyToMove };
        }
        return i;
      }).filter(i => i.quantity > 0);
    });

    // Add to character's item pool
    setItemPool(prev => {
      const existing = prev.find(i => i.ownerId === charId && i.name === item.name);
      if (existing) {
        return prev.map(i => {
          if (i.id === existing.id) {
            return { ...i, quantity: i.quantity + qtyToMove };
          }
          return i;
        });
      } else {
        return [...prev, {
          ...item,
          id: 'item_' + Date.now() + '_' + Math.random(),
          quantity: qtyToMove,
          ownerId: charId
        }];
      }
    });

    if (addLog) {
      addLog({
        type: 'ITEMS',
        content: `🎁 获得物品: 玩家 [${character.name}] 获得了 **${item.name}** x${qtyToMove} (自 [${item.category}])`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const transferItem = (itemId, sourceCharId, targetCharId, qty) => {
    const item = itemPool.find(i => i.id === itemId);
    const sourceChar = characters.find(c => c.id === sourceCharId);
    const targetChar = characters.find(c => c.id === targetCharId);
    if (!item || !sourceChar || !targetChar) return;

    const qtyToMove = Math.min(qty, item.quantity);

    // Deduct from source character
    setItemPool(prev => {
      return prev.map(i => {
        if (i.id === itemId) {
          return { ...i, quantity: i.quantity - qtyToMove };
        }
        return i;
      }).filter(i => i.quantity > 0);
    });

    // Add to target character
    setItemPool(prev => {
      const existing = prev.find(i => i.ownerId === targetCharId && i.name === item.name);
      if (existing) {
        return prev.map(i => {
          if (i.id === existing.id) {
            return { ...i, quantity: i.quantity + qtyToMove };
          }
          return i;
        });
      } else {
        return [...prev, {
          ...item,
          id: 'item_' + Date.now() + '_' + Math.random(),
          quantity: qtyToMove,
          ownerId: targetCharId
        }];
      }
    });

    if (addLog) {
      addLog({
        type: 'ITEMS',
        content: `🔄 物品转移: [${sourceChar.name}] 将 **${item.name}** x${qtyToMove} 转移给了 [${targetChar.name}]`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const consumeItem = (itemId, charId) => {
    const item = itemPool.find(i => i.id === itemId);
    const character = characters.find(c => c.id === charId);
    if (!item || !character) return;

    setItemPool(prev => {
      return prev.map(i => {
        if (i.id === itemId) {
          return { ...i, quantity: i.quantity - 1 };
        }
        return i;
      }).filter(i => i.quantity > 0);
    });

    if (addLog) {
      addLog({
        type: 'ITEMS',
        content: `🧪 物品消耗: 玩家 [${character.name}] 消耗了 **${item.name}** x1`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const deleteItemFromPool = (itemId) => {
    const item = itemPool.find(i => i.id === itemId);
    if (!item) return;

    if (window.confirm(`确定要彻底从物品库中删除物品 [${item.name}] 吗？`)) {
      setItemPool(prev => prev.filter(i => i.id !== itemId));

      if (addLog) {
        addLog({
          type: 'ITEMS',
          content: `🗑️ 物品删除: 彻底删除了 **${item.name}**`,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }
  };

  const deleteTemplate = (templateName) => {
    if (window.confirm(`确定要彻底从模板库中删除物品模板 [${templateName}] 吗？\n(此操作不会影响背包内已有物品的数值与内容)`)) {
      if (setItemTemplates) {
        setItemTemplates(prev => prev.filter(t => t.name !== templateName));
      }
      
      if (addLog) {
        addLog({
          type: 'ITEMS',
          content: `🗑️ 模板删除: 从模板库物理清除了模板 [${templateName}]`,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }
  };

  // Group unacquired items
  const worldItems = itemPool.filter(i => i.ownerId === 'WORLD');
  
  const filteredWorldItems = worldItems.filter(item => {
    if (selectedFilterTab === '全部') return true;
    return item.category === selectedFilterTab;
  });

  // Apply sorting to world items if sortBy is 'name'
  const displayedWorldItems = sortBy === 'name'
    ? [...filteredWorldItems].sort((a, b) => a.name.localeCompare(b.name, 'zh'))
    : filteredWorldItems;

  const matchedDatalistTemplates = newItemName.trim().length >= 2
    ? itemTemplates.filter(t => t.name.toLowerCase().includes(newItemName.trim().toLowerCase()))
    : [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', height: '100%', overflowY: 'auto', padding: '16px' }}>
      
      {/* LEFT COLUMN: World loot / unacquired pool */}
      <div className="glass-panel panel-content" style={{ alignSelf: 'start', gap: '14px' }}>
        <div className="panel-title">
          <Package size={18} style={{ color: 'var(--accent-amber)' }} />
          <span>🌍 世界未获得物品池</span>
        </div>

        {/* Add new world item form */}
        <form onSubmit={addItemToWorld} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
            <input 
              type="text" 
              className="input-text" 
              placeholder="物品名称 (自动匹配已存模板)" 
              value={newItemName}
              onChange={(e) => handleNameChange(e.target.value)}
              list="itemTemplatesDatalist"
              autoComplete="off"
            />
            <datalist id="itemTemplatesDatalist">
              {matchedDatalistTemplates.map((t, idx) => (
                <option key={idx} value={t.name}>{t.category} - {t.description.substring(0, 25)}...</option>
              ))}
            </datalist>
            
            <input 
              type="number" 
              className="input-text" 
              placeholder="数量" 
              value={newItemQty}
              onChange={(e) => setNewItemQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <select 
              className="input-text" 
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            <input 
              type="text" 
              className="input-text" 
              placeholder="描述效果" 
              value={newItemDesc}
              onChange={(e) => setNewItemDesc(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'end' }}>
            <Plus size={14} /> 添加至物品池
          </button>
        </form>

        {/* Collapsible Template Manager Panel */}
        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '10px' }}>
          <div 
            onClick={() => setShowTemplateManager(!showTemplateManager)}
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📋 物品定义模板库 ({itemTemplates.length})</span>
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {showTemplateManager ? '收起 ▲' : '管理 / 展开 ▼'}
            </span>
          </div>

          {showTemplateManager && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
              {itemTemplates.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
                  模板库暂无数据，添加新物品时会自动录入。
                </div>
              ) : (
                itemTemplates.map((t, idx) => (
                  <div 
                    key={idx}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      background: 'rgba(0,0,0,0.15)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '11px'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, marginRight: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ color: '#fff' }}>{t.name}</strong>
                        <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', background: 'rgba(192, 132, 252, 0.1)', color: 'var(--accent-purple)', fontWeight: 'bold' }}>
                          {t.category}
                        </span>
                      </div>
                      {t.description && (
                        <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                          {t.description}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTemplate(t.name);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.2s',
                        padding: '4px'
                      }}
                      title="删除此物品模板"
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-red)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            type="button"
            onClick={() => setSelectedFilterTab('全部')}
            className={`tab-btn ${selectedFilterTab === '全部' ? 'active' : ''}`}
            style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '12px', height: '24px', whiteSpace: 'nowrap' }}
          >
            全部 ({worldItems.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = worldItems.filter(i => i.category === cat.value).length;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setSelectedFilterTab(cat.value)}
                className={`tab-btn ${selectedFilterTab === cat.value ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '12px', height: '24px', whiteSpace: 'nowrap' }}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Sort Controls Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', borderRadius: '6px', padding: '6px 12px', margin: '4px 0' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>排序方式:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setSortBy('default')}
              className={`tab-btn ${sortBy === 'default' ? 'active' : ''}`}
              style={{ padding: '2px 8px', fontSize: '11px', borderRadius: '4px', height: '22px' }}
            >
              ⏱️ 默认顺序
            </button>
            <button
              type="button"
              onClick={() => setSortBy('name')}
              className={`tab-btn ${sortBy === 'name' ? 'active' : ''}`}
              style={{ padding: '2px 8px', fontSize: '11px', borderRadius: '4px', height: '22px' }}
            >
              🔤 按名称排序
            </button>
          </div>
        </div>

        {/* Unacquired item list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
          {displayedWorldItems.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
              物品池暂无此分类未分配物品
            </div>
          ) : (
            displayedWorldItems.map(item => (
              <div 
                key={item.id} 
                style={{ 
                  background: 'rgba(255,255,255,0.01)', 
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: 'var(--accent-amber)', fontSize: '14px' }}>{item.name}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                      {item.category === '消耗品' && '🧪 '}
                      {item.category === '装备及服装' && '🛡️ '}
                      {item.category === '饰品' && '💍 '}
                      {item.category === '武器' && '⚔️ '}
                      {item.category}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>x{item.quantity}</span>
                    <button
                      onClick={() => deleteItemFromPool(item.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.2s',
                        padding: '2px'
                      }}
                      title="彻底删除物品"
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-red)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {item.description && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.description}</div>
                )}
                
                {/* Distribution action */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                  <select 
                    className="input-text" 
                    style={{ flex: 1, padding: '4px 8px', fontSize: '12px' }}
                    value={selectedCharId}
                    onChange={(e) => setSelectedCharId(e.target.value)}
                  >
                    <option value="">选择分发角色...</option>
                    {characters.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <input 
                    type="number" 
                    className="input-text" 
                    style={{ width: '50px', padding: '4px 8px', fontSize: '12px' }} 
                    value={distributeQty}
                    onChange={(e) => setDistributeQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                  <button 
                    onClick={() => distributeItem(item.id, selectedCharId, distributeQty)}
                    className="btn btn-secondary" 
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    disabled={!selectedCharId}
                  >
                    <Send size={12} /> 分发
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Characters bags & transfers */}
      <div className="glass-panel panel-content" style={{ alignSelf: 'start', gap: '14px' }}>
        <div className="panel-title">
          <RefreshCw size={18} style={{ color: 'var(--accent-purple)' }} />
          <span>🎒 玩家角色背包与流转</span>
        </div>

        {/* Sort Controls Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', borderRadius: '6px', padding: '6px 12px', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>排序方式:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setCharSortBy('default')}
              className={`tab-btn ${charSortBy === 'default' ? 'active' : ''}`}
              style={{ padding: '2px 8px', fontSize: '11px', borderRadius: '4px', height: '22px' }}
            >
              ⏱️ 默认顺序
            </button>
            <button
              type="button"
              onClick={() => setCharSortBy('name')}
              className={`tab-btn ${charSortBy === 'name' ? 'active' : ''}`}
              style={{ padding: '2px 8px', fontSize: '11px', borderRadius: '4px', height: '22px' }}
            >
              🔤 按名称排序
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '600px', overflowY: 'auto' }}>
          {characters.map(char => {
            const rawCharItems = itemPool.filter(i => i.ownerId === char.id);
            const charItems = charSortBy === 'name'
              ? [...rawCharItems].sort((a, b) => a.name.localeCompare(b.name, 'zh'))
              : rawCharItems;

            return (
              <div 
                key={char.id} 
                style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid var(--border-light)',
                  borderRadius: '10px',
                  padding: '14px'
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  {char.name} 的背包
                </div>

                {charItems.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                    背包空空如也
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {charItems.map(item => (
                      <div 
                        key={item.id} 
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '6px', 
                          background: 'rgba(0,0,0,0.2)',
                          padding: '8px',
                          borderRadius: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <div>
                            <strong style={{ color: 'var(--accent-purple)' }}>{item.name}</strong>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                              ({item.category})
                            </span>
                          </div>
                          <span>x{item.quantity}</span>
                        </div>

                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <select 
                            className="input-text" 
                            style={{ flex: 1, padding: '3px 6px', fontSize: '11px' }}
                            onChange={(e) => setTransferTargetId(e.target.value)}
                          >
                            <option value="">转移给...</option>
                            {characters.filter(c => c.id !== char.id).map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          <input 
                            type="number" 
                            className="input-text" 
                            style={{ width: '45px', padding: '3px 6px', fontSize: '11px' }} 
                            value={transferQty}
                            onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          />
                          <button 
                            onClick={() => transferItem(item.id, char.id, transferTargetId, transferQty)}
                            className="btn btn-secondary" 
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            disabled={!transferTargetId}
                          >
                            转移
                          </button>
                          <button 
                            onClick={() => consumeItem(item.id, char.id)}
                            className="btn btn-secondary" 
                            style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)', color: 'var(--accent-purple)' }}
                            title="消耗1个物品"
                          >
                            消耗
                          </button>
                          <button 
                            onClick={() => deleteItemFromPool(item.id)}
                            className="btn btn-danger" 
                            style={{ padding: '4px 6px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                            title="彻底删除物品"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
