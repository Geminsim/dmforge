import { useEffect, useRef, useState } from 'react';
import { calculateSf6Character, createSf6SheetData, SF6_SKILLS, SF6_STAT_ROWS, sf6CharacterFeatureMap, sf6Modifier } from '../../utils/sf6CharacterSheet';
import { resizeCharacterImage } from '../../utils/characterImages';
import BrandMark from '../BrandMark';
import DmforgeIcon from '../DmforgeIcon';
import './Sf6CharacterSheetEditor.css';
import './Sf6CharacterImages.css';
import './Sf6CharacterDensity.css';

const signed = value => value >= 0 ? `+${value}` : String(value);

function Field({ label, value, onChange, type = 'text', min, max }) {
  return <label className="sf6-field"><span>{label}</span><input type={type} min={min} max={max} value={value ?? ''} onChange={event => onChange(type === 'number' ? Number(event.target.value) : event.target.value)} /></label>;
}

function SuggestField({ label, value, onChange, suggestions, listId }) {
  return <label className="sf6-field"><span>{label}</span><input list={listId} value={value ?? ''} onChange={event => onChange(event.target.value)} /><datalist id={listId}>{suggestions.map(option => <option key={option} value={option} />)}</datalist></label>;
}

const NATIONALITY_SUGGESTIONS = ['中国', '日本', '韩国', '美国', '加拿大', '墨西哥', '巴西', '英国', '法国', '德国', '意大利', '西班牙', '俄罗斯', '印度', '泰国', '澳大利亚', '虚构国家/地区'];
const GENDER_SUGGESTIONS = ['男', '女', '非二元', '未公开', '自定义'];
const PERSONALITY_SUGGESTIONS = ['热血', '冷静', '谨慎', '豪爽', '沉着', '乐观', '孤僻', '狡黠', '正直', '自定义'];

function Section({ title, icon, customIcon, code, children, className = '', collapsible = false, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const heading = <>{customIcon ? <DmforgeIcon name={customIcon} /> : <i className={`ph-fill ph-${icon || 'diamond'}`} aria-hidden="true" />}<span>{title}</span>{code ? <small>{code}</small> : null}</>;
  if (collapsible) return <details className={`sf6-sheet-section sf6-collapsible ${className}`} open={open} onToggle={event => setOpen(event.currentTarget.open)}><summary>{heading}</summary>{children}</details>;
  return <section className={`sf6-sheet-section ${className}`}><h3>{heading}</h3>{children}</section>;
}

function DeathSaveTrack({ label, value, tone, onChange }) {
  return <div className={`sf6-save-box ${tone}`}><span><DmforgeIcon name={`death-save-${tone}`} />{label}</span><div>{[1,2,3].map(slot => <button type="button" key={slot} className={value >= slot ? 'on' : ''} aria-label={`${label} ${slot}`} aria-pressed={value >= slot} onClick={() => onChange(value === slot ? slot - 1 : slot)}><i className="ph-fill ph-diamond" aria-hidden="true" /></button>)}</div></div>;
}

function AvatarCropper({ source, onCancel, onConfirm }) {
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    const image = new Image();
    image.onload = () => {
      const size = canvas.width;
      const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight) * zoom;
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      const travelX = Math.max(0, (width - size) / 2);
      const travelY = Math.max(0, (height - size) / 2);
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, size, size);
      context.drawImage(image, (size - width) / 2 + panX / 100 * travelX, (size - height) / 2 + panY / 100 * travelY, width, height);
    };
    image.src = source;
  }, [source, zoom, panX, panY]);
  return <div className="sf6-crop-overlay" role="dialog" aria-modal="true" aria-label="裁剪角色头像">
    <div className="sf6-crop-dialog"><h3>裁剪角色头像</h3><p>拖动水平、垂直位置并缩放，使需要的部分位于正方形内。</p>
      <canvas ref={canvasRef} width="320" height="320" />
      <label>放大 / 缩小 <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={event => setZoom(Number(event.target.value))} /></label>
      <label>水平位置 <input type="range" min="-100" max="100" value={panX} onChange={event => setPanX(Number(event.target.value))} /></label>
      <label>垂直位置 <input type="range" min="-100" max="100" value={panY} onChange={event => setPanY(Number(event.target.value))} /></label>
      <div className="sf6-crop-actions"><button type="button" onClick={onCancel}>取消</button><button type="button" onClick={() => onConfirm(canvasRef.current.toDataURL('image/webp', .88))}>应用头像</button></div>
    </div>
  </div>;
}

