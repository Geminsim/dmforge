import React, { useState } from 'react';
import { Package, Plus, Send, RefreshCw, Trash2 } from 'lucide-react';

export default function ItemManager({ characters, itemPool, setItemPool, addLog }) {
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('世界遗物池');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemDesc, setNewItemDesc] = useState('');

  const [distributeQty, setDistributeQty] = useState(1);
  const [selectedCharId, setSelectedCharId] = useState('');

  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferQty, setTransferQty] = useState(1);

  const addItemToWorld = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem = {
      id: 'item_' + Date.now(),
      name: newItemName,
      category: newItemCategory,
      quantity: parseInt(newItemQty, 10) || 1,
      description: newItemDesc,
      ownerId: 'WORLD' // WORLD represents unacquired world loot
    };

    setItemPool(prev => [...prev, newItem]);
    
    if (addLog) {
      addLog({
        type: 'ITEMS',
        content: `📦 新增未获得物品到池 [${newItemCategory}]: **${newItemName}** x${newItemQty}`,
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

  // Group unacquired items
  const worldItems = itemPool.filter(i => i.ownerId === 'WORLD');
  
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
              placeholder="物品名称" 
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
            />
            <input 
              type="number" 
              className="input-text" 
              placeholder="数量" 
              value={newItemQty}
              onChange={(e) => setNewItemQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <input 
              type="text" 
              className="input-text" 
              placeholder="归类 (如: 地牢A)" 
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
            />
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

        {/* Unacquired item list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
          {worldItems.length === 0 ? (
            <div style={{ textSelf: 'center', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
              物品池暂无未分配物品
            </div>
          ) : (
            worldItems.map(item => (
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
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>({item.category})</span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>x{item.quantity}</span>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '600px', overflowY: 'auto' }}>
          {characters.map(char => {
            const charItems = itemPool.filter(i => i.ownerId === char.id);

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
                          <strong style={{ color: 'var(--accent-purple)' }}>{item.name}</strong>
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
                            className="btn btn-danger" 
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            消耗
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
