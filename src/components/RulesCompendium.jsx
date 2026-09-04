import React from 'react';
import DmforgeIcon from './DmforgeIcon';
import guideMarkdown from '../../docs/DMFORGE_MAIN_PAGE_INSTRUCTIONS.md?raw';
import { filterGuideSections, guideEntryText, parseGuideMarkdown } from '../utils/guideMarkdown';

const panel = { border: 'var(--border-hairline)', borderRadius: 12, background: 'var(--surface-panel)' };
const summaryStyle = { cursor: 'pointer', padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' };
const bodyText = { color: 'var(--text-secondary)', lineHeight: 1.75, whiteSpace: 'pre-wrap' };

function pageLabel(pages = []) {
  if (!pages.length) return '—';
  return pages.length === 1 ? `${pages[0]}` : `${pages[0]}–${pages.at(-1)}`;
}

function sourceLabel(pages = []) {
  return pages.length ? `P.${pageLabel(pages)}` : '补充资料';
}

function Feature({ feature }) {
  return <article style={{ padding: '11px 0 14px', borderBottom: 'var(--border-hairline)' }}>
    <h5 style={{ margin: '0 0 6px', fontSize: 15, color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 4 }}>{feature.name}</h5>
    <div style={bodyText}>{feature.description}</div>
  </article>;
}

function ClassEntry({ item }) {
  return <details style={panel}>
    <summary style={{ ...summaryStyle, fontSize: 17 }}>{item.name}</summary>
    <div style={{ padding: '0 18px 20px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18, color: 'var(--text-secondary)', fontSize: 13 }}>
        <span>生命骰 <strong>{item.hitDice}</strong></span><span>·</span><span>AC <strong>{item.ac}</strong></span><span>·</span><span>移动 <strong>{item.speed}ft</strong></span><span>·</span><span>豁免 <strong>{(item.saves || []).join('、')}</strong></span>
      </div>
      <section style={{ marginBottom: 26 }}>
        <h3 style={{ margin: '0 0 6px', paddingBottom: 8, borderBottom: '2px solid var(--accent)', fontSize: 20 }}>职业特性</h3>
        <p style={{ margin: '0 0 6px', color: 'var(--text-faint)', fontSize: 13 }}>以下特性适用于该职业的所有子职业。</p>
        {(item.features || []).map(feature => <Feature key={`${feature.sourceRow}-${feature.name}`} feature={feature} />)}
      </section>
      {Object.entries(item.subclassFeatures || {}).map(([subclass, features]) => <section key={subclass} style={{ marginTop: 28 }}>
        <h3 style={{ margin: '0 0 10px', padding: '8px 10px', borderLeft: '4px solid var(--accent)', background: 'var(--surface-raised)', fontSize: 21 }}>{subclass}</h3>
        {features.map(feature => <Feature key={`${feature.sourceRow}-${feature.name}`} feature={feature} />)}
      </section>)}
    </div>
  </details>;
}

function ProgressionLayout({ section }) {
  return <div style={{ marginTop: 16, display: 'grid', gap: 18 }}>
    <section>
      <h4 style={{ margin: '0 0 10px', color: 'var(--accent)', fontSize: 17, textDecoration: 'underline', textUnderlineOffset: 4 }}>实力阶段</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 9 }}>
        {(section.stages || []).map((stage, index) => <article key={stage.levels} style={{ padding: 13, border: index === 3 ? '1px solid var(--pigment-ochre-line)' : 'var(--border-hairline)', borderTop: `3px solid ${index === 3 ? 'var(--pigment-ochre)' : 'var(--accent)'}`, background: index === 3 ? 'var(--pigment-ochre-soft)' : 'var(--surface-panel)', borderRadius: 8 }}><strong style={{ display: 'block', marginBottom: 5, color: index === 3 ? 'var(--pigment-ochre)' : 'var(--text-primary)', fontSize: 16 }}>{stage.levels} · {stage.name}</strong><span style={bodyText}>{stage.description}</span></article>)}
      </div>
    </section>
    <section>
      <h4 style={{ margin: '0 0 10px', color: 'var(--accent)', fontSize: 17, textDecoration: 'underline', textUnderlineOffset: 4 }}>逐级成长</h4>
      <div style={{ overflowX: 'auto', border: 'var(--border-hairline)', borderRadius: 9 }}><table style={{ width: '100%', minWidth: 580, borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: 'var(--surface-panel)', color: 'var(--accent)' }}><th style={{ padding: 10, textAlign: 'left' }}>等级</th><th style={{ padding: 10, textAlign: 'left' }}>熟练加值</th><th style={{ padding: 10, textAlign: 'left' }}>获得内容</th></tr></thead>
        <tbody>{(section.levels || []).map((row, index) => <tr key={row.level} style={{ background: index % 2 ? 'var(--surface-raised)' : 'transparent', borderTop: 'var(--border-hairline)' }}><td style={{ padding: 10 }}><strong style={{ color: 'var(--accent)' }}>Lv.{row.level}</strong></td><td style={{ padding: 10, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{row.proficiency}</td><td style={{ padding: 10, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{row.reward}</td></tr>)}</tbody>
      </table></div>
    </section>
    {(section.details || []).map(detail => <section key={detail.title} style={{ paddingTop: 12, borderTop: 'var(--border-hairline)' }}><h4 style={{ margin: '0 0 7px', fontSize: 15, color: 'var(--text-primary)' }}>{detail.title}</h4><div style={bodyText}>{detail.text}</div></section>)}
  </div>;
}

function SectionBody({ section }) {
  return <>
    <p style={{ ...bodyText, margin: '9px 0 0' }}>{section.summary}</p>
    {section.id === 'progression' ? <ProgressionLayout section={section} /> : (section.details || []).length > 0 && <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>{section.details.map(detail => <section key={detail.title} style={{ paddingTop: 12, borderTop: 'var(--border-hairline)' }}><h4 style={{ margin: '0 0 7px', fontSize: 15, color: 'var(--text-primary)' }}>{detail.title}</h4><div style={bodyText}>{detail.text}</div></section>)}</div>}
  </>;
}

function GuideInline({ children }) {
  const tokens = String(children || '').split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return tokens.map((token, index) => {
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return <a key={`${token}-${index}`} href={link[2]} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{link[1]}</a>;
    if (token.startsWith('**') && token.endsWith('**')) return <strong key={`${token}-${index}`} style={{ color: 'var(--text-primary)' }}>{token.slice(2, -2)}</strong>;
    if (token.startsWith('`') && token.endsWith('`')) return <code key={`${token}-${index}`} style={{ padding: '1px 4px', borderRadius: 4, background: 'var(--surface-sunken)', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '.92em' }}>{token.slice(1, -1)}</code>;
    return <React.Fragment key={`${token}-${index}`}>{token}</React.Fragment>;
  });
}

function guideContentBlocks(lines = []) {
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }

    const unordered = line.match(/^-\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      const type = unordered ? 'ul' : 'ol';
      const items = [];
      while (index < lines.length) {
        const candidate = lines[index].trim();
        const match = type === 'ul' ? candidate.match(/^-\s+(.+)$/) : candidate.match(/^\d+\.\s+(.+)$/);
        if (!match) break;
        items.push(match[1]);
        index += 1;
      }
      blocks.push({ type, items });
      continue;
    }

    if (line.startsWith('> ')) {
      const quote = [];
      while (index < lines.length && lines[index].trim().startsWith('> ')) {
        quote.push(lines[index].trim().slice(2));
        index += 1;
      }
      blocks.push({ type: 'quote', text: quote.join(' ') });
      continue;
    }

    const paragraph = [];
    while (index < lines.length) {
      const candidate = lines[index].trim();
      if (!candidate || /^-\s+/.test(candidate) || /^\d+\.\s+/.test(candidate) || candidate.startsWith('> ')) break;
      paragraph.push(candidate);
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }
  return blocks;
}

function GuideContent({ lines }) {
  return <div style={{ display: 'grid', gap: 9, color: 'var(--text-secondary)', lineHeight: 1.72 }}>
    {guideContentBlocks(lines).map((block, index) => {
      if (block.type === 'ul' || block.type === 'ol') {
        const List = block.type;
        return <List key={`${block.type}-${index}`} style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 5 }}>{block.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}><GuideInline>{item}</GuideInline></li>)}</List>;
      }
      if (block.type === 'quote') return <aside key={`quote-${index}`} style={{ padding: '10px 12px', borderLeft: '3px solid var(--pigment-ochre)', background: 'var(--pigment-ochre-soft)', color: 'var(--text-primary)' }}><GuideInline>{block.text}</GuideInline></aside>;
      return <p key={`paragraph-${index}`} style={{ margin: 0 }}><GuideInline>{block.text}</GuideInline></p>;
    })}
  </div>;
}

