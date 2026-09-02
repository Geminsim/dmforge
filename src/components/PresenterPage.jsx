import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { PRESENTATION_PROTOCOL } from '../utils/presentation';
import CutsceneStage from './CutsceneStage';
import BrandMark from './BrandMark';
import DmforgeIcon from './DmforgeIcon';
import { compactCharacterName } from '../utils/characterNames';
import { characterFootprintCells } from '../utils/characterGeometry';
import './PresenterPage.css';

const MapSystem = lazy(() => import('./MapSystem'));

// Terrain is saved under the old palette's colour names; map them to pigments
// rather than migrating the save. Fills are 45° hatches, per the plate grammar.
const TERRAIN_PIGMENT = {
  red: 'madder', amber: 'ochre', blue: 'woad',
  purple: 'accent', emerald: 'verdigris', green: 'verdigris'
};

function terrainFill(area) {
  if (area.color === 'custom' && /^#[0-9a-f]{6}$/i.test(area.customColor || '')) {
    return {
      backgroundImage: `repeating-linear-gradient(45deg, color-mix(in srgb, ${area.customColor} 22%, transparent) 0 3px, transparent 3px 7px)`,
      borderColor: area.customColor,
      color: area.customColor
    };
  }
  const color = area.color;
  const tone = TERRAIN_PIGMENT[color] || 'accent';
  const soft = tone === 'accent' ? 'var(--accent-soft)' : `var(--pigment-${tone}-soft)`;
  const line = tone === 'accent' ? 'var(--accent-line)' : `var(--pigment-${tone}-line)`;
  const ink = tone === 'accent' ? 'var(--accent)' : `var(--pigment-${tone})`;
  return {
    backgroundImage: `repeating-linear-gradient(45deg, ${soft} 0 3px, transparent 3px 7px)`,
    borderColor: line,
    color: ink
  };
}

/** Segmented HP, 13 blocks — the system has no continuous meters. */
function HpMeter({ value, max, segments = 13 }) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const filled = Math.round(ratio * segments);
  const band = ratio > 0.5 ? '' : ratio > 0.25 ? ' low' : ' critical';
  return (
    <div className="presenter-hp">
      {Array.from({ length: segments }).map((_, i) => (
        <i key={i} className={i < filled ? band.trim() : 'empty'} />
      ))}
    </div>
  );
}

function sendToController(sessionId, message) {
  if (window.opener && !window.opener.closed) window.opener.postMessage({ protocol: PRESENTATION_PROTOCOL, sessionId, ...message }, '*');
}

