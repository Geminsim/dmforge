import { useMemo, useState } from 'react';
import { Button, EmptyState, Select, TextInput, Toolbar } from '../ds';
import { createEnemyTemplate, ENEMY_CATEGORIES, enemyInventoryToItemPool, enemySkillLimits, enemyTemplateToCharacter, normalizeEnemyBestiary, randomEnemyInstanceName } from '../utils/enemyBestiary';
import { ITEM_CATEGORIES } from '../utils/inventoryRules';

const blankEnemy = () => createEnemyTemplate({ name: '', category: ENEMY_CATEGORIES[0], level: 3, skills: [{ name: '', description: '', cost: '' }] });
const fieldGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(135px,1fr))', gap: 10 };
const panel = { border: 'var(--border-hairline)', background: 'var(--surface-panel)', padding: 14, borderRadius: 10 };
const diceOptions = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
const statNames = ['力量', '速度', '耐力', '控制', '精密', '魅力'];
const describeFeatures = features => (features || []).slice(0, 2).map(feature => `${feature.name}：${String(feature.description || '').slice(0, 90)}${String(feature.description || '').length > 90 ? '…' : ''}`).join('\n');

function AttackFields({ value, onChange, prefix, removable, onRemove }) {
  return <article style={{ marginTop: 10, padding: 10, border: 'var(--border-hairline)', background: 'var(--surface-raised)', borderRadius: 8 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(105px,1fr))', gap: 8 }}>
      <input aria-label={`${prefix}名称`} placeholder="招式名称" value={value.name} onChange={event => onChange({ name: event.target.value })} />
      <input aria-label={`${prefix}消耗`} placeholder="消耗/动作" value={value.cost} onChange={event => onChange({ cost: event.target.value })} />
      <input aria-label={`${prefix}骰子数量`} title="骰子数量" type="number" min="0" max="20" value={value.diceCount} onChange={event => onChange({ diceCount: Number(event.target.value) || 0 })} />
      <select aria-label={`${prefix}伤害骰`} title="伤害骰" value={value.die} onChange={event => onChange({ die: event.target.value })}>{diceOptions.map(die => <option key={die}>{die}</option>)}</select>
      <input aria-label={`${prefix}固定伤害`} title="固定伤害" type="number" min="-100" max="100" value={value.fixed} onChange={event => onChange({ fixed: Number(event.target.value) || 0 })} />
      <input aria-label={`${prefix}伤害类型`} placeholder="伤害类型（自定义）" value={value.damageType} onChange={event => onChange({ damageType: event.target.value })} />
      {removable ? <Button size="sm" variant="ghost" onClick={onRemove} style={{ justifySelf: 'start' }}>移除</Button> : <span />}
    </div>
    <textarea aria-label={`${prefix}效果备注`} rows={2} placeholder="其他效果描述：状态、位移、触发条件等" value={value.description} onChange={event => onChange({ description: event.target.value })} style={{ boxSizing: 'border-box', width: '100%', marginTop: 8, padding: 8, background: 'var(--surface-sunken)', color: 'var(--text-body)', border: 'var(--border-hairline)' }} />
  </article>;
}

export default function EnemyBestiary({ enemyBestiary, setEnemyBestiary, characters, setCharacters, setItemPool, activeMapId, maps, addLog, ruleset }) {
  const [selectedId, setSelectedId] = useState(enemyBestiary[0]?.id || null);
  const [draft, setDraft] = useState(() => enemyBestiary[0] ? createEnemyTemplate(enemyBestiary[0]) : blankEnemy());
  const selected = enemyBestiary.find(entry => entry.id === selectedId);
  const classes = ruleset?.classes || [];
  const selectedClass = classes.find(entry => entry.name === draft.class);
  const limits = enemySkillLimits(draft.level, draft.category);
  const activeMap = maps.find(map => map.id === activeMapId);
  const countByTemplate = useMemo(() => Object.groupBy(characters.filter(character => character.enemyTemplateId), character => character.enemyTemplateId), [characters]);
  const placedByTemplate = useMemo(() => Object.groupBy(characters.filter(character => character.enemyTemplateId && character.mapId), character => character.enemyTemplateId), [characters]);
  const templatesByCategory = useMemo(() => Object.groupBy(enemyBestiary, entry => entry.category), [enemyBestiary]);
  const patch = fields => setDraft(createEnemyTemplate({ ...draft, ...fields }));

  const selectTemplate = entry => { setSelectedId(entry.id); setDraft(createEnemyTemplate(entry)); };
  const createNew = () => { const next = blankEnemy(); setSelectedId(null); setDraft(next); };
  const save = () => {
    if (!draft.name.trim()) return window.alert('请输入敌人名称。');
    if (!draft.normalAttack.name.trim()) return window.alert('请为敌人填写一个普通技。');
    if (draft.skills.filter(skill => skill.name.trim()).length < limits.min) return window.alert(`${draft.category}的 Lv.${draft.level} 模板至少需要 ${limits.min} 个必杀技。`);
    if (draft.level >= 5 && draft.category !== ENEMY_CATEGORIES[2] && draft.feats.length < 1) return window.alert('5级以上杂兵或杂兵头领至少需要 1 个专长。');
    const saved = createEnemyTemplate({
      ...draft,
      classDescription: draft.classDescription || describeFeatures(selectedClass?.features),
      subclassDescription: draft.subclassDescription || describeFeatures(selectedClass?.subclassFeatures?.[draft.subclass])
    });
    setEnemyBestiary(previous => selectedId
      ? previous.map(entry => entry.id === selectedId ? saved : entry)
      : [...previous, saved]);
    setSelectedId(saved.id);
    setDraft(saved);
  };
  const remove = () => {
    if (!selected || !window.confirm(`从图鉴删除“${selected.name}”？已放置到地图的敌人不会被删除。`)) return;
    setEnemyBestiary(previous => previous.filter(entry => entry.id !== selected.id));
    createNew();
  };
  const addSkill = () => {
    if (draft.skills.length >= limits.max) return;
    patch({ skills: [...draft.skills, { id: `skill_${Date.now()}`, name: '', description: '', cost: '' }] });
  };
  const updateSkill = (index, fields) => patch({ skills: draft.skills.map((skill, skillIndex) => skillIndex === index ? { ...skill, ...fields } : skill) });
  const chooseClass = value => {
    const definition = classes.find(entry => entry.name === value);
    patch({ class: value, subclass: '', classDescription: describeFeatures(definition?.features), subclassDescription: '', saveProficiencies: definition?.saves || [] });
  };
  const chooseSubclass = value => patch({ subclass: value, subclassDescription: describeFeatures(selectedClass?.subclassFeatures?.[value]) });
  const addToRoster = () => {
    if (!selected) return;
    const instanceName = randomEnemyInstanceName(selected, characters.map(character => character.name));
    const character = enemyTemplateToCharacter(selected, { instanceName });
    setCharacters(previous => [...previous, character]);
    setItemPool?.(previous => [...previous, ...enemyInventoryToItemPool(character)]);
    addLog?.({ type: 'SYSTEM', content: `**从敌人图鉴加入角色列表**：${character.name}。可从“怪物与NPC”分组将其拖入任意地图。`, timestamp: new Date().toLocaleTimeString() });
  };
  const spawn = () => {
    if (!selected || !activeMapId) return;
    const occupied = new Set(characters.filter(character => character.mapId === activeMapId).map(character => `${character.gridX}_${character.gridY}`));
    const point = activeMap?.spawnPoints?.find(candidate => !occupied.has(`${candidate.x}_${candidate.y}`)) || { x: 2, y: 2 };
    const instanceName = randomEnemyInstanceName(selected, characters.map(character => character.name));
    const character = enemyTemplateToCharacter(selected, { mapId: activeMapId, gridX: point.x, gridY: point.y, instanceName });
    setCharacters(previous => [...previous, character]);
    setItemPool?.(previous => [...previous, ...enemyInventoryToItemPool(character)]);
    addLog?.({ type: 'COMBAT', content: `**从敌人图鉴添加**：${character.name} 已放置到地图“${activeMap?.name || '当前地图'}”。`, timestamp: new Date().toLocaleTimeString() });
  };
  const importJson = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      const parsed = JSON.parse(text);
      const imported = normalizeEnemyBestiary(Array.isArray(parsed) ? parsed : parsed.enemies);
      setEnemyBestiary(previous => [...previous, ...imported.filter(entry => !previous.some(existing => existing.id === entry.id))]);
    }).catch(error => window.alert(`图鉴 JSON 导入失败：${error.message}`));
    event.target.value = '';
  };

  return <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(210px,34%) minmax(0,1fr)', overflow: 'hidden' }}>
    <aside style={{ borderRight: 'var(--border-hairline)', padding: 12, overflow: 'auto', background: 'var(--surface-panel)' }}>
      <Toolbar dense style={{ marginBottom: 10 }}><Button size="sm" icon="plus" onClick={createNew}>新增模板</Button><label><input hidden type="file" accept="application/json,.json" onChange={importJson} /><span style={{ cursor: 'pointer', color: 'var(--accent)', fontSize: 13 }}>导入 JSON</span></label></Toolbar>
      {enemyBestiary.length === 0 ? <EmptyState compact icon="book-open" text="图鉴尚为空。可先建立敌人模板，之后再导入完整敌人图鉴。" /> : ENEMY_CATEGORIES.map(category => <section key={category} style={{ marginBottom: 14 }}><h3 style={{ margin: '6px 3px 8px', color: 'var(--accent)', fontSize: 13 }}>{category}<span style={{ marginLeft: 6, color: 'var(--text-faint)' }}>({templatesByCategory[category]?.length || 0})</span></h3>{(templatesByCategory[category] || []).length === 0 ? <small style={{ display: 'block', padding: '4px 7px 9px', color: 'var(--text-faint)' }}>暂无内置模板</small> : templatesByCategory[category].map(entry => <button type="button" key={entry.id} onClick={() => selectTemplate(entry)} style={{ width: '100%', padding: 10, marginBottom: 7, textAlign: 'left', cursor: 'pointer', border: entry.id === selectedId ? '1px solid var(--accent)' : 'var(--border-hairline)', background: entry.id === selectedId ? 'var(--accent-soft)' : 'var(--surface-raised)', color: 'var(--text-body)', borderRadius: 8 }}><strong>{entry.name}</strong><small style={{ display: 'block', color: 'var(--text-faint)', marginTop: 3 }}>Lv.{entry.level} · {entry.class || '无职业'}{entry.subclass ? ` / ${entry.subclass}` : ''} · 名单 {countByTemplate[entry.id]?.length || 0} / 已上图 {placedByTemplate[entry.id]?.length || 0}</small></button>)}</section>)}
    </aside>
    <section style={{ padding: 18, overflow: 'auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}><div style={{ flex: '1 1 220px', minWidth: 0 }}><h2 style={{ margin: 0 }}>{selectedId ? '编辑敌人模板' : '新建敌人模板'}</h2><p style={{ margin: '5px 0 0', color: 'var(--text-faint)' }}>图鉴模板独立于角色与地图单位；先加入角色列表后，可从“怪物与NPC”分组拖到地图。</p></div><div style={{ display: 'flex', flex: '1 1 300px', flexWrap: 'wrap', gap: 8 }}>{selected && <Button variant="danger" onClick={remove}>删除模板</Button>}<Button variant="secondary" onClick={save}>保存模板</Button><Button icon="users" onClick={addToRoster} disabled={!selected}>加入角色列表</Button><Button icon="map-pin" variant="secondary" onClick={spawn} disabled={!selected || !activeMapId}>直接放到当前地图</Button></div></div>
      <div style={{ ...panel, ...fieldGrid }}>
        <TextInput label="敌人名称" value={draft.name} onChange={event => patch({ name: event.target.value })} />
        <Select label="分类" value={draft.category} onChange={event => patch({ category: event.target.value })} options={ENEMY_CATEGORIES.map(value => ({ value, label: value }))} />
        <TextInput label="等级" type="number" value={draft.level} onChange={event => patch({ level: Math.max(1, Math.min(10, Number(event.target.value) || 1)) })} />
        <Select label="职业" value={draft.class} onChange={event => chooseClass(event.target.value)} options={[{ value: '', label: '无/未知职业' }, ...classes.map(entry => ({ value: entry.name, label: entry.name }))]} />
        <Select label="子职业" value={draft.subclass} onChange={event => chooseSubclass(event.target.value)} options={[{ value: '', label: draft.level >= 3 ? '选择子职业' : '3级解锁（可预设）' }, ...(selectedClass?.subclasses || []).map(value => ({ value, label: value }))]} />
        <TextInput label="最大 HP" type="number" value={draft.maxHp} onChange={event => patch({ maxHp: Number(event.target.value) || 1 })} />
        <TextInput label="AC" type="number" value={draft.ac} onChange={event => patch({ ac: Number(event.target.value) || 0 })} />
        <TextInput label="先攻" type="number" value={draft.initiative} onChange={event => patch({ initiative: Number(event.target.value) || 0 })} />
        <TextInput label="速度" type="number" value={draft.speed} onChange={event => patch({ speed: Number(event.target.value) || 0 })} />
        <TextInput label="斗气槽" type="number" value={6} disabled hint="与玩家一致，固定 6 格" />
      </div>
      <div style={{ ...panel, marginTop: 12 }}><strong>六维属性与豁免熟练</strong><div style={{ ...fieldGrid, marginTop: 10 }}>{statNames.map(name => <label key={name} style={{ display: 'grid', gridTemplateColumns: '1fr 68px', alignItems: 'center', gap: 7, color: 'var(--text-secondary)', fontSize: 13 }}><span>{name} <input type="checkbox" checked={draft.saveProficiencies.includes(name)} onChange={event => patch({ saveProficiencies: event.target.checked ? [...draft.saveProficiencies, name] : draft.saveProficiencies.filter(value => value !== name) })} title={`${name}豁免熟练`} /></span><input aria-label={`${name}属性`} type="number" min="1" max="30" value={draft.stats[name]} onChange={event => patch({ stats: { ...draft.stats, [name]: Number(event.target.value) || 10 } })} /></label>)}</div><small style={{ display: 'block', marginTop: 8, color: 'var(--text-faint)' }}>勾选框表示该项豁免具有熟练；放置到地图时会自动换算最终豁免值。</small></div>
      <details className="bestiary-editor-group"><summary>职业与图鉴说明 <span>{draft.class || '无职业'}{draft.subclass ? ` / ${draft.subclass}` : ''}</span></summary><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12 }}><label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>职业简述<textarea rows={3} value={draft.classDescription} onChange={event => patch({ classDescription: event.target.value })} placeholder="选择职业后自动生成，可自行缩写" style={{ padding: 9, background: 'var(--surface-sunken)', color: 'var(--text-body)', border: 'var(--border-hairline)' }} /></label><label style={{ display: 'grid', gap: 6, fontWeight: 700 }}>子职业简述<textarea rows={3} value={draft.subclassDescription} onChange={event => patch({ subclassDescription: event.target.value })} placeholder="选择子职业后自动生成，可自行缩写" style={{ padding: 9, background: 'var(--surface-sunken)', color: 'var(--text-body)', border: 'var(--border-hairline)' }} /></label><label style={{ display: 'grid', gridColumn: '1 / -1', gap: 6, fontWeight: 700 }}>图鉴描述<textarea rows={3} value={draft.description} onChange={event => patch({ description: event.target.value })} style={{ padding: 9, background: 'var(--surface-sunken)', color: 'var(--text-body)', border: 'var(--border-hairline)' }} /></label></div></details>
      <div style={{ ...panel, marginTop: 12 }}><strong>普通技</strong><small style={{ display: 'block', color: 'var(--text-faint)' }}>所有敌人固定拥有一个最普通的轻／中／重攻击。</small><AttackFields value={draft.normalAttack} prefix="敌人普通技" onChange={fields => patch({ normalAttack: { ...draft.normalAttack, ...fields } })} /></div>
      <div style={{ ...panel, marginTop: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><strong>必杀技（{draft.skills.filter(skill => skill.name.trim()).length}/{limits.max}）</strong><small style={{ display: 'block', color: 'var(--text-faint)' }}>当前分类与等级要求 {limits.min}–{limits.max} 个；普通技不计入此数量。</small></div><Button size="sm" variant="secondary" onClick={addSkill} disabled={draft.skills.length >= limits.max}>添加必杀技</Button></div>{draft.skills.map((skill, index) => <AttackFields key={skill.id} value={skill} prefix={`敌人技能${index + 1}`} removable onRemove={() => patch({ skills: draft.skills.filter((_, skillIndex) => skillIndex !== index) })} onChange={fields => updateSkill(index, fields)} />)}</div>
      <details className="bestiary-editor-group"><summary>专长 <span>{draft.feats.length}</span></summary><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}><small style={{ color: 'var(--text-faint)' }}>5级以上单位通常需要专长。</small><Button size="sm" variant="secondary" onClick={() => patch({ feats: [...draft.feats, { id: `feat_${Date.now()}`, name: '', description: '' }] })}>添加专长</Button></div>{draft.feats.length === 0 ? <small style={{ display: 'block', marginTop: 8, color: 'var(--text-faint)' }}>3–4级杂兵默认没有专长。</small> : draft.feats.map((feat, index) => <div key={feat.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(105px,1fr))', gap: 8, marginTop: 9 }}><input aria-label={`敌人专长${index + 1}名称`} value={feat.name} placeholder="专长名称" onChange={event => patch({ feats: draft.feats.map((value, featIndex) => featIndex === index ? { ...value, name: event.target.value } : value) })} /><Button size="sm" variant="ghost" onClick={() => patch({ feats: draft.feats.filter((_, featIndex) => featIndex !== index) })}>移除</Button><input aria-label={`敌人专长${index + 1}描述`} value={feat.description} placeholder="简短效果" onChange={event => patch({ feats: draft.feats.map((value, featIndex) => featIndex === index ? { ...value, description: event.target.value } : value) })} style={{ gridColumn: '1 / -1' }} /></div>)}</details>
      <details className="bestiary-editor-group"><summary>装备、工具与消耗品 <span>{draft.inventory.length}</span></summary><div style={{ display: 'flex', justifyContent: 'flex-end' }}><Button size="sm" variant="secondary" onClick={() => patch({ inventory: [...draft.inventory, { id: `item_${Date.now()}`, name: '', category: '装备', quantity: 1, description: '', usage: '', weight: 0, effectValue: '' }] })}>添加物品</Button></div>{draft.inventory.map((item, index) => {
        const updateItem = fields => patch({ inventory: draft.inventory.map((value, itemIndex) => itemIndex === index ? { ...value, ...fields } : value) });
        return <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(90px,1fr))', gap: 8, marginTop: 9, paddingTop: 9, borderTop: 'var(--border-hairline)' }}>
          <input aria-label={`敌人物品${index + 1}名称`} value={item.name} placeholder="名称" onChange={event => updateItem({ name: event.target.value })} style={{ gridColumn: 'span 2' }} />
          <select aria-label={`敌人物品${index + 1}分类`} value={item.category} onChange={event => updateItem({ category: event.target.value })}>{ITEM_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select>
          <Button size="sm" variant="ghost" onClick={() => patch({ inventory: draft.inventory.filter((_, itemIndex) => itemIndex !== index) })}>移除</Button>
          <input aria-label={`敌人物品${index + 1}数量`} type="number" min="1" value={item.quantity} onChange={event => updateItem({ quantity: Number(event.target.value) || 1 })} />
          <input aria-label={`敌人物品${index + 1}重量`} type="number" min="0" step="0.01" value={item.weight ?? 0} placeholder="重量 kg/份" onChange={event => updateItem({ weight: Number(event.target.value) || 0 })} />
          <input aria-label={`敌人物品${index + 1}AC加值`} type="number" value={item.acBonus ?? 0} placeholder="AC 加值" onChange={event => updateItem({ acBonus: Number(event.target.value) || 0 })} />
          <input aria-label={`敌人物品${index + 1}效果数值`} value={item.effectValue || ''} placeholder="其他默认数值/效果" onChange={event => updateItem({ effectValue: event.target.value })} />
          <input aria-label={`敌人物品${index + 1}伤害骰数`} type="number" min="0" value={item.damageDiceCount ?? 0} placeholder="伤害骰数" onChange={event => updateItem({ damageDiceCount: Number(event.target.value) || 0 })} />
          <select aria-label={`敌人物品${index + 1}伤害骰`} value={item.damageDie || ''} onChange={event => updateItem({ damageDie: event.target.value })}><option value="">无伤害骰</option>{diceOptions.map(die => <option key={die}>{die}</option>)}</select>
          <input aria-label={`敌人物品${index + 1}固定伤害`} type="number" value={item.damageFixed ?? 0} placeholder="固定伤害" onChange={event => updateItem({ damageFixed: Number(event.target.value) || 0 })} />
          <input aria-label={`敌人物品${index + 1}伤害类型`} value={item.damageType || ''} placeholder="伤害类型" onChange={event => updateItem({ damageType: event.target.value })} />
          <input aria-label={`敌人物品${index + 1}描述`} value={item.description} placeholder="物品效果或掉落说明" onChange={event => updateItem({ description: event.target.value })} style={{ gridColumn: '1 / -1' }} />
          <input aria-label={`敌人物品${index + 1}使用说明`} value={item.usage || ''} placeholder="详细使用说明" onChange={event => updateItem({ usage: event.target.value })} style={{ gridColumn: '1 / -1' }} />
        </div>;
      })}</details>
    </section>
  </div>;
}