function ImageUpload({ label, value, shape = 'portrait', onChange }) {
  const [cropSource, setCropSource] = useState('');
  const load = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (shape === 'avatar') {
        if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) throw new Error('请选择不超过 10MB 的 PNG、JPG 或 WebP 图片。');
        const reader = new FileReader();
        reader.onload = () => setCropSource(String(reader.result || ''));
        reader.onerror = () => alert('图片读取失败。');
        reader.readAsDataURL(file);
      } else onChange(await resizeCharacterImage(file, { maxDimension: 900 }));
    } catch (error) {
      alert(error.message || '图片上传失败。');
    }
  };
  return <div className={`sf6-image-upload ${shape}`}>
    <div className="sf6-image-preview">{value ? <img src={value} alt={`${label}预览`} /> : <span>{shape === 'avatar' ? '头像' : '角色肖像'}</span>}</div>
    <div><strong>{label}</strong><small>{shape === 'avatar' ? '用于地图棋子和角色缩略图，建议正方形。' : '用于完整角色资料展示，建议竖版。'}</small><label className="sf6-image-button">选择图片<input type="file" accept="image/png,image/jpeg,image/webp" onChange={load} /></label>{value ? <button type="button" onClick={() => onChange('')}>移除</button> : null}</div>
    {cropSource ? <AvatarCropper source={cropSource} onCancel={() => setCropSource('')} onConfirm={result => { onChange(result); setCropSource(''); }} /> : null}
  </div>;
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
  const selectedSkillCount = Object.values(sheet.skillProficiencies).filter(Boolean).length;

  const chooseClass = value => update({ class: value, subclass: '', sheet: createSf6SheetData({ ...sheet, statBonuses: Object.fromEntries(SF6_STAT_ROWS.map(row => [row.key, 0])) }), resources: [] });
  const chooseLevel = value => {
    const level = Math.max(1, Math.min(10, value || 1));
    update({ level, subclass: level >= 3 ? calculated.subclass : '', sheet: createSf6SheetData({ ...sheet, selectedFeats: sheet.selectedFeats.map((feat, index) => level >= featCaps[index] ? feat : '') }) });
  };
  const updateAttack = (index, field, value) => updateSheet({ attacks: sheet.attacks.map((attack, attackIndex) => attackIndex === index ? { ...attack, [field]: value } : attack) });

  return <div className="sf6-sheet" aria-label="SF6 原生角色卡编辑器">
    <div className="sf6-sheet-title"><BrandMark size={38} /><div><small>CHARACTER DOSSIER</small><strong>{calculated.name || '未命名角色'}</strong></div><span>Lv.{calculated.level || 1}</span><span>{calculated.class || '未选择职业'}</span></div>
    <Section title="角色形象" customIcon="character-card" collapsible defaultOpen={false}>
      <div className="sf6-image-grid">
        <ImageUpload label="角色头像" shape="avatar" value={sheet.avatarImage} onChange={value => updateSheet({ avatarImage: value })} />
        <ImageUpload label="角色肖像" value={sheet.portraitImage} onChange={value => updateSheet({ portraitImage: value })} />
      </div>
    </Section>
    <div className="sf6-top-grid">
      <Section title="基本信息" customIcon="character-card" code="IDENTITY">
        <div className="sf6-form-grid three">
          <Field label="角色姓名" value={calculated.name} onChange={value => update({ name: value })} />
          <label className="sf6-field"><span>角色类型</span><select value={calculated.type || 'PC'} onChange={event => update({ type: event.target.value })}><option value="PC">玩家角色</option><option value="NPC">敌对角色 / NPC</option></select></label>
          <label className="sf6-field"><span>职业</span><select value={calculated.class || ''} onChange={event => chooseClass(event.target.value)}><option value="">选择职业</option>{ruleset.classes.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
          <div className="sf6-derived"><span>熟练加值 PB</span><strong>{signed(calculated.proficiencyBonus)}</strong></div>
          <Field label="玩家姓名" value={sheet.playerName} onChange={value => updateSheet({ playerName: value })} />
          <label className="sf6-field"><span>子职业</span><select disabled={calculated.level < 3} value={calculated.subclass || ''} onChange={event => update({ subclass: event.target.value })}><option value="">{calculated.level >= 3 ? '选择子职业' : '3级解锁'}</option>{(selectedClass?.subclasses || []).map(value => <option key={value}>{value}</option>)}</select></label>
          <Field label="等级" type="number" min={1} max={10} value={calculated.level || 1} onChange={chooseLevel} />
          <SuggestField label="国籍 / 背景" listId="sf6-nationality-options" suggestions={NATIONALITY_SUGGESTIONS} value={sheet.background} onChange={value => updateSheet({ background: value })} />
          <SuggestField label="性别" listId="sf6-gender-options" suggestions={GENDER_SUGGESTIONS} value={sheet.gender} onChange={value => updateSheet({ gender: value })} />
          <SuggestField label="性格" listId="sf6-personality-options" suggestions={PERSONALITY_SUGGESTIONS} value={sheet.personality} onChange={value => updateSheet({ personality: value })} />
        </div>
      </Section>
      <div className="sf6-side-stack">
        <Section title="装备与物品" customIcon="backpack" collapsible><textarea value={sheet.inventory} onChange={event => updateSheet({ inventory: event.target.value })} rows={3} /></Section>
        <Section title="角色简介" customIcon="biography" collapsible><textarea value={sheet.biography} onChange={event => updateSheet({ biography: event.target.value })} rows={4} placeholder="年龄、身高、体重、外貌特征……" /></Section>
      </div>
    </div>

    <Section title="六围属性" icon="hexagon" code="ATTRIBUTES" collapsible>
      <div className="sf6-stat-table sf6-table-head"><span>属性</span><span>基本数值</span><span>属性增加</span><span>当前数值</span><span>调整值 Mod</span><span>豁免熟练</span><span>豁免加值</span></div>
      {SF6_STAT_ROWS.map((row, index) => {
        const base = selectedClass?.stats?.[index] ?? 10;
        const proficient = (selectedClass?.saves || []).includes(row.key);
        return <div className="sf6-stat-table" key={row.key}><strong>{row.key}</strong><span>{base}</span><input aria-label={`${row.key}属性增加`} type="number" value={sheet.statBonuses[row.key]} onChange={event => updateBonus(row.key, Number(event.target.value) || 0)} /><strong>{calculated.stats[row.key]}</strong><strong>{signed(sf6Modifier(calculated.stats[row.key]))}</strong><span className={proficient ? 'sf6-check on' : 'sf6-check'}><i className={`ph-fill ph-${proficient ? 'check-square' : 'square'}`} aria-hidden="true" /></span><strong>{signed(calculated.savingThrows[row.key])}</strong></div>;
      })}
    </Section>

    <Section title="战斗数据" icon="sword" code="COMBAT">
      <div className="sf6-combat-grid">
        <Field label="护甲等级 AC" type="number" min={0} max={100} value={calculated.ac} onChange={value => updateSheet({ acOverride: Math.max(0, Math.min(100, value || 0)) })} /><div className="sf6-derived"><span>先攻 Initiative</span><strong>{signed(calculated.initiative)}</strong></div><div className="sf6-derived"><span>速度 Speed (ft)</span><strong>{calculated.speed}</strong></div>
        <Field label="最大HP Max" type="number" min={1} value={calculated.maxHp} onChange={value => update({ maxHp: Math.max(1, value || 1) })} /><Field label="当前HP Current" type="number" min={0} value={calculated.hp ?? calculated.maxHp} onChange={value => update({ hp: Math.max(0, value || 0) })} /><Field label="临时HP Temp" type="number" min={0} value={calculated.tempHp || 0} onChange={value => update({ tempHp: Math.max(0, value || 0) })} />
        <div className="sf6-derived"><span>生命骰 Hit Dice</span><strong>{calculated.hitDice}</strong></div>
        <DeathSaveTrack label="豁免成功" tone="success" value={sheet.deathSaveSuccesses} onChange={value => updateSheet({ deathSaveSuccesses: value })} />
        <DeathSaveTrack label="豁免失败" tone="failure" value={sheet.deathSaveFailures} onChange={value => updateSheet({ deathSaveFailures: value })} />
      </div>
      <div className="sf6-passive"><span>被动察觉 Passive Perception</span><strong>{calculated.passivePerception}</strong></div>
    </Section>

    <Section title="斗气槽" icon="lightning" code="DRIVE">
      <div className="sf6-drive-grid">{sheet.drive.map((filled, index) => <button type="button" key={index} className={filled ? 'on' : ''} aria-pressed={filled} onClick={() => updateSheet({ drive: sheet.drive.map((value, slot) => slot === index ? !value : value) })}><span>槽 {index + 1}</span><i className={`ph-fill ph-${filled ? 'diamond' : 'diamond'}`} aria-hidden="true" /></button>)}</div>
    </Section>

    <Section title="攻击与施法" icon="sword" code="ATTACKS" collapsible>
      <div style={{ padding: 10, overflowX: 'auto' }}><div className="sf6-attack-row head" style={{ minWidth: 980, gridTemplateColumns: '1.25fr .62fr .48fr .58fr .55fr .85fr 1.6fr' }}><span>技能名称</span><span>攻击加值</span><span>骰数</span><span>骰面</span><span>固定值</span><span>伤害类型</span><span>效果描述 / 备注</span></div>{sheet.attacks.map((attack, index) => <div className="sf6-attack-row" style={{ minWidth: 980, gridTemplateColumns: '1.25fr .62fr .48fr .58fr .55fr .85fr 1.6fr' }} key={index}><input aria-label={`攻击${index + 1}名称`} value={attack.name} onChange={event => updateAttack(index, 'name', event.target.value)} /><input aria-label={`攻击${index + 1}加值`} value={attack.attackBonus} onChange={event => updateAttack(index, 'attackBonus', event.target.value)} /><input aria-label={`攻击${index + 1}骰子数量`} type="number" min="0" max="20" value={attack.diceCount} onChange={event => updateAttack(index, 'diceCount', Math.max(0, Math.min(20, Number(event.target.value) || 0)))} /><select aria-label={`攻击${index + 1}伤害骰`} value={attack.die} onChange={event => updateAttack(index, 'die', event.target.value)}>{['d4','d6','d8','d10','d12','d20'].map(die => <option key={die}>{die}</option>)}</select><input aria-label={`攻击${index + 1}固定伤害`} type="number" min="-100" max="100" value={attack.fixedDamage} onChange={event => updateAttack(index, 'fixedDamage', Math.max(-100, Math.min(100, Number(event.target.value) || 0)))} /><input aria-label={`攻击${index + 1}伤害类型`} placeholder="自定义" value={attack.damageType} onChange={event => updateAttack(index, 'damageType', event.target.value)} /><input aria-label={`攻击${index + 1}效果备注`} placeholder="状态、位移、触发条件等" value={attack.description} onChange={event => updateAttack(index, 'description', event.target.value)} /></div>)}</div>
    </Section>

    <Section title={`技能（${selectedSkillCount}/5）`} icon="seal-check" code="SKILLS" collapsible>
      <div className="sf6-skills"><div className="sf6-skill-row head"><span>技能</span><span>关联属性</span><span>熟练</span><span>技能总值</span></div>{SF6_SKILLS.map(skill => { const selected = Boolean(sheet.skillProficiencies[skill.id]); return <label className="sf6-skill-row" key={skill.id}><span>{skill.name} <small>{skill.english}</small></span><span>{SF6_STAT_ROWS.find(row => row.key === skill.stat)?.code}</span><input type="checkbox" checked={selected} disabled={!selected && selectedSkillCount >= 5} title={!selected && selectedSkillCount >= 5 ? '独立玩家角色卡最多导入 2 项出身熟练和 3 项自选熟练' : ''} onChange={event => updateSheet({ skillProficiencies: { ...sheet.skillProficiencies, [skill.id]: event.target.checked } })} /><strong>{signed(calculated.skillTotals[skill.id])}</strong></label>; })}</div>
    </Section>

    <Section title="特性与专长" customIcon="feat" code="FEATURES" collapsible defaultOpen={false}>
      <h4 className="sf6-subhead"><i className="ph-fill ph-list-checks" aria-hidden="true" />职业特性 <small>选择职业后自动显示</small></h4>
      <div className="sf6-feature-list">{features.length ? features.map(([name, description]) => <article key={name}><strong>{name}</strong><p>{description}</p></article>) : <p>请先选择职业和子职业。</p>}</div>
      <h4 className="sf6-subhead"><i className="ph-fill ph-lightning" aria-hidden="true" />已选专长 <small>选择后显示效果</small></h4>
      <div className="sf6-feat-table">{featCaps.map((cap, index) => { const unlocked = calculated.level >= cap; const selected = ruleset.feats.find(feat => feat.id === sheet.selectedFeats[index]); return <div className={`sf6-feat-row ${unlocked ? '' : 'locked'}`} key={cap}><strong>{index === 0 ? '3级专长' : index === 1 ? '3/5级专长' : '3/5/8级专长'}</strong><select disabled={!unlocked} value={unlocked ? sheet.selectedFeats[index] : ''} onChange={event => updateSheet({ selectedFeats: sheet.selectedFeats.map((value, featIndex) => featIndex === index ? event.target.value : value) })}><option value="">{unlocked ? '选择专长' : `${cap}级解锁`}</option>{ruleset.feats.filter(feat => feat.minimumLevel <= cap).map(feat => <option key={feat.id} value={feat.id} disabled={sheet.selectedFeats.includes(feat.id) && sheet.selectedFeats[index] !== feat.id}>{feat.name}（{feat.minimumLevel}级）</option>)}</select><p>{unlocked ? selected?.description || '选择后自动显示效果描述。' : `角色达到 ${cap} 级后开放此专长槽。`}</p></div>; })}</div>
    </Section>
  </div>;
}