function CharacterAvatar({ character, large = false }) {
  const image = character?.avatarImage;
  return <span className={`presenter-avatar ${large ? 'large ' : ''}${character?.type === 'PC' ? 'pc' : 'npc'}`} style={image ? { backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}>{compactCharacterName(character?.name || '').slice(0, 2)}</span>;
}

function Initiative({ campaign, onSelect }) {
  if (!campaign.isInCombat || !campaign.combatTurnOrder.length) return <div className="presenter-empty-inline">自由行动</div>;
  return <div className="presenter-initiative">
    <div className="presenter-round"><small>ROUND</small><strong>{campaign.combatRound}</strong></div>
    {campaign.combatTurnOrder.map((entry, index) => {
      const character = campaign.characters.find(item => item.id === entry.id);
      if (!character) return null;
      const active = index === campaign.currentTurnIndex;
      return <button type="button" onClick={() => onSelect?.(character.id)} className={`presenter-order-card ${active ? 'active' : ''}`} key={entry.id}>
        <CharacterAvatar character={character} />
        <span><b>{compactCharacterName(character.name)}</b><small>先攻 {entry.total} · 顺位 {index + 1}</small></span>
        {active && <em>行动中</em>}
      </button>;
    })}
  </div>;
}

function CharacterResources({ character }) {
  return <div className="presenter-resource-grid">
    {(character.resources || []).map(resource => <div className={`presenter-resource ${resource.value <= 0 ? 'empty' : ''}`} key={resource.name}>
      <span><i className={'ph-fill ph-' + (resource.name === '动作' ? 'sword' : resource.name === '附赠动作' ? 'lightning' : /法术|魔法/.test(resource.name) ? 'sparkle' : 'diamond')} aria-hidden="true" /> {resource.name}</span>
      <b>{resource.value}/{resource.max}</b>
      <i><span style={{ width: `${resource.max ? Math.max(0, Math.min(100, resource.value / resource.max * 100)) : 0}%` }} /></i>
    </div>)}
  </div>;
}

function CharacterPanel({ character }) {
  if (!character) return <aside className="presenter-character-panel presenter-empty">点击地图棋子或行动顺序查看角色</aside>;
  const details = character.type === 'PC' ? character.details : null;
  const inventoryGroups = details ? [
    { id: 'equipment', label: '装备', icon: 'shield', items: (details.items || []).filter(item => /装备|服装|饰品|武器|工具/.test(item.category || '')) },
    { id: 'consumable', label: '消耗品', icon: 'flask', items: (details.items || []).filter(item => /消耗/.test(item.category || '')) },
    { id: 'other', label: '其他', icon: 'package', items: (details.items || []).filter(item => !/装备|服装|饰品|武器|工具|消耗/.test(item.category || '')) }
  ].filter(group => group.items.length) : [];
  return <aside className="presenter-character-panel">
    <header><CharacterAvatar character={character} large /><div><small>{character.type === 'PC' ? '玩家角色资料' : '已知目标'}</small><h2>{character.name}</h2><p>{character.class || '无职业'}{character.subclass ? ` · ${character.subclass}` : ''}{character.type === 'PC' ? ` · Lv.${character.level}` : ''}</p></div></header>
    {!details ? <div className="presenter-limited-info"><i className="ph-fill ph-eye-slash" /><span>敌人与 NPC 仅公开基础身份信息</span></div> : <>
    {character.portraitImage ? <img src={character.portraitImage} alt={`${character.name}角色肖像`} style={{ width: '100%', maxHeight: 260, objectFit: 'cover', objectPosition: 'top center', border: '1px solid var(--line-hairline)' }} /> : null}
    <div className="presenter-vitals">
      <span><i className="ph-fill ph-heart" style={{ color: 'var(--pigment-madder)' }} aria-hidden="true" /> <b>{character.hp}</b>/{character.maxHp}</span>
      <span><i className="ph-fill ph-shield" style={{ color: 'var(--pigment-woad)' }} aria-hidden="true" /> AC <b>{character.ac}</b></span>
      <span><i className="ph-fill ph-person-simple-run" style={{ color: 'var(--pigment-verdigris)' }} aria-hidden="true" /> <b>{Math.round(character.combatSpeedRemaining)}</b>/{character.speed}ft</span>
    </div>
    <HpMeter value={character.hp} max={character.maxHp} />
    <section><h3>状态效果</h3><div className="presenter-conditions">{character.conditions.length ? character.conditions.map(condition => <span key={condition.id}>{condition.name} · {condition.duration === 'permanent' ? '∞' : `${condition.duration}r`}</span>) : <i>状态正常</i>}</div></section>
    <section><h3>动作与资源</h3><CharacterResources character={character} /></section>
    <section><h3>核心能力加成</h3><div className="presenter-stat-grid">{Object.entries(details.stats || {}).map(([name, value]) => { const modifier = Math.floor((Number(value) - 10) / 2); return <span key={name} title={`${name} ${value}`}><small>{name}</small><b>{modifier >= 0 ? '+' : ''}{modifier}</b></span>; })}</div></section>
    {(details.attacks?.length || Object.keys(details.feats || {}).length) ? <section><h3>技能与专长</h3><div className="presenter-name-chips">
      {details.attacks.map((attack, index) => <span key={`attack-${attack.name}-${index}`}><i className="ph-fill ph-sword" />{attack.name}</span>)}
      {Object.keys(details.feats || {}).map(name => <span key={`feat-${name}`}><i className="ph-fill ph-star" />{name}</span>)}
    </div></section> : null}
    {(details.inventory || details.items?.length) ? <section className="presenter-inventory"><h3>背包与装备</h3><div>
      {inventoryGroups.map(group => <div className={`presenter-inventory-group ${group.id}`} key={group.id}>
        <strong><i className={`ph-fill ph-${group.icon}`} />{group.label}</strong>
        <div>{group.items.map((item, index) => <span key={`${item.name}-${index}`}>{item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</span>)}</div>
      </div>)}
      {details.inventory && <div className="presenter-inventory-note"><strong><i className="ph-fill ph-note" />角色卡记录</strong><p>{details.inventory}</p></div>}
    </div></section> : null}
    </>}
  </aside>;
}

function HistoryPanel({ events = [] }) {
  const dice = events.filter(event => event.type === 'DICE').slice(0, 6);
  const actions = events.filter(event => event.type !== 'DICE').slice(0, 8);
  const list = (items, empty) => items.length ? items.map((event, index) => <li key={`${event.timestamp}-${index}`}><small>{event.timestamp}</small><span>{event.content}</span></li>) : <li className="empty">{empty}</li>;
  return <aside className="presenter-history-panel">
    <section><h3><i className="ph-fill ph-lightning" />行动历史</h3><ol>{list(actions, '暂无公开行动')}</ol></section>
    <section><h3><i className="ph-fill ph-dice-six" />掷骰历史</h3><ol>{list(dice, '暂无掷骰记录')}</ol></section>
  </aside>;
}

const ignore = () => {};

function PlayerMapStage({ snapshot, onCharacterSelect }) {
  const { campaign, settings, camera, interaction } = snapshot;
  const [selectedMapId, setSelectedMapId] = useState(campaign.activeMapId || campaign.maps?.[0]?.id || '');
  useEffect(() => { if (campaign.activeMapId) setSelectedMapId(campaign.activeMapId); }, [campaign.activeMapId]);
  return <div className="presenter-player-view"><Suspense fallback={<div className="presenter-empty">正在载入完整玩家地图…</div>}>
    <MapSystem
      characters={campaign.characters}
      setCharacters={ignore}
      updateTokenPosition={ignore}
      addLog={ignore}
      maps={campaign.maps || (campaign.map ? [campaign.map] : [])}
      activeMapId={selectedMapId}
      setActiveMapId={setSelectedMapId}
      addMap={ignore}
      deleteMap={ignore}
      updateMap={ignore}
      isPlayerViewMode
      appRole="PLAYER"
      isInCombat={campaign.isInCombat}
      setIsInCombat={ignore}
      combatRound={campaign.combatRound}
      setCombatRound={ignore}
      currentTurnIndex={campaign.currentTurnIndex}
      setCurrentTurnIndex={ignore}
      setCombatParticipants={ignore}
      combatTurnOrder={campaign.combatTurnOrder}
      setCombatTurnOrder={ignore}
      presentationInteraction={interaction}
      presentationCamera={camera}
      presentationCameraMode={settings.cameraMode}
      compactPresentation
      onCharacterSelect={onCharacterSelect}
    />
  </Suspense></div>;
}

function MapStage({ snapshot, fill = false, onCharacterSelect }) {
  const { campaign, settings, camera } = snapshot;
  const map = campaign.map;
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const [independent, setIndependent] = useState({ scale: 1, x: 0, y: 0 });
  const activeId = campaign.combatTurnOrder[campaign.currentTurnIndex]?.id;
  const active = campaign.characters.find(character => character.id === activeId);
  const grid = 36;
  const view = useMemo(() => {
    if (settings.cameraMode === 'follow-dm') return camera;
    if (settings.cameraMode === 'independent') return independent;
    if (!active || !stageRef.current) return { scale: 1, x: 0, y: 0 };
    const rect = stageRef.current.getBoundingClientRect();
    const scale = Math.min(1.4, Math.max(.65, Math.min(rect.width / Math.max(grid, (map?.width || 1) * grid), rect.height / Math.max(grid, (map?.height || 1) * grid)) * 1.8));
    return { scale, x: rect.width / 2 - (active.gridX + .5) * grid * scale, y: rect.height / 2 - (active.gridY + .5) * grid * scale };
  }, [settings.cameraMode, camera, independent, active, map]);
  if (campaign.maps) return <PlayerMapStage snapshot={snapshot} onCharacterSelect={onCharacterSelect} />;
  if (!map) return <div className="presenter-map presenter-empty">尚未载入地图</div>;
  const wheel = event => {
    if (settings.cameraMode !== 'independent') return;
    event.preventDefault();
    setIndependent(previous => ({ ...previous, scale: Math.min(3, Math.max(.35, previous.scale * (event.deltaY > 0 ? .9 : 1.1))) }));
  };
  const pointerDown = event => {
    if (settings.cameraMode !== 'independent') return;
    dragRef.current = { clientX: event.clientX, clientY: event.clientY, x: independent.x, y: independent.y };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const pointerMove = event => {
    if (!dragRef.current || settings.cameraMode !== 'independent') return;
    setIndependent(previous => ({ ...previous, x: dragRef.current.x + event.clientX - dragRef.current.clientX, y: dragRef.current.y + event.clientY - dragRef.current.clientY }));
  };
  const pointerUp = () => { dragRef.current = null; };
  return <div className={`presenter-map ${fill ? 'fill' : ''}`} ref={stageRef} onWheel={wheel} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
    <div className="presenter-map-title">{map.name}<small>{settings.cameraMode === 'follow-active' ? '镜头跟随当前角色' : settings.cameraMode === 'follow-dm' ? '跟随主持人镜头' : '独立镜头 · 滚轮缩放'}</small></div>
    <div className="presenter-map-world" style={{ width: map.width * grid, height: map.height * grid, transform: `translate(${view.x}px,${view.y}px) scale(${view.scale})`, backgroundImage: `${map.bgUrl ? `linear-gradient(rgba(5,7,12,.34),rgba(5,7,12,.34)),url("${map.bgUrl.replaceAll('"', '%22')}")` : ''},linear-gradient(var(--grid-line) 1px,transparent 1px),linear-gradient(90deg,var(--grid-line) 1px,transparent 1px)`, backgroundSize: `${map.bgUrl ? '100% 100%,100% 100%,' : ''}${grid}px ${grid}px,${grid}px ${grid}px`, backgroundPosition: `${map.bgUrl ? 'center,center,' : ''}0 0,0 0` }}>
      {Object.keys(map.blockedCells || {}).map(key => { const [x, y] = key.split('_').map(Number); return <span className="presenter-blocked" key={key} style={{ left: x * grid, top: y * grid, width: grid, height: grid }} />; })}
      {map.terrainAreas.map(area => {
        const circle = area.type === 'circle';
        const edge = area.placement === 'edge';
        const free = edge && area.orientation === 'free';
        const dx = Number(area.endX ?? area.gridX + 1) - Number(area.gridX || 0);
        const dy = Number(area.endY ?? area.gridY) - Number(area.gridY || 0);
        const thickness = Math.max(3, Number(area.thickness || 0.15) * grid);
        const length = Math.max(1, Number(area.length || 1)) * grid;
        return <div className="presenter-terrain" key={area.id} title={area.name} style={{
          left: (area.gridX - (circle ? area.radius : 0)) * grid,
          top: (area.gridY - (circle ? area.radius : 0)) * grid,
          width: free ? Math.max(grid, Math.hypot(dx, dy) * grid) : edge ? (area.orientation === 'vertical' ? thickness : length) : (circle ? area.radius * 2 : area.width) * grid,
          height: free ? thickness : edge ? (area.orientation === 'vertical' ? length : thickness) : (circle ? area.radius * 2 : area.height) * grid,
          transform: free ? `translateY(${-thickness / 2}px) rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)` : edge && area.orientation === 'vertical' ? `translateX(${-thickness / 2}px)` : edge ? `translateY(${-thickness / 2}px)` : undefined,
          transformOrigin: free ? 'left center' : undefined,
          borderRadius: circle ? '50%' : 0,
          ...terrainFill(area),
          ...(area.suppressOutline ? { borderColor: 'transparent' } : {})
        }}>{area.featureType && area.featureType !== 'wall' && !area.id?.startsWith('vr_cage_') && <span>{area.name}</span>}</div>;
      })}
      {map.terrainAreas.filter(area => !area.featureType && area.suppressLabel !== true).map(area => {
        const x = Number(area.labelX ?? (area.type === 'circle' ? area.gridX : Number(area.gridX || 0) + Number(area.width || 1) / 2));
        const y = Number(area.labelY ?? (area.type === 'circle' ? area.gridY : Number(area.gridY || 0) + Number(area.height || 1) / 2));
        return <span className="presenter-terrain-label" key={`label-${area.id}`} style={{ left: x * grid, top: y * grid }}>{area.name}</span>;
      })}
      {campaign.characters.map(character => {
        const footprint = characterFootprintCells(character);
        return <div className={`presenter-token ${character.type === 'PC' ? 'pc' : 'npc'} ${character.id === activeId ? 'active' : ''}`} key={character.id} style={{
          left: (character.gridX + 0.5) * grid, top: (character.gridY + 0.5) * grid,
          width: footprint * grid - 4, height: footprint * grid - 4,
          transform: 'translate(-50%, -50%)',
          backgroundImage: character.avatarImage ? `url(${character.avatarImage})` : undefined,
          backgroundSize: 'cover', backgroundPosition: 'center'
        }}><b style={character.avatarImage ? { opacity: 0 } : undefined}>{compactCharacterName(character.name).slice(0, 2)}</b><small>{character.hp}/{character.maxHp}</small></div>;
      })}
    </div>
  </div>;
}

function PartyScene({ campaign }) {
  return <div className="presenter-party"><header><small>ADVENTURING PARTY</small><h1>队伍状态</h1></header><div className="presenter-party-grid">{campaign.characters.filter(character => character.type === 'PC').map(character => <article key={character.id}><div><CharacterAvatar character={character} large /><h2>{compactCharacterName(character.name)}</h2></div><div className="presenter-vitals"><span><i className="ph-fill ph-heart" style={{ color: 'var(--pigment-madder)' }} aria-hidden="true" /> {character.hp}/{character.maxHp}</span><span><i className="ph-fill ph-shield" style={{ color: 'var(--pigment-woad)' }} aria-hidden="true" /> {character.ac}</span><span><i className="ph-fill ph-person-simple-run" style={{ color: 'var(--pigment-verdigris)' }} aria-hidden="true" /> {character.speed}ft</span></div><HpMeter value={character.hp} max={character.maxHp} /><div className="presenter-conditions">{character.conditions.map(condition => <span key={condition.id}>{condition.name}</span>)}</div><CharacterResources character={character} /></article>)}</div></div>;
}

function PresenterContent({ snapshot }) {
  const { settings, campaign } = snapshot;
  const activeId = campaign.combatTurnOrder[campaign.currentTurnIndex]?.id;
  const active = campaign.characters.find(character => character.id === activeId);
  const [selectedId, setSelectedId] = useState(activeId || campaign.characters.find(character => character.type === 'PC')?.id || '');
  const [characterPanelCollapsed, setCharacterPanelCollapsed] = useState(false);
  const [historyPanelCollapsed, setHistoryPanelCollapsed] = useState(false);
  useEffect(() => {
    if (!campaign.characters.some(character => character.id === selectedId)) setSelectedId(activeId || campaign.characters[0]?.id || '');
  }, [campaign.characters, selectedId, activeId]);
  const selected = campaign.characters.find(character => character.id === selectedId) || active;
  const renderMapLayout = () => {
    const showCharacterPanel = settings.showCharacterPanel && !characterPanelCollapsed;
    const showHistoryPanel = settings.showPublicEvents && !historyPanelCollapsed;
    const panelLayout = showCharacterPanel && showHistoryPanel ? 'panels-both'
      : showCharacterPanel ? 'panels-left' : showHistoryPanel ? 'panels-right' : 'panels-none';
    return <div className={`presenter-battle-main redesigned ${panelLayout}`}>
      {showCharacterPanel && <CharacterPanel character={selected} />}
      <div className="presenter-map-shell">
        <MapStage snapshot={snapshot} fill onCharacterSelect={setSelectedId} />
        {settings.showCharacterPanel && <button
          type="button"
          className="presenter-panel-toggle left"
          aria-expanded={!characterPanelCollapsed}
          title={characterPanelCollapsed ? '展开角色资料栏' : '折叠角色资料栏'}
          onClick={() => setCharacterPanelCollapsed(value => !value)}
        ><DmforgeIcon name={characterPanelCollapsed ? 'sidebar-left' : 'sidebar-right'} size={16} /></button>}
        {settings.showPublicEvents && <button
          type="button"
          className="presenter-panel-toggle right"
          aria-expanded={!historyPanelCollapsed}
          title={historyPanelCollapsed ? '展开行动与掷骰历史' : '折叠行动与掷骰历史'}
          onClick={() => setHistoryPanelCollapsed(value => !value)}
        ><DmforgeIcon name={historyPanelCollapsed ? 'sidebar-right' : 'sidebar-left'} size={16} /></button>}
      </div>
      {showHistoryPanel && <HistoryPanel events={campaign.publicEvents} />}
    </div>;
  };
  if (settings.scene === 'pause') return <div className="presenter-pause"><div><DmforgeIcon name="pause" size={42} /></div><h1>{settings.pausedMessage}</h1><p>DMForge · 战役直播展示</p></div>;
  if (settings.scene === 'story') return <CutsceneStage scene={campaign.cutscene || {
    name: '剧情画面', title: settings.storyTitle, subtitle: settings.storySubtitle,
    mediaType: campaign.map?.bgUrl ? 'image' : 'none', mediaUrl: campaign.map?.bgUrl || '',
    effect: 'none', effectIntensity: 1, mediaFit: 'cover', vignette: true, muted: true, loop: true
  }} />;
  if (settings.scene === 'party') return <PartyScene campaign={campaign} />;
  if (campaign.maps && settings.scene === 'map') return <div className="presenter-battle redesigned reference-view">
    {renderMapLayout()}
  </div>;
  if (campaign.maps && settings.scene === 'battle') return <div className="presenter-battle redesigned">
    {settings.showInitiative && <Initiative campaign={campaign} onSelect={setSelectedId} />}
    {renderMapLayout()}
  </div>;
  if (settings.scene === 'map') return <div className="presenter-map-scene">{settings.showInitiative && <Initiative campaign={campaign} />}<MapStage snapshot={snapshot} fill /></div>;
  return <div className="presenter-battle">{settings.showInitiative && <Initiative campaign={campaign} />}<div className={`presenter-battle-main ${settings.showCharacterPanel ? '' : 'map-only'}`}><MapStage snapshot={snapshot} />{settings.showCharacterPanel && <CharacterPanel character={active} />}</div>{settings.showPublicEvents && campaign.publicEvents.length > 0 && <div className="presenter-events">{campaign.publicEvents.slice(0, 3).map((event, index) => <span key={`${event.timestamp}-${index}`}>{event.content}</span>)}</div>}</div>;
}

export default function PresenterPage() {
  const sessionId = new URLSearchParams(location.search).get('session') || '';
  const [snapshot, setSnapshot] = useState(null);
  const [connected, setConnected] = useState(false);
  const [fullscreenPrompt, setFullscreenPrompt] = useState(false);
  const lastMessageAt = useRef(0);
  const lastFullscreenRequest = useRef(0);
  useEffect(() => {
    document.title = 'DMForge · 直播展示';
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(`${PRESENTATION_PROTOCOL}:${sessionId}`) : null;
    const receive = data => {
      if (data?.protocol !== PRESENTATION_PROTOCOL || data.sessionId !== sessionId) return;
      if (data.type === 'RELOAD') { location.reload(); return; }
      if (data.type === 'SNAPSHOT' && data.snapshot) {
        setSnapshot(data.snapshot); setConnected(true); lastMessageAt.current = Date.now();
        if (data.snapshot.settings.fullscreenRequest > lastFullscreenRequest.current) setFullscreenPrompt(true);
        lastFullscreenRequest.current = data.snapshot.settings.fullscreenRequest;
      }
      if (data.type === 'PING') { sendToController(sessionId, { type: 'PONG' }); channel?.postMessage({ protocol: PRESENTATION_PROTOCOL, sessionId, type: 'PONG' }); }
    };
    const onMessage = event => { if (!window.opener || event.source === window.opener) receive(event.data); };
    const onChannel = event => receive(event.data);
    const announceClosed = () => {
      sendToController(sessionId, { type: 'CLOSED' });
      channel?.postMessage({ protocol: PRESENTATION_PROTOCOL, sessionId, type: 'CLOSED' });
    };
    window.addEventListener('message', onMessage); window.addEventListener('pagehide', announceClosed); if (channel) channel.onmessage = onChannel;
    const ready = () => { sendToController(sessionId, { type: 'READY' }); channel?.postMessage({ protocol: PRESENTATION_PROTOCOL, sessionId, type: 'READY' }); };
    ready(); const timer = setInterval(() => { ready(); if (lastMessageAt.current && Date.now() - lastMessageAt.current > 5000) setConnected(false); }, 1500);
    return () => { clearInterval(timer); window.removeEventListener('message', onMessage); window.removeEventListener('pagehide', announceClosed); channel?.close(); };
  }, [sessionId]);
  if (!snapshot) return <main data-view="player" className="presenter-root presenter-waiting"><BrandMark size={92} framed /><div className="presenter-logo">D<em>M</em>Forge</div><h1>直播展示</h1><p>{sessionId ? '正在等待主持人控制端…' : '缺少展示会话，请从 DMForge 设置中打开。'}</p></main>;
  return <main data-view="player" className={`presenter-root ${snapshot.settings.hideCursor ? 'hide-cursor' : ''}`} style={{ '--presenter-scale': snapshot.settings.fontScale }}>
    {!connected && <div className="presenter-disconnected">控制端连接中断 · 正在尝试重连</div>}
    {fullscreenPrompt && <button className="presenter-fullscreen-request" onClick={() => { document.documentElement.requestFullscreen?.(); setFullscreenPrompt(false); }}>点击进入直播全屏</button>}
    <PresenterContent snapshot={snapshot} />
    {snapshot.settings.caption && <div className="presenter-caption">{snapshot.settings.caption}</div>}
    <button className="presenter-fullscreen" title="切换全屏" onClick={() => document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.()}><DmforgeIcon name="fit-view" size={18} /></button>
  </main>;
}
