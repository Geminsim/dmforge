import { useState } from 'react';
import { Button, Checkbox, EmptyState, Select, TextInput, Toolbar } from '../ds';
import { createCutscene, CUTSCENE_EFFECTS, CUTSCENE_TRANSITIONS } from '../utils/cutscenes';
import CutsceneStage from './CutsceneStage';

const MAX_MEDIA_BYTES = 4.5 * 1024 * 1024;
const MAX_TOTAL_MEDIA_CHARS = 7_000_000;

export default function CutsceneWorkspace({ cutscenes, setCutscenes, activeCutsceneId, setActiveCutsceneId, playerDisplayMode, onPresentCutscene, onPresentMap, isPlayerViewMode }) {
  const [selectedId, setSelectedId] = useState(activeCutsceneId || cutscenes[0]?.id || null);
  const selected = cutscenes.find(scene => scene.id === selectedId) || cutscenes.find(scene => scene.id === activeCutsceneId) || null;
  const active = cutscenes.find(scene => scene.id === activeCutsceneId) || null;
  if (isPlayerViewMode) return <CutsceneStage scene={active} />;

  const update = fields => setCutscenes(previous => previous.map(scene => scene.id === selected?.id ? createCutscene({ ...scene, ...fields }) : scene));
  const add = () => {
    const scene = createCutscene({ name: `过场 ${cutscenes.length + 1}`, title: '新的场景' });
    setCutscenes(previous => [...previous, scene]); setSelectedId(scene.id);
  };
  const remove = () => {
    if (!selected || !window.confirm(`删除过场“${selected.name}”？`)) return;
    const remaining = cutscenes.filter(scene => scene.id !== selected.id);
    setCutscenes(remaining); setSelectedId(remaining[0]?.id || null);
    if (activeCutsceneId === selected.id) { setActiveCutsceneId(remaining[0]?.id || ''); onPresentMap(); }
  };
  const upload = event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || !selected) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return window.alert('请选择图片或视频文件。');
    if (file.size > MAX_MEDIA_BYTES) return window.alert('单个媒体文件不能超过 4.5MB。请压缩视频或图片后再上传。');
    const reader = new FileReader();
    reader.onload = () => {
      const nextUrl = String(reader.result || '');
      const otherTotal = cutscenes.filter(scene => scene.id !== selected.id).reduce((sum, scene) => sum + (scene.mediaUrl?.startsWith('data:') ? scene.mediaUrl.length : 0), 0);
      if (otherTotal + nextUrl.length > MAX_TOTAL_MEDIA_CHARS) return window.alert('所有过场媒体合计接近存档上限。请删除或压缩已有媒体。');
      update({ mediaType: file.type.startsWith('video/') ? 'video' : 'image', mediaUrl: nextUrl, mediaName: file.name });
    };
    reader.readAsDataURL(file);
  };

  return <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '260px minmax(0,1fr)', overflow: 'hidden' }}>
    <aside style={{ padding: 12, overflowY: 'auto', borderRight: 'var(--border-hairline)', background: 'var(--surface-panel)' }}>
      <Button icon="plus" size="sm" fullWidth onClick={add}>新建过场</Button>
      <div style={{ display: 'grid', gap: 7, marginTop: 12 }}>{cutscenes.length ? cutscenes.map(scene => <button type="button" key={scene.id} onClick={() => setSelectedId(scene.id)} style={{ padding: 10, textAlign: 'left', cursor: 'pointer', border: scene.id === selected?.id ? '1px solid var(--accent)' : 'var(--border-hairline)', background: scene.id === selected?.id ? 'var(--accent-soft)' : 'var(--surface-raised)', color: 'var(--text-body)', borderRadius: 8 }}><strong>{scene.name}</strong><small style={{ display: 'block', marginTop: 3, color: 'var(--text-faint)' }}>{scene.mediaType === 'video' ? '循环视频' : scene.mediaType === 'image' ? '图片' : '无媒体'} · {CUTSCENE_EFFECTS.find(item => item.value === scene.effect)?.label}{scene.id === activeCutsceneId ? ' · 正在展示' : ''}</small></button>) : <EmptyState compact icon="film-strip" text="还没有过场场景。" />}</div>
    </aside>
    <section style={{ display: 'grid', gridTemplateRows: 'minmax(300px,1fr) auto', minHeight: 0, overflow: 'hidden' }}>
      <div style={{ minHeight: 0, padding: 14, background: 'var(--surface-sunken)' }}><CutsceneStage scene={selected} compact /></div>
      <div style={{ maxHeight: '44vh', overflowY: 'auto', padding: 14, borderTop: 'var(--border-hairline)', background: 'var(--surface-panel)' }}>
        {selected ? <><Toolbar dense wrap><Button icon="broadcast" onClick={() => onPresentCutscene(selected.id)}>{playerDisplayMode === 'cutscene' && selected.id === activeCutsceneId ? '正在玩家端展示' : '推送到玩家端'}</Button><Button variant="secondary" icon="map-trifold" onClick={onPresentMap}>玩家端返回地图</Button><label><input hidden type="file" accept="image/*,video/*" onChange={upload} /><span style={{ display: 'inline-flex', padding: '7px 10px', cursor: 'pointer', border: 'var(--border-hairline)', color: 'var(--accent)' }}>上传图片/视频</span></label>{selected.mediaUrl ? <Button variant="secondary" onClick={() => update({ mediaType: 'none', mediaUrl: '', mediaName: '' })}>移除媒体</Button> : null}<Button variant="danger" onClick={remove}>删除过场</Button></Toolbar>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10, marginTop: 12 }}><TextInput label="场景名称" value={selected.name} onChange={event => update({ name: event.target.value })} /><TextInput label="画面标题" value={selected.title} onChange={event => update({ title: event.target.value })} /><TextInput label="副标题/旁白" value={selected.subtitle} onChange={event => update({ subtitle: event.target.value })} /><Select label="环境特效" value={selected.effect} onChange={event => update({ effect: event.target.value })} options={CUTSCENE_EFFECTS} /><Select label="入场转场" value={selected.transition} onChange={event => update({ transition: event.target.value })} options={CUTSCENE_TRANSITIONS} /><Select label="特效强度" value={String(selected.effectIntensity)} onChange={event => update({ effectIntensity: Number(event.target.value) })} options={[{ value: '1', label: '轻微' }, { value: '2', label: '中等' }, { value: '3', label: '强烈' }]} /><Select label="媒体适配" value={selected.mediaFit} onChange={event => update({ mediaFit: event.target.value })} options={[{ value: 'cover', label: '铺满画面' }, { value: 'contain', label: '完整显示' }]} /></div>
          <div style={{ display: 'flex', gap: 20, marginTop: 12 }}><Checkbox label="暗角电影遮罩" checked={selected.vignette} onChange={event => update({ vignette: event.target.checked })} />{selected.mediaType === 'video' ? <><Checkbox label="循环播放" checked={selected.loop} onChange={event => update({ loop: event.target.checked })} /><Checkbox label="静音播放" checked={selected.muted} onChange={event => update({ muted: event.target.checked })} /></> : null}<span style={{ marginLeft: 'auto', color: 'var(--text-faint)', fontSize: 12 }}>{selected.mediaName || '尚未上传媒体'} · 单文件上限4.5MB</span></div>
        </> : <EmptyState icon="film-strip" text="新建或选择一个过场后开始编辑。" />}
      </div>
    </section>
  </div>;
}
