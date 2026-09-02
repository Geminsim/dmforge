export const CUTSCENE_EFFECTS = [
  { value: 'none', label: '无特效' }, { value: 'smoke', label: '烟雾' },
  { value: 'rain', label: '雨水' }, { value: 'dust', label: '灰尘' },
  { value: 'embers', label: '余烬' }, { value: 'snow', label: '飘雪' },
  { value: 'fog', label: '薄雾' }, { value: 'neon-grid', label: '虚拟网格' },
  { value: 'signal-glitch', label: '信号故障' }, { value: 'alarm', label: '警报扫光' },
  { value: 'frost', label: '冷冻雾霜' }, { value: 'dawn-rays', label: '晨光' }
];

export const CUTSCENE_TRANSITIONS = [
  { value: 'fade', label: '淡入' }, { value: 'cinematic', label: '电影推进' },
  { value: 'glitch', label: '数字故障' }, { value: 'flash', label: '闪白切入' }
];

const text = (value, max = 500) => typeof value === 'string' ? value.slice(0, max) : '';

export function createCutscene(source = {}) {
  const mediaType = source.mediaType === 'video' ? 'video' : source.mediaType === 'image' ? 'image' : 'none';
  return {
    id: text(source.id, 160) || `cutscene_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: text(source.name, 160) || '未命名过场', title: text(source.title), subtitle: text(source.subtitle, 1_000),
    mediaType, mediaUrl: text(source.mediaUrl, 8_000_000), mediaName: text(source.mediaName, 300),
    effect: CUTSCENE_EFFECTS.some(option => option.value === source.effect) ? source.effect : 'none',
    transition: CUTSCENE_TRANSITIONS.some(option => option.value === source.transition) ? source.transition : 'fade',
    effectIntensity: Math.max(1, Math.min(3, Number(source.effectIntensity) || 1)),
    vignette: source.vignette !== false, mediaFit: source.mediaFit === 'contain' ? 'contain' : 'cover',
    muted: source.muted !== false, loop: source.loop !== false
  };
}

export const normalizeCutscenes = value => Array.isArray(value) ? value.filter(item => item && typeof item === 'object').map(createCutscene) : [];

export function publicCutscene(scene) {
  if (!scene) return null;
  const normalized = createCutscene(scene);
  const validMedia = /^(data:image\/|data:video\/|https?:|blob:|\/(?!\/))/i.test(normalized.mediaUrl) ? normalized.mediaUrl : '';
  return { ...normalized, mediaUrl: validMedia };
}
