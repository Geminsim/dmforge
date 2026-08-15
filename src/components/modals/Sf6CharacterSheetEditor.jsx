import { calculateSf6Character, createSf6SheetData, SF6_SKILLS, SF6_STAT_ROWS, sf6CharacterFeatureMap, sf6Modifier } from '../../utils/sf6CharacterSheet';
import './Sf6CharacterSheetEditor.css';

const signed = value => value >= 0 ? `+${value}` : String(value);

function Field({ label, value, onChange, type = 'text', min, max }) {
  return <label className="sf6-field"><span>{label}</span><input type={type} min={min} max={max} value={value ?? ''} onChange={event => onChange(type === 'number' ? Number(event.target.value) : event.target.value)} /></label>;
}

function Section({ title, children, className = '' }) {
  return <section className={`sf6-sheet-section ${className}`}><h3>{title}</h3>{children}</section>;
}

export default function Sf6CharacterSheetEditor({ draft, setDraft, ruleset }) {
  const calculated = calculateSf6Character(draft, ruleset);
  const sheet = createSf6SheetData(calculated.sheet);
  const selectedClass = ruleset.classes.find(item => item.name === calculated.class);
  const update = fields => setDraft(calculateSf6Character({ ...calculated, ...fields }, ruleset));
  const updateSheet = fields => update({ sheet: createSf6SheetData({ ...sheet, ...fields }) });
  const updateBonus = (stat, value) => updateSheet({ statBonuses: { ...sheet.statBonuses, [stat]: value } });
  const features = Object.entries(sf6CharacterFeatureMap(calculated, ruleset));
  const featCaps = [3, 5, 8];

  const chooseClass = value => update({ class: value, subclass: '', sheet: createSf6SheetData({ ...sheet, statBonuses: Object.fromEntries(SF6_STAT_ROWS.map(row => [row.key, 0])) }), resources: [] });
  const updateAttack = (index, field, value) => updateSheet({ attacks: sheet.attacks.map((attack, attackIndex) => attackIndex === index ? { ...attack, [field]: value } : attack) });

  return <div className="sf6-sheet" aria-label="SF6 原生角色卡编辑器">
    <div className="sf6-sheet-title">⚔ {calculated.name || 'XXX'}角色卡 ⚔</div>
    <div className="sf6-top-grid">
      <Section title="基本信息">
        <div className="sf6-form-grid three">
          <Field label="角色姓名" value={calculated.name} onChange={value => update({ name: value })} />
          <label className="sf6-field"><span>职业</span><select value={calculated.class || ''} onChange={event => chooseClass(event.target.value)}><option value="">选择职业</option>{ruleset.classes.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          <div className="sf6-derived"><span>熟练加值 PB</span><strong>{signed(calculated.proficiencyBonus)}</strong></div>
          <Field label="玩家姓名" value={sheet.playerName} onChange={value => updateSheet({ playerName: value })} />
          <label className="sf6-field"><span>子职业</span><select value={calculated.subclass || ''} onChange={event => update({ subclass: event.target.value })}><option value="">{calculated.level >= 6 ? '选择子职业' : '6级解锁（可预选）'}</option>{(selectedClass?.subclasses || []).map(value => <option key={value}>{value}</option>)}</select></label>
          <Field label="等级" type="number" min={1} max={10} value={calculated.level || 1} onChange={value => update({ level: Math.max(1, Math.min(10, value || 1)) })} />
          <Field label="背景" value={sheet.background} onChange={value => updateSheet({ background: value })} />
          <Field label="性别" value={sheet.gender} onChange={value => updateSheet({ gender: value })} />
          <Field label="性格" value={sheet.personality} onChange={value => updateSheet({ personality: value })} />
        </div>
      </Section>
      <div className="sf6-side-stack">
        <Section title="🎒 装备 / 物品栏"><textarea value={sheet.inventory} onChange={event => updateSheet({ inventory: event.target.value })} rows={3} /></Section>
        <Section title="📝 角色简介"><textarea value={sheet.biography} onChange={event => updateSheet({ biography: event.target.value })} rows={4} placeholder="年龄、身高、体重、外貌特征……" /></Section>
      </div>
    </div>

    <Section title="六围属性（选择职业后自动填充推荐值）">
      <div className="sf6-stat-table sf6-table-head"><span>属性</span><span>基本数值</span><span>属性增加</span><span>当前数值</span><span>调整值 Mod</span><span>豁免熟练</span><span>豁免加值</span></div>
      {SF6_STAT_ROWS.map((row, index) => {
        const base = selectedClass?.stats?.[index] ?? 10;
        const proficient = (selectedClass?.saves || []).includes(row.key);
        return <div className="sf6-stat-table" key={row.key}><strong>{row.key}</strong><span>{base}</span><input aria-label={`${row.key}属性增加`} type="number" value={sheet.statBonuses[row.key]} onChange={event => updateBonus(row.key, Number(event.target.value) || 0)} /><strong>{calculated.stats[row.key]}</strong><strong>{signed(sf6Modifier(calculated.stats[row.key]))}</strong><span className={proficient ? 'sf6-check on' : 'sf6-check'}>{proficient ? '■' : '□'}</span><strong>{signed(calculated.savingThrows[row.key])}</strong></div>;
      })}
    </Section>

    <Section title="战斗数据 Combat Stats">
      <div className="sf6-combat-grid">
        <div className="sf6-derived"><span>护甲等级 AC</span><strong>{calculated.ac}</strong></div><div className="sf6-derived"><span>先攻 Initiative</span><strong>{signed(calculated.initiative)}</strong></div><div className="sf6-derived"><span>速度 Speed (ft)</span><strong>{calculated.speed}</strong></div>
        <Field label="最大HP Max" type="number" min={1} value={calculated.maxHp} onChange={value => update({ maxHp: Math.max(1, value || 1) })} /><Field label="当前HP Current" type="number" min={0} value={calculated.hp ?? calculated.maxHp} onChange={value => update({ hp: Math.max(0, value || 0) })} /><Field label="临时HP Temp" type="number" min={0} value={calculated.tempHp || 0} onChange={value => update({ tempHp: Math.max(0, value || 0) })} />
        <div className="sf6-derived"><span>生命骰 Hit Dice</span><strong>{calculated.hitDice}</strong></div>
        <div className="sf6-save-box"><span>死亡豁免成功 ☑</span>{[1,2,3].map(value => <button type="button" key={value} className={sheet.deathSaveSuccesses >= value ? 'on' : ''} onClick={() => updateSheet({ deathSaveSuccesses: sheet.deathSaveSuccesses === value ? value - 1 : value })}>●</button>)}</div>
        <div className="sf6-save-box"><span>死亡豁免失败 ☒</span>{[1,2,3].map(value => <button type="button" key={value} className={sheet.deathSaveFailures >= value ? 'fail' : ''} onClick={() => updateSheet({ deathSaveFailures: sheet.deathSaveFailures === value ? value - 1 : value })}>●</button>)}</div>
      </div>
      <div className="sf6-passive"><span>被动察觉 Passive Perception</span><strong>{calculated.passivePerception}</strong></div>
    </Section>

    <Section title="斗气槽">
      <div className="sf6-drive-grid">{sheet.drive.map((filled, index) => <button type="button" key={index} className={filled ? 'on' : ''} onClick={() => updateSheet({ drive: sheet.drive.map((value, slot) => slot === index ? !value : value) })}><span>槽 {index + 1}</span><strong>{filled ? '■' : '□'}</strong></button>)}</div>
    </Section>

    <Section title="攻击与施法 Attacks & Spellcasting">
      <div className="sf6-attacks-layout"><div><div className="sf6-attack-row head"><span>武器 / 法术名称</span><span>攻击加值</span><span>伤害 / 类型</span></div>{sheet.attacks.map((attack, index) => <div className="sf6-attack-row" key={index}><input aria-label={`攻击${index + 1}名称`} value={attack.name} onChange={event => updateAttack(index, 'name', event.target.value)} /><input aria-label={`攻击${index + 1}加值`} value={attack.attackBonus} onChange={event => updateAttack(index, 'attackBonus', event.target.value)} /><input aria-label={`攻击${index + 1}伤害类型`} value={attack.damageType} onChange={event => updateAttack(index, 'damageType', event.target.value)} /></div>)}</div><label className="sf6-notes"><span>📝 攻击/施法补充说明</span><textarea value={sheet.attackNotes} onChange={event => updateSheet({ attackNotes: event.target.value })} /></label></div>
    </Section>

    <Section title="技能 Skills">
      <div className="sf6-skills"><div className="sf6-skill-row head"><span>技能</span><span>关联属性</span><span>熟练</span><span>技能总值</span></div>{SF6_SKILLS.map(skill => <label className="sf6-skill-row" key={skill.id}><span>{skill.name} <small>{skill.english}</small></span><span>{SF6_STAT_ROWS.find(row => row.key === skill.stat)?.code}</span><input type="checkbox" checked={Boolean(sheet.skillProficiencies[skill.id])} onChange={event => updateSheet({ skillProficiencies: { ...sheet.skillProficiencies, [skill.id]: event.target.checked } })} /><strong>{signed(calculated.skillTotals[skill.id])}</strong></label>)}</div>
    </Section>

    <Section title="特性与专长 Features & Traits">
      <h4 className="sf6-subhead">📋 职业特性（选择职业后自动显示；子职业特性合并显示）</h4>
      <div className="sf6-feature-list">{features.length ? features.map(([name, description]) => <article key={name}><strong>{name}</strong><p>{description}</p></article>) : <p>请先选择职业和子职业。</p>}</div>
      <h4 className="sf6-subhead">⚡ 已选专长（效果描述自动填充）</h4>
      <div className="sf6-feat-table">{featCaps.map((cap, index) => { const selected = ruleset.feats.find(feat => feat.id === sheet.selectedFeats[index]); return <div className="sf6-feat-row" key={cap}><strong>{index === 0 ? '3级专长' : index === 1 ? '3/5级专长' : '3/5/8级专长'}</strong><select value={sheet.selectedFeats[index]} onChange={event => updateSheet({ selectedFeats: sheet.selectedFeats.map((value, featIndex) => featIndex === index ? event.target.value : value) })}><option value="">选择专长</option>{ruleset.feats.filter(feat => feat.minimumLevel <= cap && feat.minimumLevel <= calculated.level).map(feat => <option key={feat.id} value={feat.id} disabled={sheet.selectedFeats.includes(feat.id) && sheet.selectedFeats[index] !== feat.id}>{feat.name}</option>)}</select><p>{selected?.description || '选择后自动显示效果描述。'}</p></div>; })}</div>
    </Section>
  </div>;
}
