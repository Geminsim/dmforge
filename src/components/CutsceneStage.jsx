import { createCutscene } from '../utils/cutscenes';
import DmforgeIcon from './DmforgeIcon';
import './CutsceneStage.css';

const PARTICLES = Array.from({ length: 42 }, (_, index) => ({
  left: `${(index * 37) % 101}%`, delay: `${-((index * 0.31) % 6)}s`, duration: `${2.2 + (index % 7) * .37}s`, size: 2 + (index % 5)
}));

export default function CutsceneStage({ scene, compact = false }) {
  const current = scene ? createCutscene(scene) : null;
  if (!current) return <div className="cutscene-stage cutscene-empty"><div><DmforgeIcon name="film-strip" size={30} /><h2>尚未选择过场</h2><p>由主持人选择并推送一个场景后显示。</p></div></div>;
  return <div key={current.id} className={`cutscene-stage transition-${current.transition} ${compact ? 'compact' : ''}`} aria-label={`过场展示：${current.name}`}>
    {current.mediaType === 'image' && current.mediaUrl ? <img src={current.mediaUrl} alt="" style={{ objectFit: current.mediaFit }} /> : null}
    {current.mediaType === 'video' && current.mediaUrl ? <video src={current.mediaUrl} autoPlay playsInline loop={current.loop} muted={current.muted} style={{ objectFit: current.mediaFit }} /> : null}
    {!current.mediaUrl ? <div className="cutscene-media-placeholder"><DmforgeIcon name="film-strip" size={28} /><span>等待上传图片或小型循环视频</span></div> : null}
    {current.effect !== 'none' ? <div className={`cutscene-effect ${current.effect} intensity-${current.effectIntensity}`} aria-hidden="true">{PARTICLES.map((particle, index) => <i key={index} style={{ left: particle.left, animationDelay: particle.delay, animationDuration: particle.duration, width: particle.size, height: particle.size }} />)}</div> : null}
    {current.vignette ? <div className="cutscene-vignette" aria-hidden="true" /> : null}
    {(current.title || current.subtitle) ? <div className="cutscene-copy"><small>SCENE</small>{current.title ? <h1>{current.title}</h1> : null}{current.subtitle ? <p>{current.subtitle}</p> : null}</div> : null}
  </div>;
}
