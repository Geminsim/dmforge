import React, { useState } from 'react';
import {
  Panel, Button, IconButton, TextInput, Select, SegmentedControl,
  Badge, ItemRow, EmptyState, ToolbarLabel
} from '../ds';
import { CATEGORY_TONES, getEncumbrance, isWorldInfiniteItem, ITEM_CATEGORIES } from '../utils/inventoryRules';

const CATEGORIES = ITEM_CATEGORIES.map(value => ({ value, label: value }));

// `value` above is persisted in campaign saves, so it stays as-is; only the
// pigment mapping is new. ItemRow carries its own map for the design system's
// vocabulary — these are this product's categories.
const CATEGORY_TONE = CATEGORY_TONES;

const itemDetails = item => [
  `重量 ${Number(item.weight) || 0}kg/份`,
  Number(item.calories) > 0 ? `${item.calories} kcal/份` : '',
  Number(item.acBonus) ? `AC +${item.acBonus}` : '',
  item.damageDie ? `伤害 ${item.damageDiceCount || 1}${item.damageDie}${Number(item.damageFixed) ? `+${item.damageFixed}` : ''} ${item.damageType || ''}` : '',
  item.effectValue || ''
].filter(Boolean).join(' · ');

export default function ItemManager({ characters, itemPool, setItemPool, itemTemplates = [], setItemTemplates, addLog, groups = [] }) {
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('消耗品');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [editingItemId, setEditingItemId] = useState('');
  const [editDraft, setEditDraft] = useState(null);

  // Keyed by item id. These used to be one shared target/quantity pair for the
  // whole screen, so picking a recipient on one row also armed every other
  // row's button — clicking 分发 on a second item sent it to the first item's
  // target. Per-item drafts make each row mean what it shows.
  const [distributeDraft, setDistributeDraft] = useState({});
  const [transferDraft, setTransferDraft] = useState({});

  const [selectedFilterTab, setSelectedFilterTab] = useState('全部');
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [sortBy, setSortBy] = useState('default'); // 'default' or 'name'
  const [charSortBy, setCharSortBy] = useState('default'); // 'default' or 'name'

  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroupCollapse = (groupId) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const getCharGroupId = (char) => {
    if (char.groupId) return char.groupId;
    return char.type === 'PC' ? 'group_pcs' : 'group_npcs';
  };

  const allGroups = groups && groups.length > 0 ? groups : [
    { id: 'group_pcs', name: '玩家角色' },
    { id: 'group_npcs', name: '战役NPC/敌方' }
  ];

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
              if (!isWorldInfiniteItem(existing)) existing.quantity += item.quantity;
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

    const matchedTemplate = itemTemplates.find(t => t.name.trim().toLowerCase() === trimmedName.toLowerCase());
    const newItem = {
      ...(matchedTemplate ? structuredClone(matchedTemplate) : {}),
      id: 'item_' + Date.now(),
      name: trimmedName,
      category: newItemCategory,
      quantity: parseInt(newItemQty, 10) || 1,
      description: newItemDesc.trim(),
      usage: matchedTemplate?.usage || '由 DM 编辑具体使用方式。',
      weight: Number(matchedTemplate?.weight) || 0,
      ownerId: 'WORLD' // WORLD represents unacquired world loot
    };

    setItemPool(prev => {
      const existingIdx = prev.findIndex(i => i.ownerId === 'WORLD' && i.name.trim().toLowerCase() === trimmedName.toLowerCase());
      if (existingIdx > -1) {
        const updated = [...prev];
        const existing = updated[existingIdx];
        const newQty = isWorldInfiniteItem(existing) ? existing.quantity : existing.quantity + (parseInt(newItemQty, 10) || 1);
        
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
        const template = structuredClone(newItem);
        delete template.id;
        delete template.ownerId;
        delete template.quantity;
        return [...filtered, template];
      });
    }

    if (addLog) {
      addLog({
        type: 'ITEMS',
        content: `新增未获得物品到池 [${newItemCategory}]: **${trimmedName}** x${newItemQty}`,
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

    const infinite = isWorldInfiniteItem(item);
    const qtyToMove = infinite ? Math.max(1, Number(qty) || 1) : Math.min(qty, item.quantity);

    // Deduct from world pool
    if (!infinite) setItemPool(prev => {
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
        content: `获得物品: 玩家 [${character.name}] 获得了 **${item.name}** x${qtyToMove} (自 [${item.category}])`,
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
        content: `物品转移: [${sourceChar.name}] 将 **${item.name}** x${qtyToMove} 转移给了 [${targetChar.name}]`,
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
        content: `物品消耗: 玩家 [${character.name}] 消耗了 **${item.name}** x1`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const startEditingItem = item => {
    setEditingItemId(item.id);
    setEditDraft(structuredClone(item));
  };

  const saveItemEdit = () => {
    if (!editingItemId || !editDraft?.name?.trim()) return;
    const originalName = itemPool.find(item => item.id === editingItemId)?.name;
    const normalized = {
      ...editDraft,
      name: editDraft.name.trim(),
      quantity: Math.max(1, Number(editDraft.quantity) || 1),
      weight: Math.max(0, Number(editDraft.weight) || 0),
      calories: Math.max(0, Number(editDraft.calories) || 0),
      acBonus: Number(editDraft.acBonus) || 0,
      damageDiceCount: Math.max(1, Number(editDraft.damageDiceCount) || 1),
      damageFixed: Number(editDraft.damageFixed) || 0,
      infinite: editDraft.ownerId === 'WORLD' && Boolean(editDraft.infinite)
    };
    setItemPool(previous => previous.map(item => item.id === editingItemId ? normalized : item));
    if (setItemTemplates) setItemTemplates(previous => {
      const template = structuredClone(normalized);
      delete template.id;
      delete template.ownerId;
      delete template.quantity;
      return [...previous.filter(item => item.name !== originalName && item.name !== normalized.name), template];
    });
    setEditingItemId('');
    setEditDraft(null);
  };

  const deleteItemFromPool = (itemId) => {
    const item = itemPool.find(i => i.id === itemId);
    if (!item) return;

    if (window.confirm(`确定要彻底从物品库中删除物品 [${item.name}] 吗？`)) {
      setItemPool(prev => prev.filter(i => i.id !== itemId));

      if (addLog) {
        addLog({
          type: 'ITEMS',
          content: `物品删除: 彻底删除了 **${item.name}**`,
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
          content: `模板删除: 从模板库物理清除了模板 [${templateName}]`,
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

  const SORT_ITEMS = [
    { id: 'default', label: '默认顺序', icon: 'clock-counter-clockwise' },
    { id: 'name', label: '按名称排序', icon: 'sort-ascending' }
  ];

  /** Character options grouped the way the roster groups them. */
  const characterOptions = (excludeId) => {
    const options = [{ value: '', label: excludeId ? '转移给...' : '选择分发角色...' }];
    allGroups.forEach(group => {
      characters
        .filter(c => getCharGroupId(c) === group.id && c.id !== excludeId)
        .forEach(c => options.push({ value: c.id, label: `${group.name} · ${c.name}` }));
    });
    return options;
  };

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-5)',
        padding: 'var(--space-5)',
        overflow: 'hidden'
      }}
    >
      <Panel
        code="POOL"
        title= "世界未获得物品池"
        meta={`${worldItems.length} 件`}
        scroll
        bodyStyle={{ padding: 'var(--panel-pad)', gap: 'var(--space-5)', flex: 1, minHeight: 0, overflowY: 'auto' }}
      >
        <details className="item-create-details">
          <summary><i className="ph-fill ph-plus" aria-hidden="true" />新增世界物品 <span>模板或自定义</span></summary>
        <form onSubmit={addItemToWorld} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', paddingTop: 'var(--space-3)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-3)' }}>
            <TextInput
              size="sm"
              label= "物品名称"
              placeholder= "物品名称 (自动匹配已存模板)"
              value={newItemName}
              onChange={(e) => handleNameChange(e.target.value)}
              hint={matchedDatalistTemplates.length ? `${matchedDatalistTemplates.length} 个模板匹配，点击下方套用` : undefined}
            />
            <TextInput
              size="sm"
              mono
              type="number"
              label= "数量"
              placeholder= "数量"
              value={newItemQty}
              onChange={(e) => setNewItemQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </div>
          {matchedDatalistTemplates.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {matchedDatalistTemplates.slice(0, 6).map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleNameChange(t.name)}
                  title={`套用模板「${t.name}」：填入分类 ${t.category} 与其描述`}
                  style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                >
                  <Badge tone={CATEGORY_TONE[t.category] || 'neutral'} variant="soft" icon="stack">{t.name}</Badge>
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Select size="sm" label= "分类" value={newItemCategory} onChange={(e) => setNewItemCategory(e.target.value)} options={CATEGORIES} />
            <TextInput size="sm" label= "描述效果" placeholder= "描述效果" value={newItemDesc} onChange={(e) => setNewItemDesc(e.target.value)} />
          </div>
          <Button type="submit" icon="plus" title= "把这件物品加入世界物品池（未分配给任何角色）">添加至物品池</Button>
        </form>
        </details>

        <details open={showTemplateManager} onToggle={e => setShowTemplateManager(e.currentTarget.open)}>
          <summary style={{ cursor: 'pointer', fontSize: 'var(--type-meta)', color: 'var(--text-muted)' }}>
            物品定义模板库（{itemTemplates.length}）
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: 180, overflowY: 'auto', marginTop: 'var(--space-3)' }}>
            {itemTemplates.length === 0 ? (
              <EmptyState compact icon="stack" text= "模板库暂无数据，添加新物品时会自动录入。" />
            ) : (
              itemTemplates.map((t, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-2) var(--space-3)',
                    minWidth: 0,
                    background: 'var(--surface-raised)',
                    boxShadow: 'inset 0 0 0 1px var(--line-hairline)'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span style={{ fontSize: 'var(--type-body-sm)', color: 'var(--text-body)' }}>{t.name}</span>
                      <Badge size="sm" tone={CATEGORY_TONE[t.category] || 'neutral'}>{t.category}</Badge>
                    </div>
                    {t.description && (
                      <div style={{ fontSize: 'var(--type-micro)', color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.description}
                      </div>
                    )}
                  </div>
                  <IconButton icon="trash" size="sm" tone="danger" onClick={(e) => { e.stopPropagation(); deleteTemplate(t.name); }} title= "删除此物品模板" />
                </div>
              ))
            )}
          </div>
        </details>

        <Select
          size="sm"
          label="按物品分类筛选"
          value={selectedFilterTab}
          onChange={event => setSelectedFilterTab(event.target.value)}
          options={[{ value: '全部', label: `全部（${worldItems.length}）` }, ...CATEGORIES.filter(cat => worldItems.some(item => item.category === cat.value)).map(cat => ({ value: cat.value, label: `${cat.label}（${worldItems.filter(item => item.category === cat.value).length}）` }))]}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <ToolbarLabel>Sort</ToolbarLabel>
          <div style={{ flex: 1 }}>
            <SegmentedControl value={sortBy} onChange={setSortBy} items={SORT_ITEMS} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {displayedWorldItems.length === 0 ? (
            <EmptyState icon="backpack" text= "物品池暂无此分类未分配物品" hint= "换个分类，或用上方表单入库。" />
          ) : (
            displayedWorldItems.map(item => {
              const draft = distributeDraft[item.id] || {};
              return (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  <ItemRow
                    name={item.name}
                    category={item.category}
                    quantity={isWorldInfiniteItem(item) ? '∞' : item.quantity}
                    description={item.description}
                    usage={item.usage}
                    details={itemDetails(item)}
                    actions={<><IconButton icon="pencil-simple" size="sm" onClick={() => startEditingItem(item)} title="编辑全部物品数值" /><IconButton icon="trash" size="sm" tone="danger" onClick={() => deleteItemFromPool(item.id)} title= "彻底删除物品" /></>}
                  />
                  {editingItemId === item.id && editDraft && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)', background: 'var(--surface-sunken)', boxShadow: 'inset 0 0 0 1px var(--accent-line)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 'var(--space-2)' }}>
                        <TextInput size="sm" label="名称" value={editDraft.name} onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))} />
                        <Select size="sm" label="分类" value={editDraft.category} onChange={e => setEditDraft(d => ({ ...d, category: e.target.value }))} options={CATEGORIES} />
                        <TextInput size="sm" type="number" label="重量 kg/份" value={editDraft.weight ?? 0} onChange={e => setEditDraft(d => ({ ...d, weight: e.target.value }))} />
                        <TextInput size="sm" type="number" label="热量 kcal/份" value={editDraft.calories ?? 0} onChange={e => setEditDraft(d => ({ ...d, calories: e.target.value }))} />
                      </div>
                      <TextInput size="sm" label="物品说明" value={editDraft.description || ''} onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))} />
                      <TextInput size="sm" label="使用说明" value={editDraft.usage || ''} onChange={e => setEditDraft(d => ({ ...d, usage: e.target.value }))} />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 'var(--space-2)' }}>
                        <TextInput size="sm" type="number" label="AC 加值" value={editDraft.acBonus ?? 0} onChange={e => setEditDraft(d => ({ ...d, acBonus: e.target.value }))} />
                        <TextInput size="sm" type="number" label="伤害骰数" value={editDraft.damageDiceCount ?? 1} onChange={e => setEditDraft(d => ({ ...d, damageDiceCount: e.target.value }))} />
                        <Select size="sm" label="伤害骰" value={editDraft.damageDie || ''} onChange={e => setEditDraft(d => ({ ...d, damageDie: e.target.value }))} options={[{ value: '', label: '无' }, ...['d4','d6','d8','d10','d12','d20'].map(value => ({ value, label: value }))]} />
                        <TextInput size="sm" type="number" label="固定伤害" value={editDraft.damageFixed ?? 0} onChange={e => setEditDraft(d => ({ ...d, damageFixed: e.target.value }))} />
                        <TextInput size="sm" label="伤害类型" value={editDraft.damageType || ''} onChange={e => setEditDraft(d => ({ ...d, damageType: e.target.value }))} />
                      </div>
                      <TextInput size="sm" label="其他默认数值/效果" value={editDraft.effectValue || ''} onChange={e => setEditDraft(d => ({ ...d, effectValue: e.target.value }))} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}><Button size="sm" variant="secondary" onClick={() => { setEditingItemId(''); setEditDraft(null); }}>取消</Button><Button size="sm" icon="check" onClick={saveItemEdit}>保存物品定义</Button></div>
                    </div>
                  )}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      gap: 'var(--space-2)',
                      padding: '0 var(--space-4) var(--space-3)',
                      alignItems: 'center'
                    }}
                  >
                    <Select
                      size="sm"
                      value={draft.charId || ''}
                      onChange={(e) => setDistributeDraft(prev => ({ ...prev, [item.id]: { ...prev[item.id], charId: e.target.value } }))}
                      options={characterOptions()}
                    />
                    <TextInput
                      size="sm"
                      mono
                      type="number"
                      value={draft.qty ?? 1}
                      onChange={(e) => setDistributeDraft(prev => ({ ...prev, [item.id]: { ...prev[item.id], qty: Math.max(1, parseInt(e.target.value, 10) || 1) } }))}
                      fullWidth={false}
                      style={{ width: 64 }}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      icon="paper-plane-tilt"
                      disabled={!draft.charId}
                      onClick={() => distributeItem(item.id, draft.charId, draft.qty ?? 1)}
                      title= "把指定数量分发给所选角色"
                    >
                      分发
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Panel>

      <Panel
        code="BAGS"
        title= "玩家角色背包与流转"
        scroll
        bodyStyle={{ padding: 'var(--panel-pad)', gap: 'var(--space-5)', flex: 1, minHeight: 0, overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <ToolbarLabel>Sort</ToolbarLabel>
          <div style={{ flex: 1 }}>
            <SegmentedControl value={charSortBy} onChange={setCharSortBy} items={SORT_ITEMS} />
          </div>
        </div>

        {allGroups.map(group => {
          const groupChars = characters.filter(c => getCharGroupId(c) === group.id);
          if (groupChars.length === 0) return null;

          const sortedGroupChars = charSortBy === 'name'
            ? [...groupChars].sort((a, b) => a.name.localeCompare(b.name, 'zh'))
            : groupChars;

          const tone = group.id === 'group_pcs' ? 'var(--pigment-woad)' : group.id === 'group_npcs' ? 'var(--pigment-madder)' : 'var(--text-faint)';
          const isCollapsed = collapsedGroups[group.id];

          return (
            <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div
                onClick={() => toggleGroupCollapse(group.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-2) var(--space-3)',
                  background: 'var(--surface-sunken)',
                  boxShadow: `inset 2px 0 0 ${tone}`,
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <i className={`ph-fill ph-caret-${isCollapsed ? 'right' : 'down'}`} style={{ fontSize: 10, color: 'var(--text-faint)' }} aria-hidden="true" />
                <span style={{ fontSize: 'var(--type-meta)', color: 'var(--text-body)', fontWeight: 'var(--weight-medium)' }}>{group.name}</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>
                  {sortedGroupChars.length} 个角色
                </span>
              </div>

              {!isCollapsed && sortedGroupChars.map(char => {
                const rawCharItems = itemPool.filter(i => i.ownerId === char.id);
                const charItems = charSortBy === 'name'
                  ? [...rawCharItems].sort((a, b) => a.name.localeCompare(b.name, 'zh'))
                  : rawCharItems;
                const encumbrance = getEncumbrance(char, itemPool);

                return (
                  <div key={char.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--type-body-sm)', fontWeight: 'var(--display-weight)', color: 'var(--text-body)' }}>
                        {char.name} 的背包
                      </span>
                      <span aria-hidden="true" style={{ flex: 1, borderTop: 'var(--rule-dot)', transform: 'translateY(-3px)' }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>
                        {charItems.length}
                      </span>
                    </div>

                    {char.type === 'PC' && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 'var(--space-3)', alignItems: 'center', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-sunken)', boxShadow: `inset 2px 0 0 ${encumbrance.overCapacity ? 'var(--pigment-madder)' : encumbrance.warning ? 'var(--pigment-ochre)' : 'var(--pigment-verdigris)'}` }}>
                        <span style={{ fontSize: 'var(--type-micro)', color: 'var(--text-muted)' }}>负重</span>
                        <div style={{ position: 'relative', height: 7, background: 'var(--surface-panel)', boxShadow: 'inset 0 0 0 1px var(--line-hairline)' }}>
                          <span style={{ position: 'absolute', inset: 0, right: `${Math.max(0, 100 - Math.min(100, encumbrance.ratio * 100))}%`, background: encumbrance.overCapacity ? 'var(--pigment-madder)' : encumbrance.warning ? 'var(--pigment-ochre)' : 'var(--pigment-verdigris)' }} />
                          <span title="80% 预警线" style={{ position: 'absolute', left: '80%', top: -2, bottom: -2, width: 1, background: 'var(--text-body)' }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: encumbrance.overCapacity ? 'var(--pigment-madder)' : 'var(--text-body)' }}>{encumbrance.carried}/{encumbrance.capacity}kg · 80%={encumbrance.warningAt}kg</span>
                        {encumbrance.overCapacity && <span style={{ gridColumn: '1 / -1', fontSize: 'var(--type-micro)', color: 'var(--pigment-madder)' }}>超重：{encumbrance.penaltyText}</span>}
                      </div>
                    )}

                    {charItems.length === 0 ? (
                      <EmptyState compact icon="backpack" text= "背包空空如也" />
                    ) : (
                      charItems.map(item => {
                        const draft = transferDraft[item.id] || {};
                        return (
                          <div
                            key={item.id}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 'var(--space-2)',
                              padding: 'var(--space-3)',
                              background: 'var(--surface-raised)',
                              boxShadow: 'inset 0 0 0 1px var(--line-hairline)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
                              <span style={{ fontSize: 'var(--type-body-sm)', color: ({ madder: 'var(--pigment-madder)', verdigris: 'var(--pigment-verdigris)', woad: 'var(--pigment-woad)', accent: 'var(--accent)', ochre: 'var(--pigment-ochre)', amber: 'var(--pigment-ochre)' }[CATEGORY_TONE[item.category]] || 'var(--text-body)'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.name}
                              </span>
                              <Badge size="sm" tone={CATEGORY_TONE[item.category] || 'neutral'}>{item.category}</Badge>
                              <span aria-hidden="true" style={{ flex: 1, borderTop: 'var(--rule-dot)' }} />
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-numeral-sm)', color: 'var(--text-body)' }}>×{item.quantity}</span>
                            </div>

                            {(itemDetails(item) || item.usage) && <div style={{ fontSize: 'var(--type-micro)', color: 'var(--text-muted)', lineHeight: 'var(--type-body-lh)' }}>{itemDetails(item)}{item.usage ? `${itemDetails(item) ? ' · ' : ''}使用：${item.usage}` : ''}</div>}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: 'var(--space-2)', alignItems: 'center' }}>
                              <Select
                                size="sm"
                                value={draft.targetId || ''}
                                onChange={(e) => setTransferDraft(prev => ({ ...prev, [item.id]: { ...prev[item.id], targetId: e.target.value } }))}
                                options={characterOptions(char.id)}
                              />
                              <TextInput
                                size="sm"
                                mono
                                type="number"
                                value={draft.qty ?? 1}
                                onChange={(e) => setTransferDraft(prev => ({ ...prev, [item.id]: { ...prev[item.id], qty: Math.max(1, parseInt(e.target.value, 10) || 1) } }))}
                                fullWidth={false}
                                style={{ width: 58 }}
                              />
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={!draft.targetId}
                                onClick={() => transferItem(item.id, char.id, draft.targetId, draft.qty ?? 1)}
                                title= "把指定数量转移给另一名角色"
                              >
                                转移
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => consumeItem(item.id, char.id)} title= "消耗1个物品">消耗</Button>
                              <IconButton icon="trash" size="sm" tone="danger" onClick={() => deleteItemFromPool(item.id)} title= "彻底删除物品" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </Panel>
    </div>
  );
}
