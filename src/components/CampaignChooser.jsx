import React from 'react';
import { CAMPAIGN_TEMPLATES } from '../data/campaignTemplates';
import { createCampaign, deleteCampaign, ensureLegacyCampaignMigration, listCampaignRecoveryPoints, listCampaigns, restoreCampaignRecoveryPoint, setActiveCampaignId } from '../utils/campaignSnapshotStore';

const panel = { background: 'var(--surface-panel)', border: 'var(--border-hairline)', borderRadius: 16, padding: 20 };
const button = { border: 'var(--border-hairline)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)', background: 'var(--surface-raised)', cursor: 'pointer', fontWeight: 650 };

export default function CampaignChooser({ onOpen }) {
  const [campaigns, setCampaigns] = React.useState([]);
  const [busy, setBusy] = React.useState(true);
  const [error, setError] = React.useState('');

  const refresh = React.useCallback(async () => {
    setBusy(true);
    try {
      await ensureLegacyCampaignMigration();
      setCampaigns(await listCampaigns());
      setError('');
    } catch (cause) { setError(cause?.message || '无法读取战役存档'); }
    finally { setBusy(false); }
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  const createFrom = async template => {
    setBusy(true);
    try {
      const campaign = template.create();
      const entry = await createCampaign(campaign, { name: campaign.metadata.name, templateId: template.id, templateVersion: campaign.metadata.templateVersion });
      onOpen(entry.id);
    } catch (cause) { setError(cause?.message || '无法创建战役'); setBusy(false); }
  };

  const open = id => { setActiveCampaignId(id); onOpen(id); };
  const remove = async campaign => {
    if (!window.confirm(`确定删除“${campaign.name}”吗？该战役的本地恢复点也会一并删除。`)) return;
    await deleteCampaign(campaign.id);
    await refresh();
  };
  const restoreLatest = async campaign => {
    const points = await listCampaignRecoveryPoints(campaign.id);
    if (!points.length) { setError(`“${campaign.name}”目前没有可用恢复点。`); return; }
    const latest = points[0];
    if (!window.confirm(`恢复“${campaign.name}”到 ${new Date(latest.savedAt).toLocaleString()} 的版本？当前版本会先进入自动保存历史。`)) return;
    await restoreCampaignRecoveryPoint(campaign.id, latest.key);
    onOpen(campaign.id);
  };

  return <main style={{ minHeight: '100%', overflow: 'auto', background: 'var(--surface-app)', color: 'var(--text-primary)', padding: 'clamp(20px, 5vw, 72px)' }}>
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <header style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 32 }}>
        <img src="/icon-192.png" alt="DMForge" width="76" height="76" style={{ borderRadius: 18 }} />
        <div><div style={{ color: 'var(--text-secondary)', fontSize: 13, letterSpacing: 1.5 }}>DMFORGE</div><h1 style={{ margin: '4px 0 0', fontSize: 'clamp(28px, 4vw, 44px)' }}>选择要打开的战役</h1></div>
      </header>
      {error && <div role="alert" style={{ ...panel, borderColor: 'var(--danger)', marginBottom: 20 }}>{error}</div>}
      <section aria-labelledby="new-campaign-heading">
        <h2 id="new-campaign-heading">开始新战役</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {CAMPAIGN_TEMPLATES.map((template, index) => <article key={template.id} style={{ ...panel, borderColor: index === 0 ? 'var(--accent)' : undefined }}>
            <div style={{ color: index === 0 ? 'var(--accent)' : 'var(--text-secondary)', fontSize: 12 }}>{index === 0 ? '推荐 · 内置规则' : '自由创建'}</div>
            <h3 style={{ margin: '8px 0' }}>{template.name}</h3><p style={{ color: 'var(--text-secondary)', minHeight: 48 }}>{template.description}</p>
            <button type="button" style={button} disabled={busy} onClick={() => createFrom(template)}>创建并进入</button>
          </article>)}
        </div>
      </section>
      <section aria-labelledby="saves-heading" style={{ marginTop: 34 }}>
        <h2 id="saves-heading">已有存档</h2>
        {busy && !campaigns.length ? <p style={{ color: 'var(--text-secondary)' }}>正在读取存档…</p> : !campaigns.length ? <div style={panel}>尚无存档。请选择上方模板创建第一场战役。</div> :
          <div style={{ display: 'grid', gap: 10 }}>{campaigns.map(campaign => <article key={campaign.id} style={{ ...panel, padding: 16, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div><strong>{campaign.name}</strong><div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>{campaign.templateId === 'sf6-v0.9' ? 'SF6 v0.9' : campaign.templateId === 'legacy' ? '旧存档迁移' : '空白战役'} · {campaign.updatedAt ? new Date(campaign.updatedAt).toLocaleString() : '尚未保存'}</div></div>
            <div style={{ display: 'flex', gap: 8 }}><button type="button" style={button} onClick={() => open(campaign.id)}>继续</button><button type="button" style={button} onClick={() => restoreLatest(campaign)}>恢复最近备份</button><button type="button" style={{ ...button, color: 'var(--danger)' }} onClick={() => remove(campaign)}>删除</button></div>
          </article>)}</div>}
      </section>
    </div>
  </main>;
}
