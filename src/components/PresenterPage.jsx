import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { PRESENTATION_PROTOCOL } from '../utils/presentation';
import './PresenterPage.css';

const MapSystem = lazy(() => import('./MapSystem'));

// Terrain is saved under the old palette's colour names; map them to pigments
// rather than migrating the save. Fills are 45° hatches, per the plate grammar.
const TERRAIN_PIGMENT = {
  red: 'madder', amber: 'ochre', blue: 'woad',
  purple: 'accent', emerald: 'verdigris', green: 'verdigris'
};

function terrainFill(color) {
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

function Initiative({ campaign }) {
  if (!campaign.isInCombat || !campaign.combatTurnOrder.length) return <div className="presenter-empty-inline">自由行动</div>;
  return <div className="presenter-initiative">
    <div className="presenter-round"><small>ROUND</small><strong>{campaign.combatRound}</strong></div>
    {campaign.combatTurnOrder.map((entry, index) => {
      const character = campaign.characters.find(item => item.id === entry.id);
      if (!character) return null;
      const active = index === campaign.currentTurnIndex;
      return <div className={`presenter-order-card ${active ? 'active' : ''}`} key={entry.id}>
        <span className={`presenter-avatar ${character.type === 'PC' ? 'pc' : 'npc'}`}>{character.name.slice(0, 2)}</span>
        <span><b>{character.name}</b><small>先攻 {entry.total} · 顺位 {index + 1}</small></span>
        {active && <em>行动中</em>}
      </div>;
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
  if (!character) return <aside className="presenter-character-panel presenter-empty">等待当前角色…</aside>;
  return <aside className="presenter-character-panel">
    <header><span className={`presenter-avatar large ${character.type === 'PC' ? 'pc' : 'npc'}`}>{character.name.slice(0, 2)}</span><div><small>当前行动角色</small><h2>{character.name}</h2></div></header>
    <div className="presenter-vitals">
      <span><i className="ph-fill ph-heart" style={{ color: 'var(--pigment-madder)' }} aria-hidden="true" /> <b>{character.hp}</b>/{character.maxHp}</span>
      <span><i className="ph-fill ph-shield" style={{ color: 'var(--pigment-woad)' }} aria-hidden="true" /> AC <b>{character.ac}</b></span>
      <span><i className="ph-fill ph-person-simple-run" style={{ color: 'var(--pigment-verdigris)' }} aria-hidden="true" /> <b>{Math.round(character.combatSpeedRemaining)}</b>/{character.speed}ft</span>
    </div>
    <HpMeter value={character.hp} max={character.maxHp} />
    <section><h3>状态效果</h3><div className="presenter-conditions">{character.conditions.length ? character.conditions.map(condition => <span key={condition.id}>{condition.name} · {condition.duration === 'permanent' ? '∞' : `${condition.duration}r`}</span>) : <i>状态正常</i>}</div></section>
    <section><h3>动作与资源</h3><CharacterResources character={character} /></section>
  </aside>;
}

const ignore = () => {};

function PlayerMapStage({ snapshot }) {
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
    />
  </Suspense></div>;
}

function MapStage({ snapshot, fill = false }) {
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
  if (campaign.maps) return <PlayerMapStage snapshot={snapshot} />;
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
    <div className="presenter-map-world" style={{ width: map.width * grid, height: map.height * grid, transform: `translate(${view.x}px,${view.y}px) scale(${view.scale})`, backgroundImage: `${map.bgUrl ? `linear-gradient(var(--surface-scrim),var(--surface-scrim)),url("${map.bgUrl.replaceAll('"', '%22')}")` : ''},linear-gradient(var(--grid-line) 1px,transparent 1px),linear-gradient(90deg,var(--grid-line) 1px,transparent 1px)`, backgroundSize: `${map.bgUrl ? 'cover,' : ''}${grid}px ${grid}px,${grid}px ${grid}px` }}>
      {Object.keys(map.blockedCells || {}).map(key => { const [x, y] = key.split('_').map(Number); return <span className="presenter-blocked" key={key} style={{ left: x * grid, top: y * grid, width: grid, height: grid }} />; })}
      {map.terrainAreas.map(area => { const circle = area.type === 'circle'; return <div className="presenter-terrain" key={area.id} title={area.name} style={{ left: (area.gridX - (circle ? area.radius : 0)) * grid, top: (area.gridY - (circle ? area.radius : 0)) * grid, width: (circle ? area.radius * 2 : area.width) * grid, height: (circle ? area.radius * 2 : area.height) * grid, borderRadius: circle ? '50%' : 0, ...terrainFill(area.color) }}><span>{area.name}</span></div>; })}
      {campaign.characters.map(character => <div className={`presenter-token ${character.type === 'PC' ? 'pc' : 'npc'} ${character.id === activeId ? 'active' : ''}`} key={character.id} style={{ left: character.gridX * grid + 2, top: character.gridY * grid + 2, width: grid - 4, height: grid - 4 }}><b>{character.name.slice(0, 2)}</b><small>{character.hp}/{character.maxHp}</small></div>)}
    </div>
  </div>;
}

function PartyScene({ campaign }) {
  return <div className="presenter-party"><header><small>ADVENTURING PARTY</small><h1>队伍状态</h1></header><div className="presenter-party-grid">{campaign.characters.filter(character => character.type === 'PC').map(character => <article key={character.id}><div><span className="presenter-avatar large pc">{character.name.slice(0, 2)}</span><h2>{character.name}</h2></div><div className="presenter-vitals"><span><i className="ph-fill ph-heart" style={{ color: 'var(--pigment-madder)' }} aria-hidden="true" /> {character.hp}/{character.maxHp}</span><span><i className="ph-fill ph-shield" style={{ color: 'var(--pigment-woad)' }} aria-hidden="true" /> {character.ac}</span><span><i className="ph-fill ph-person-simple-run" style={{ color: 'var(--pigment-verdigris)' }} aria-hidden="true" /> {character.speed}ft</span></div><HpMeter value={character.hp} max={character.maxHp} /><div className="presenter-conditions">{character.conditions.map(condition => <span key={condition.id}>{condition.name}</span>)}</div><CharacterResources character={character} /></article>)}</div></div>;
}

function PresenterContent({ snapshot }) {
  const { settings, campaign } = snapshot;
  const activeId = campaign.combatTurnOrder[campaign.currentTurnIndex]?.id;
  const active = campaign.characters.find(character => character.id === activeId);
  if (settings.scene === 'pause') return <div className="presenter-pause"><div><i className="ph-fill ph-pause" aria-hidden="true" /></div><h1>{settings.pausedMessage}</h1><p>DMForge · 战役直播展示</p></div>;
  if (settings.scene === 'story') return <div className="presenter-story" style={campaign.map?.bgUrl ? { backgroundImage: `linear-gradient(var(--surface-overlay),var(--surface-scrim)),url("${campaign.map.bgUrl.replaceAll('"', '%22')}")` } : {}}><div><small>STORY SCENE</small><h1>{settings.storyTitle}</h1><p>{settings.storySubtitle}</p></div></div>;
  if (settings.scene === 'party') return <PartyScene campaign={campaign} />;
  if (campaign.maps && (settings.scene === 'map' || settings.scene === 'battle')) return <MapStage snapshot={snapshot} fill />;
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
      if (data.type === 'SNAPSHOT' && data.snapshot) {
        setSnapshot(data.snapshot); setConnected(true); lastMessageAt.current = Date.now();
        if (data.snapshot.settings.fullscreenRequest > lastFullscreenRequest.current) setFullscreenPrompt(true);
        lastFullscreenRequest.current = data.snapshot.settings.fullscreenRequest;
      }
      if (data.type === 'PING') { sendToController(sessionId, { type: 'PONG' }); channel?.postMessage({ protocol: PRESENTATION_PROTOCOL, sessionId, type: 'PONG' }); }
    };
    const onMessage = event => { if (!window.opener || event.source === window.opener) receive(event.data); };
    const onChannel = event => receive(event.data);
    window.addEventListener('message', onMessage); if (channel) channel.onmessage = onChannel;
    const ready = () => { sendToController(sessionId, { type: 'READY' }); channel?.postMessage({ protocol: PRESENTATION_PROTOCOL, sessionId, type: 'READY' }); };
    ready(); const timer = setInterval(() => { ready(); if (lastMessageAt.current && Date.now() - lastMessageAt.current > 5000) setConnected(false); }, 1500);
    return () => { clearInterval(timer); window.removeEventListener('message', onMessage); channel?.close(); };
  }, [sessionId]);
  if (!snapshot) return <main data-view="player" className="presenter-root presenter-waiting"><div className="presenter-logo">D<em>M</em>Forge</div><h1>直播展示</h1><p>{sessionId ? '正在等待主持人控制端…' : '缺少展示会话，请从 DMForge 设置中打开。'}</p></main>;
  return <main data-view="player" className={`presenter-root ${snapshot.settings.hideCursor ? 'hide-cursor' : ''}`} style={{ '--presenter-scale': snapshot.settings.fontScale }}>
    {!connected && <div className="presenter-disconnected">控制端连接中断 · 正在尝试重连</div>}
    {fullscreenPrompt && <button className="presenter-fullscreen-request" onClick={() => { document.documentElement.requestFullscreen?.(); setFullscreenPrompt(false); }}>点击进入直播全屏</button>}
    <PresenterContent snapshot={snapshot} />
    {snapshot.settings.caption && <div className="presenter-caption">{snapshot.settings.caption}</div>}
    <button className="presenter-fullscreen" title="切换全屏" onClick={() => document.fullscreenElement ? document.exitFullscreen?.() : document.documentElement.requestFullscreen?.()}><i className="ph-fill ph-corners-out" aria-hidden="true" /></button>
  </main>;
}