function GuideSection({ section, query }) {
  const normalized = query.trim().toLowerCase();
  const sectionOwnText = [section.title, ...(section.content || [])].join('\n').toLowerCase();
  const visibleTopics = normalized && !sectionOwnText.includes(normalized)
    ? section.topics.filter(topic => guideEntryText(topic).includes(normalized))
    : section.topics;

  return <details open={Boolean(normalized)} style={{ ...panel, background: 'var(--surface-raised)' }}>
    <summary style={{ ...summaryStyle, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent)', fontSize: 17 }}>
      <DmforgeIcon name="book-open-text" size={16} />
      <span>{section.title}</span>
      <span style={{ marginLeft: 'auto', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{section.topics.length ? `${section.topics.length} 项` : '说明'}</span>
    </summary>
    <div style={{ padding: '0 14px 14px', display: 'grid', gap: 9 }}>
      {section.content.some(line => line.trim()) && <div style={{ padding: '0 3px 7px' }}><GuideContent lines={section.content} /></div>}
      {visibleTopics.map(topic => <details key={topic.title} open={Boolean(normalized)} style={{ borderTop: 'var(--border-hairline)', background: 'var(--surface-panel)' }}>
        <summary style={{ cursor: 'pointer', padding: '11px 13px', fontWeight: 650, color: 'var(--text-primary)' }}>{topic.title}</summary>
        <div style={{ padding: '0 14px 14px' }}><GuideContent lines={topic.content} /></div>
      </details>)}
    </div>
  </details>;
}

function UserGuide({ query }) {
  const guide = React.useMemo(() => parseGuideMarkdown(guideMarkdown), []);
  const sections = React.useMemo(() => filterGuideSections(guide.sections, query), [guide.sections, query]);
  const hasMatches = sections.length > 0;

  return <details open={Boolean(query)} style={{ ...panel, marginTop: 14 }}>
    <summary style={{ ...summaryStyle, display: 'flex', alignItems: 'center', gap: 10, fontSize: 19 }}>
      <DmforgeIcon name="info" size={18} />
      <span>DMForge 使用指南</span>
      <span style={{ marginLeft: 'auto', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>18 个主题</span>
    </summary>
    <div style={{ padding: '0 14px 14px', display: 'grid', gap: 9 }}>
      {!query && <div style={{ padding: '0 4px 6px' }}><GuideContent lines={guide.introduction} /></div>}
      {hasMatches
        ? sections.map(section => <GuideSection key={section.title} section={section} query={query} />)
        : <div style={{ padding: 14, color: 'var(--text-faint)', background: 'var(--surface-raised)' }}>指南中没有匹配内容。</div>}
    </div>
  </details>;
}

export default function RulesCompendium({ ruleset }) {
  const [query, setQuery] = React.useState('');
  if (!ruleset) return <div style={{ padding: 32, color: 'var(--text-secondary)' }}>当前战役没有绑定规则资料库。</div>;

  const normalized = query.trim().toLowerCase();
  const matches = value => !normalized || JSON.stringify(value).toLowerCase().includes(normalized);
  const groupedSections = Object.groupBy((ruleset.sections || []).filter(matches), section => section.category);
  const referenceGroups = Object.entries(groupedSections).filter(([category]) => !['职业与子职业', '专长', '人物状态'].includes(category));
  const classes = (ruleset.classes || []).filter(matches);
  const featGroups = Object.groupBy((ruleset.feats || []).filter(matches), feat => feat.minimumLevel);
  const conditions = (ruleset.conditions || []).filter(matches);

  return <section style={{ minHeight: 0, flex: 1, overflow: 'auto', padding: 20 }} aria-label="规则资料库">
    <header style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
      <div><h2 style={{ margin: 0 }}>{ruleset.name}</h2><div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>版本 {ruleset.version} · {ruleset.status === 'draft' ? '草案规则' : '正式规则'}</div></div>
      <input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索规则、职业、状态或使用指南" style={{ minWidth: 280, padding: '10px 12px', borderRadius: 8, border: 'var(--border-hairline)', background: 'var(--surface-raised)', color: 'var(--text-primary)' }} />
    </header>

    {referenceGroups.map(([category, sections]) => <details key={category} open={Boolean(normalized)} style={{ ...panel, marginTop: 14 }}>
      <summary style={{ ...summaryStyle, fontSize: 19 }}>{category}</summary>
      <div style={{ padding: '0 18px 18px', display: 'grid', gap: 8 }}>
        {sections.map(section => ['战斗方式', '角色创建'].includes(category) ? <details key={section.id} open={Boolean(normalized)} style={{ ...panel, background: 'var(--surface-raised)' }}><summary style={{ ...summaryStyle, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, color: 'var(--accent)', fontSize: 17 }}><span style={{ textDecoration: 'underline', textUnderlineOffset: 4 }}>{section.title}</span><span style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{sourceLabel(section.pages)}</span></summary><div style={{ padding: '0 16px 16px' }}><SectionBody section={section} /></div></details> : <article key={section.id} style={{ padding: '13px 14px 15px', borderLeft: '3px solid var(--accent)', background: 'var(--surface-raised)' }}><div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}><h3 style={{ margin: 0, fontSize: 18, color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 4 }}>{section.title}</h3><span style={{ flex: '0 0 auto', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{sourceLabel(section.pages)}</span></div><SectionBody section={section} /></article>)}
      </div>
    </details>)}

    <details open={Boolean(normalized)} style={{ ...panel, marginTop: 14 }}>
      <summary style={{ ...summaryStyle, fontSize: 19 }}>职业与子职业</summary>
      <div style={{ padding: '0 14px 14px', display: 'grid', gap: 10 }}>{classes.map(item => <ClassEntry key={item.id} item={item} />)}</div>
    </details>

    <details open={Boolean(normalized)} style={{ ...panel, marginTop: 14 }}>
      <summary style={{ ...summaryStyle, fontSize: 19 }}>专长</summary>
      <div style={{ padding: '0 14px 14px', display: 'grid', gap: 10 }}>
        {[3, 5, 8].map(level => <details key={level} style={panel}>
          <summary style={{ ...summaryStyle, color: 'var(--accent)' }}>{level} 级专长</summary>
          <div style={{ padding: '0 18px 16px' }}>{(featGroups[level] || []).map(feat => <article key={feat.id} style={{ padding: '12px 0 16px', borderBottom: 'var(--border-hairline)' }}><h4 style={{ margin: '0 0 7px', fontSize: 17, color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 4 }}>{feat.name}</h4><div style={bodyText}>{feat.description}</div></article>)}</div>
        </details>)}
      </div>
    </details>

    <details open={Boolean(normalized)} style={{ ...panel, marginTop: 14 }}>
      <summary style={{ ...summaryStyle, fontSize: 19 }}>人物状态</summary>
      <div style={{ padding: '0 18px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>{conditions.map(condition => <article key={condition.id} style={{ padding: 12, borderLeft: '3px solid var(--accent)', background: 'var(--surface-raised)' }}><strong>{condition.name}</strong><div style={{ ...bodyText, marginTop: 5 }}>{condition.description}</div></article>)}</div>
    </details>

    {(!normalized || guideMarkdown.toLowerCase().includes(normalized)) && <UserGuide query={query} />}

    <details open style={{ ...panel, marginTop: 14 }}>
      <summary style={{ ...summaryStyle, fontSize: 18 }}>规则目录</summary>
      <div style={{ padding: '0 16px 16px', display: 'grid', gap: 7 }}>
        {ruleset.sourceDocumentUrl && <a href={ruleset.sourceDocumentUrl} target="_blank" rel="noreferrer" style={{ padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 9, background: 'var(--accent)', color: 'var(--surface-app)', textDecoration: 'none', fontWeight: 800 }}><DmforgeIcon name="book-open-text" size={17} />打开完整规则书 PDF <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.85 }}>{ruleset.sourceDocument}</span></a>}
        {Object.entries(groupedSections).map(([category, sections]) => <details key={category} style={{ borderTop: 'var(--border-hairline)' }}>
          <summary style={{ cursor: 'pointer', padding: '10px 4px', fontWeight: 650 }}>{category}</summary>
          <div style={{ padding: '0 4px 9px' }}>{sections.map(section => <div key={section.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '5px 0', color: 'var(--text-secondary)' }}><span>{section.title}</span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>P.{pageLabel(section.pages)}</span></div>)}</div>
        </details>)}
      </div>
    </details>

  </section>;
}
