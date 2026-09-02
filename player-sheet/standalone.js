(() => {
  'use strict';
  const RULES = window.DMFORGE_RULES;
  const STORAGE_KEY = 'dmforge.player-character.v1';
  const FORMAT = 'dmforge-player-character-v1';
  const BACKGROUNDS = [
    ['未选择 / 自定义', []], ['格斗世家', ['athletics','insight']], ['军旅出身', ['athletics','survival']],
    ['街头斗士', ['acrobatics','intimidation']], ['警务与安保', ['investigation','perception']], ['秘密特工', ['deception','stealth']],
    ['科研人员', ['arcana','investigation']], ['医护人员', ['medicine','insight']], ['职业运动员', ['acrobatics','athletics']],
    ['舞台艺人', ['performance','persuasion']], ['机械师', ['sleight-of-hand','investigation']], ['荒野生存者', ['survival','nature']],
    ['宗教修行者', ['religion','insight']], ['商业谈判者', ['persuasion','deception']], ['新闻记者', ['perception','investigation']],
    ['神秘学者', ['arcana','religion']]
  ].map(([name, skills]) => ({ name, skills }));
  const COUNTRIES = ['未知','中国','美国','印度','日本','德国','英国','法国','意大利','加拿大','巴西','墨西哥','澳大利亚','韩国','印度尼西亚','土耳其','沙特阿拉伯','南非','俄罗斯','阿根廷','西班牙','荷兰','瑞典','波兰','泰国','越南','菲律宾','新加坡','埃及','阿联酋'];
  const PERSONALITIES = ['INTJ 建筑师','INTP 逻辑学家','ENTJ 指挥官','ENTP 辩论家','INFJ 提倡者','INFP 调停者','ENFJ 主人公','ENFP 竞选者','ISTJ 物流师','ISFJ 守卫者','ESTJ 总经理','ESFJ 执政官','ISTP 鉴赏家','ISFP 探险家','ESTP 企业家','ESFP 表演者'];
  const $ = (selector, root = document) => root.querySelector(selector);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const signed = value => `${value >= 0 ? '+' : ''}${value}`;
  const modifier = value => Math.floor((Number(value) - 10) / 2);
  const proficiency = level => level >= 10 ? 4 : level >= 5 ? 3 : 2;
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const uuid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  function emptyAttack() { return { name: '', attackBonus: '', diceCount: 0, die: 'd6', fixedDamage: 0, damageType: '', description: '' }; }
  function freshState() {
    return {
      name: '', playerName: '', background: '', alignment: '', race: '人类', gender: '', personality: '', biography: '', inventory: '', avatarImage: '', portraitImage: '',
      class: '', subclass: '', level: 3, maxHp: 1, hp: 1, tempHp: 0, acOverride: null, deathSaveSuccesses: 0, deathSaveFailures: 0,
      statBonuses: Object.fromEntries(RULES.stats.map(row => [row.key, 0])), drive: [true, true, true, true, true, true],
      attacks: Array.from({ length: 6 }, emptyAttack), skillProficiencies: {}, selectedFeats: ['', '', '']
    };
  }
  function normalize(source = {}) {
    const base = freshState();
    const state = { ...base, ...source };
    state.level = clamp(state.level || 3, 1, 10);
    state.maxHp = clamp(state.maxHp || 1, 1, 99999);
    state.hp = clamp(state.hp ?? state.maxHp, 0, state.maxHp);
    state.tempHp = clamp(state.tempHp, 0, 99999);
    state.acOverride = source.acOverride === null || source.acOverride === '' || source.acOverride === undefined ? null : clamp(source.acOverride, 0, 100);
    state.statBonuses = Object.fromEntries(RULES.stats.map(row => [row.key, clamp(source.statBonuses?.[row.key], 0, 10)]));
    state.drive = Array.from({ length: 6 }, (_, index) => source.drive?.[index] ?? true);
    state.attacks = Array.from({ length: 6 }, (_, index) => ({ ...emptyAttack(), ...(source.attacks?.[index] || {}) }));
    const inheritedSkills = BACKGROUNDS.find(item => item.name === state.background)?.skills || [];
    const selectedExtras = Object.entries(source.skillProficiencies || {}).filter(([id, selected]) => selected && !inheritedSkills.includes(id)).slice(0, 3).map(([id]) => id);
    state.skillProficiencies = Object.fromEntries([...new Set([...inheritedSkills, ...selectedExtras])].map(id => [id, true]));
    state.selectedFeats = Array.from({ length: 3 }, (_, index) => String(source.selectedFeats?.[index] || ''));
    for (const key of ['avatarImage', 'portraitImage']) state[key] = typeof source[key] === 'string' && source[key].length <= 1500000 && /^data:image\/(?:png|jpe?g|webp);base64,/i.test(source[key]) ? source[key] : '';
    if (!RULES.classes.some(item => item.name === state.class)) state.class = '';
    const definition = getClass(state);
    if (!definition?.subclasses?.includes(state.subclass)) state.subclass = '';
    if (state.level < 3) state.subclass = '';
    return state;
  }
  function getClass(current = state) { return RULES.classes.find(item => item.name === current.class); }
  function backgroundSkills(name = state.background) { return BACKGROUNDS.find(item => item.name === name)?.skills || []; }
  function stats(current = state) {
    const definition = getClass(current);
    return Object.fromEntries(RULES.stats.map((row, index) => [row.key, (definition?.stats?.[index] ?? 10) + clamp(current.statBonuses[row.key], 0, 10)]));
  }
  function derived(current = state) {
    const definition = getClass(current);
    const values = stats(current);
    const mods = Object.fromEntries(RULES.stats.map(row => [row.key, modifier(values[row.key])]));
    const pb = proficiency(current.level);
    const skillTotals = Object.fromEntries(RULES.skills.map(skill => [skill.id, mods[skill.stat] + (current.skillProficiencies[skill.id] ? pb : 0)]));
    const speedOverrides = { 邪修派: 40, 灵动型: 40, 刺杀者: 35, 重炮手: 25, 速射手: 35, 教头: 35, 影: 35 };
    const calculatedAc = (definition?.ac ?? 10) + mods.速度;
    return { definition, values, mods, pb, skillTotals, calculatedAc, ac: current.acOverride ?? calculatedAc, initiative: mods.速度, speed: speedOverrides[current.subclass] ?? definition?.speed ?? 30, hitDice: definition?.hitDice || 'd8', passivePerception: 10 + skillTotals.perception };
  }

  let state = freshState();
  let saveTimer;
  let cropImage = null;
  try { state = normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {}); } catch { state = freshState(); }

  function setPath(path, value) {
    const key = path.replace(/^sheet\./, '');
    state[key] = value;
    scheduleSave();
  }
  function scheduleSave() {
    $('#save-status').textContent = '正在保存…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); $('#save-status').textContent = `已在本机自动保存 · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`; }
      catch { $('#save-status').textContent = '本机存储空间不足，请立即导出备份'; }
    }, 180);
  }
  function toast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('show'); setTimeout(() => node.classList.remove('show'), 2600); }

  function renderImages() {
    for (const [key, id, label] of [['avatarImage','avatar-preview','角色头像'], ['portraitImage','portrait-preview','角色肖像']]) {
      const node = $(`#${id}`);
      node.innerHTML = state[key] ? `<img src="${state[key]}" alt="${label}预览">` : `<span>${label}</span>`;
      document.querySelector(`[data-remove-image="${key}"]`).hidden = !state[key];
    }
  }
  function resizeImage(file, maxDimension) {
    if (!file?.type?.startsWith('image/')) return Promise.reject(new Error('请选择 PNG、JPG 或 WebP 图片。'));
    if (file.size > 10 * 1024 * 1024) return Promise.reject(new Error('原始图片不能超过 10MB。'));
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onerror = () => reject(new Error('图片读取失败。'));
      reader.onload = () => { const image = new Image(); image.onerror = () => reject(new Error('无法识别这张图片。')); image.onload = () => { const scale=Math.min(1,maxDimension/Math.max(image.naturalWidth,image.naturalHeight)); const canvas=document.createElement('canvas'); canvas.width=Math.max(1,Math.round(image.naturalWidth*scale)); canvas.height=Math.max(1,Math.round(image.naturalHeight*scale)); canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height); resolve(canvas.toDataURL('image/webp',.86)); }; image.src=reader.result; };
      reader.readAsDataURL(file);
    });
  }
  async function loadImage(file, key, maxDimension) {
    if (key === 'avatarImage') {
      if (!file?.type?.startsWith('image/') || file.size > 10 * 1024 * 1024) throw new Error('请选择不超过 10MB 的 PNG、JPG 或 WebP 图片。');
      const source = await new Promise((resolve, reject) => { const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=()=>reject(new Error('图片读取失败。')); reader.readAsDataURL(file); });
      cropImage = new Image();
      cropImage.onload = () => { $('#crop-zoom').value='1'; $('#crop-x').value='0'; $('#crop-y').value='0'; $('#avatar-cropper').hidden=false; renderAvatarCrop(); };
      cropImage.onerror = () => toast('无法识别这张图片。');
      cropImage.src = source;
      return;
    }
    state[key] = await resizeImage(file, maxDimension); renderImages(); scheduleSave(); toast('角色肖像已更新。');
  }
  function renderAvatarCrop() {
    if (!cropImage) return;
    const canvas=$('#crop-canvas'), size=canvas.width, zoom=Number($('#crop-zoom').value), panX=Number($('#crop-x').value), panY=Number($('#crop-y').value);
    const scale=Math.max(size/cropImage.naturalWidth,size/cropImage.naturalHeight)*zoom, width=cropImage.naturalWidth*scale, height=cropImage.naturalHeight*scale;
    const context=canvas.getContext('2d'); context.clearRect(0,0,size,size); context.drawImage(cropImage,(size-width)/2+panX/100*Math.max(0,(width-size)/2),(size-height)/2+panY/100*Math.max(0,(height-size)/2),width,height);
  }
  function closeAvatarCrop() { $('#avatar-cropper').hidden=true; cropImage=null; }

  function renderIdentity() {
    document.querySelectorAll('[data-path]').forEach(input => {
      const key = input.dataset.path.replace(/^sheet\./, '');
      if (document.activeElement !== input && !['level', 'class', 'subclass'].includes(key)) input.value = state[key] ?? '';
    });
    $('#sheet-heading').textContent = state.name || '未命名角色';
    $('#level').value = state.level;
    $('#pb').value = signed(proficiency(state.level));
    const classSelect = $('#class-select');
    classSelect.innerHTML = `<option value="">请选择职业</option>${RULES.classes.map(item => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join('')}`;
    classSelect.value = state.class;
    const subclasses = getClass()?.subclasses || [];
    const subclassSelect = $('#subclass-select');
    subclassSelect.disabled = state.level < 3 || !state.class;
    subclassSelect.title = state.level < 3 ? '子职业在 3 级解锁' : '';
    subclassSelect.innerHTML = `<option value="">${state.level < 3 ? '3 级解锁' : '请选择子职业'}</option>${subclasses.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}`;
    subclassSelect.value = state.subclass;
    const backgroundSelect = $('#background-select');
    const knownBackground = BACKGROUNDS.some(item => item.name === state.background);
    backgroundSelect.innerHTML = `${!knownBackground && state.background ? `<option value="${escapeHtml(state.background)}">自定义：${escapeHtml(state.background)}</option>` : ''}${BACKGROUNDS.map(item => `<option value="${escapeHtml(item.name === '未选择 / 自定义' ? '' : item.name)}">${escapeHtml(item.name)}</option>`).join('')}`;
    backgroundSelect.value = state.background;
    $('#alignment-select').innerHTML = `${state.alignment && !COUNTRIES.includes(state.alignment) ? `<option value="${escapeHtml(state.alignment)}">旧值：${escapeHtml(state.alignment)}</option>` : ''}<option value="">请选择</option>${COUNTRIES.map(name => `<option value="${name}">${name}</option>`).join('')}`;
    $('#alignment-select').value = state.alignment;
    $('#personality-select').innerHTML = `${state.personality && !PERSONALITIES.includes(state.personality) ? `<option value="${escapeHtml(state.personality)}">旧值：${escapeHtml(state.personality)}</option>` : ''}<option value="">请选择 / 未测试</option>${PERSONALITIES.map(name => `<option value="${name}">${name}</option>`).join('')}`;
    $('#personality-select').value = state.personality;
  }
  function renderStats() {
    const calc = derived();
    $('#stats-table tbody').innerHTML = RULES.stats.map((row, index) => {
      const base = calc.definition?.stats?.[index] ?? 10;
      const proficient = calc.definition?.saves?.includes(row.key);
      return `<tr><td>${escapeHtml(row.key)}<span class="stat-code">${row.code}</span></td><td>${base}</td><td><select data-stat="${row.key}" aria-label="${row.key}提升">${Array.from({length:11},(_,n)=>`<option value="${n}" ${state.statBonuses[row.key]===n?'selected':''}>${n}</option>`).join('')}</select></td><td class="derived">${calc.values[row.key]}</td><td class="derived">${signed(calc.mods[row.key])}</td><td class="save-prof"><span class="proficiency-mark ${proficient?'on':''}" aria-label="${proficient?'熟练':'未熟练'}"></span></td><td class="derived">${signed(calc.mods[row.key] + (proficient ? calc.pb : 0))}</td></tr>`;
    }).join('');
  }
  function renderCombat() {
    const calc = derived();
    const fields = [
      ['护甲等级 AC', `<input type="number" min="0" max="100" data-combat="acOverride" value="${calc.ac}" title="职业与速度计算值：${calc.calculatedAc}">`], ['先攻', signed(calc.initiative)], ['移动力', `${calc.speed} ft`], ['生命骰', calc.hitDice],
      ['最大生命值', `<input type="number" min="1" max="99999" data-combat="maxHp" value="${state.maxHp}">`],
      ['当前生命值', `<input type="number" min="0" max="${state.maxHp}" data-combat="hp" value="${state.hp}">`],
      ['临时生命值', `<input type="number" min="0" max="99999" data-combat="tempHp" value="${state.tempHp}">`],
      ['被动察觉', calc.passivePerception],
      ['死亡豁免成功', `<input type="number" min="0" max="3" data-combat="deathSaveSuccesses" value="${state.deathSaveSuccesses}">`],
      ['死亡豁免失败', `<input type="number" min="0" max="3" data-combat="deathSaveFailures" value="${state.deathSaveFailures}">`]
    ];
    $('#combat-grid').innerHTML = fields.map(([label,value]) => `<label class="combat-card"><span>${label}</span>${String(value).startsWith('<input') ? value : `<output>${value}</output>`}</label>`).join('');
    $('#drive-track').innerHTML = state.drive.map((active,index) => `<button type="button" class="drive ${active?'active':''}" data-drive="${index}" aria-pressed="${active}" aria-label="斗气槽 ${index+1}"><span class="drive-mark"></span></button>`).join('');
  }
  function renderAttacks() {
    const dice = ['d4','d6','d8','d10','d12','d20'];
    $('#attacks-table tbody').innerHTML = state.attacks.map((attack,index) => `<tr>
      <td>${index+1}</td>
      <td><input data-attack="${index}" data-key="name" value="${escapeHtml(attack.name)}" aria-label="招式 ${index+1} 名称"></td>
      <td><input data-attack="${index}" data-key="attackBonus" value="${escapeHtml(attack.attackBonus)}" aria-label="招式 ${index+1} 命中加值"></td>
      <td><input type="number" min="0" max="20" data-attack="${index}" data-key="diceCount" value="${clamp(attack.diceCount,0,20)}" aria-label="招式 ${index+1} 骰子数量"></td>
      <td><select data-attack="${index}" data-key="die" aria-label="招式 ${index+1} 伤害骰">${dice.map(die=>`<option ${die===attack.die?'selected':''}>${die}</option>`).join('')}</select></td>
      <td><input type="number" min="-100" max="100" data-attack="${index}" data-key="fixedDamage" value="${clamp(attack.fixedDamage,-100,100)}" aria-label="招式 ${index+1} 固定伤害"></td>
      <td><input data-attack="${index}" data-key="damageType" value="${escapeHtml(attack.damageType)}" aria-label="招式 ${index+1} 伤害类型"></td>
      <td><textarea rows="2" data-attack="${index}" data-key="description" aria-label="招式 ${index+1} 效果描述">${escapeHtml(attack.description)}</textarea></td>
    </tr>`).join('');
  }
  function renderSkills() {
    const calc = derived();
    const defaults = backgroundSkills();
    const selectedExtras = Object.entries(state.skillProficiencies).filter(([id, selected]) => selected && !defaults.includes(id)).length;
    $('#skill-count').textContent = `出身 ${defaults.length} 项 + 自选 ${selectedExtras} / 3`;
    $('#skills-grid').innerHTML = RULES.skills.map(skill => { const inherited=defaults.includes(skill.id); return `<label class="skill ${inherited?'is-background':''}"><input type="checkbox" data-skill="${skill.id}" ${state.skillProficiencies[skill.id]?'checked':''} ${inherited?'disabled':''} title="${inherited?'背景出身固定熟练，不占自选名额':''}"><span>${escapeHtml(skill.name)}${inherited?'<em>出身</em>':''}<small>${escapeHtml(skill.english)} · ${escapeHtml(skill.stat)}</small></span><output>${signed(calc.skillTotals[skill.id])}</output></label>`; }).join('');
  }
  function featureLevel(feature) { return Number.parseInt(String(feature?.name || '').match(/\d+/)?.[0] || '1', 10); }
  function renderFeatures() {
    const definition = getClass();
    const features = definition ? [...(definition.features || []), ...((definition.subclassFeatures || {})[state.subclass] || [])].filter(item => featureLevel(item) <= state.level) : [];
    const node = $('#features');
    node.classList.toggle('empty', !features.length);
    node.innerHTML = features.length ? features.map(item => `<article class="feature"><strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.description)}</p></article>`).join('') : '选择职业与子职业后，自动显示当前等级已经获得的完整特性。';
  }
  function renderFeats() {
    const unlocks = [3,5,8];
    $('#feats-grid').innerHTML = unlocks.map((unlock,index) => {
      const locked = state.level < unlock;
      const available = RULES.feats.filter(feat => Number(feat.minimumLevel || 3) <= unlock);
      const selected = RULES.feats.find(feat => feat.id === state.selectedFeats[index]);
      return `<div class="feat-slot ${locked?'locked':''}"><span>${unlock} 级专长位</span><select data-feat="${index}" ${locked?'disabled':''}><option value="">${locked?`${unlock} 级解锁`:'请选择专长'}</option>${available.map(feat=>`<option value="${escapeHtml(feat.id)}" ${feat.id===state.selectedFeats[index]?'selected':''}>${escapeHtml(feat.name)}（Lv.${feat.minimumLevel || 3}）</option>`).join('')}</select>${selected?`<div class="feat-description"><strong>${escapeHtml(selected.name)}</strong><p>${escapeHtml(selected.description)}</p></div>`:''}</div>`;
    }).join('');
  }
  function ruleDetails(details = []) { return details.map(detail => `<article class="rule-detail"><h4>${escapeHtml(detail.title)}</h4><p>${escapeHtml(detail.text)}</p></article>`).join(''); }
  function sectionHtml(section, open = false) {
    const page = section.pages?.length ? `P.${section.pages[0]}${section.pages.length > 1 ? `-${section.pages.at(-1)}` : ''}` : '';
    const progression = section.levels?.length ? `<article class="rule-detail"><h4>逐级成长</h4><p>${section.levels.map(row => `Lv.${row.level}  ${row.proficiency}  ${row.reward}`).join('\n')}</p></article>` : '';
    const stages = section.stages?.length ? `<article class="rule-detail"><h4>实力阶段</h4><p>${section.stages.map(stage => `${stage.levels} · ${stage.name}\n${stage.description}`).join('\n\n')}</p></article>` : '';
    return `<details class="rule-entry" ${open?'open':''}><summary>${escapeHtml(section.title)}<span class="rule-page">${page}</span></summary><div class="rule-body"><p>${escapeHtml(section.summary)}</p>${stages}${progression}${ruleDetails(section.details)}</div></details>`;
  }
  function classHtml(item, open = false) {
    const featureHtml = features => features.map(feature => `<article class="rule-detail"><h4>${escapeHtml(feature.name)}</h4><p>${escapeHtml(feature.description)}</p></article>`).join('');
    return `<details class="rule-entry" ${open?'open':''}><summary>${escapeHtml(item.name)}</summary><div class="rule-body"><p class="class-meta">生命骰 ${escapeHtml(item.hitDice)} · AC ${item.ac} · 移动 ${item.speed}ft · 豁免 ${(item.saves||[]).map(escapeHtml).join('、')}</p><h3 class="subclass-title">职业特性</h3>${featureHtml(item.features||[])}${Object.entries(item.subclassFeatures||{}).map(([name,features])=>`<h3 class="subclass-title">${escapeHtml(name)}</h3>${featureHtml(features)}`).join('')}</div></details>`;
  }
  function renderRules(query = '') {
    const normalized = query.trim().toLowerCase();
    const matches = value => !normalized || JSON.stringify(value).toLowerCase().includes(normalized);
    const reference = (RULES.sections || []).filter(section => !['职业与子职业','专长','人物状态'].includes(section.category) && matches(section));
    const categories = [...new Set(reference.map(section => section.category))];
    const groups = categories.map(category => `<details class="rule-group" ${normalized?'open':''}><summary>${escapeHtml(category)}</summary><div class="rule-body">${reference.filter(section=>section.category===category).map(section=>sectionHtml(section,Boolean(normalized))).join('')}</div></details>`).join('');
    const classes = (RULES.classes || []).filter(matches);
    const feats = (RULES.feats || []).filter(matches);
    const conditions = (RULES.conditions || []).filter(matches);
    const classGroup = classes.length ? `<details class="rule-group" ${normalized?'open':''}><summary>职业与子职业</summary><div class="rule-body">${classes.map(item=>classHtml(item,Boolean(normalized))).join('')}</div></details>` : '';
    const featGroup = feats.length ? `<details class="rule-group" ${normalized?'open':''}><summary>专长</summary><div class="rule-body">${[3,5,8].map(level=>{const list=feats.filter(feat=>feat.minimumLevel===level);return list.length?`<details class="rule-entry" ${normalized?'open':''}><summary>${level} 级专长</summary><div class="rule-body">${list.map(feat=>`<article class="rule-detail"><h4>${escapeHtml(feat.name)}</h4><p>${escapeHtml(feat.description)}</p></article>`).join('')}</div></details>`:'';}).join('')}</div></details>` : '';
    const conditionGroup = conditions.length ? `<details class="rule-group" ${normalized?'open':''}><summary>人物状态</summary><div class="rule-body">${conditions.map(item=>`<article class="rule-detail"><h4>${escapeHtml(item.name)}</h4><p>${escapeHtml(item.description)}</p></article>`).join('')}</div></details>` : '';
    const sourceLink = location.protocol === 'file:' ? '' : `<a class="rule-source-link" href="${escapeHtml(RULES.sourceDocumentUrl)}" target="_blank" rel="noreferrer">打开完整规则书 PDF</a>`;
    const source = !normalized ? `<div class="rule-entry"><div class="rule-body" style="padding-top:16px"><h3 style="margin:0;color:var(--gold)">完整规则书 PDF · ${escapeHtml(RULES.sourceDocument)}</h3><p>此页面已经内置相同版本的分类规则正文、职业特性与专长；在线使用时也可直接查看原始 PDF。</p>${sourceLink}</div></div>` : '';
    $('#rules-content').innerHTML = source + groups + classGroup + featGroup + conditionGroup || '<div class="rule-empty">没有找到匹配的规则。</div>';
  }
  function renderAll() { renderIdentity(); renderImages(); renderStats(); renderCombat(); renderAttacks(); renderSkills(); renderFeatures(); renderFeats(); }

  function exportPayload() {
    const calc = derived();
    const selectedFeatNames = state.selectedFeats.map(id => RULES.feats.find(feat => feat.id === id)?.name || '');
    const featureEntries = [...(calc.definition?.features || []), ...((calc.definition?.subclassFeatures || {})[state.subclass] || [])]
      .filter(item => featureLevel(item) <= state.level).map(item => [item.name, item.description]);
    for (const id of state.selectedFeats) { const feat = RULES.feats.find(item => item.id === id); if (feat) featureEntries.push([feat.name, feat.description]); }
    const resources = (RULES.resources || []).filter(item => item.name !== '超级必杀槽' || state.level >= 8).map(item => item.name === '斗气' ? { ...item, max: 6, value: state.drive.filter(Boolean).length } : { ...item, value: item.max });
    return {
      format: FORMAT, version: 1, exportedAt: new Date().toISOString(),
      character: {
        name: state.name || '未命名角色', type: 'PC', class: state.class || '未识别职业', subclass: state.subclass, level: state.level,
        race: state.race, alignment: state.alignment, hp: state.hp, maxHp: state.maxHp, tempHp: state.tempHp,
        ac: calc.ac, initiative: calc.initiative, speed: calc.speed, hitDice: calc.hitDice, stats: calc.values,
        savingThrows: Object.fromEntries(RULES.stats.map(row => [row.key, calc.mods[row.key] + (calc.definition?.saves?.includes(row.key) ? calc.pb : 0)])),
        skillTotals: calc.skillTotals, passivePerception: calc.passivePerception, proficiencyBonus: calc.pb, feats: Object.fromEntries(featureEntries), resources,
        sheet: { playerName: state.playerName, background: state.background, personality: state.personality, gender: state.gender, inventory: state.inventory, biography: state.biography, avatarImage: state.avatarImage, portraitImage: state.portraitImage, acOverride: state.acOverride, statBonuses: state.statBonuses, deathSaveSuccesses: state.deathSaveSuccesses, deathSaveFailures: state.deathSaveFailures, drive: state.drive, attacks: state.attacks, skillProficiencies: state.skillProficiencies, selectedFeats: state.selectedFeats, selectedFeatNames }
      }
    };
  }
  function download() {
    const payload = JSON.stringify(exportPayload(), null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = `DMForge-${(state.name || '未命名角色').replace(/[\\/:*?"<>|]/g,'_')}-角色卡.json`;
    link.hidden = true; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000); toast('角色卡已导出，可直接发送给 DM 导入。');
  }
  async function importFile(file) {
    if (!file || file.size > 6 * 1024 * 1024) throw new Error('角色卡文件不能超过 6MB。');
    const payload = JSON.parse(await file.text());
    if (payload.format !== FORMAT || !payload.character) throw new Error('这不是 DMForge 独立玩家角色卡。');
    const raw = payload.character, sheet = raw.sheet || {};
    state = normalize({ ...raw, ...sheet, playerName: sheet.playerName, background: sheet.background, alignment: raw.alignment, race: raw.race, gender: sheet.gender, personality: sheet.personality, biography: sheet.biography, inventory: sheet.inventory, avatarImage: sheet.avatarImage, portraitImage: sheet.portraitImage });
    renderAll(); scheduleSave(); toast(`已载入：${state.name || '未命名角色'}`);
  }

  document.addEventListener('input', event => {
    const target = event.target;
    if (['crop-zoom','crop-x','crop-y'].includes(target.id)) renderAvatarCrop();
    else if (target.id === 'rules-search') renderRules(target.value);
    else if (target.matches('[data-path]') && target.tagName !== 'SELECT') {
      const path = target.dataset.path, key = path.replace(/^sheet\./, '');
      let value = target.value;
      if (key === 'level') value = clamp(value,1,10);
      setPath(path,value);
      if (key === 'name') $('#sheet-heading').textContent = value || '未命名角色';
      if (key === 'level') { state.level=value; if(value<3)state.subclass=''; renderAll(); }
    } else if (target.matches('[data-stat]')) { state.statBonuses[target.dataset.stat]=clamp(target.value,0,10); renderStats(); renderCombat(); renderSkills(); scheduleSave(); }
    else if (target.matches('[data-combat]')) { const key=target.dataset.combat; state[key]=clamp(target.value,key==='maxHp'?1:0,key.includes('death')?3:key==='acOverride'?100:99999); if(key==='maxHp')state.hp=Math.min(state.hp,state.maxHp); scheduleSave(); }
    else if (target.matches('[data-attack]')) { const attack=state.attacks[Number(target.dataset.attack)], key=target.dataset.key; attack[key]=['diceCount','fixedDamage'].includes(key)?Number(target.value):target.value; scheduleSave(); }
  });
  document.addEventListener('change', event => {
    const target = event.target;
    if (target.id === 'avatar-file' || target.id === 'portrait-file') { const avatar=target.id==='avatar-file'; loadImage(target.files?.[0], avatar?'avatarImage':'portraitImage', avatar?320:900).catch(error=>toast(error.message||'图片上传失败')); target.value=''; }
    else if (target.id === 'class-select') { state.class=target.value; state.subclass=''; renderAll(); scheduleSave(); }
    else if (target.id === 'subclass-select') { state.subclass=target.value; renderStats(); renderCombat(); renderFeatures(); scheduleSave(); }
    else if (target.id === 'background-select') { const previousDefaults=backgroundSkills(); const extras=Object.entries(state.skillProficiencies).filter(([id,selected])=>selected&&!previousDefaults.includes(id)).map(([id])=>id).slice(0,3); state.background=target.value; const nextDefaults=backgroundSkills(); state.skillProficiencies=Object.fromEntries([...new Set([...nextDefaults,...extras])].map(id=>[id,true])); renderSkills(); renderCombat(); scheduleSave(); toast(nextDefaults.length ? `已加入“${state.background}”的 ${nextDefaults.length} 项固定熟练，仍可自选 3 项。` : '已清除背景固定熟练，仍可自行选择最多 3 项。'); }
    else if (target.id === 'alignment-select') { state.alignment=target.value; scheduleSave(); }
    else if (target.id === 'personality-select') { state.personality=target.value; scheduleSave(); }
    else if (target.matches('[data-skill]')) { const defaults=backgroundSkills(); if(defaults.includes(target.dataset.skill)){target.checked=true;return;} const extraCount=Object.entries(state.skillProficiencies).filter(([id,selected])=>selected&&!defaults.includes(id)).length; if(target.checked && !state.skillProficiencies[target.dataset.skill] && extraCount>=3){target.checked=false;toast('除背景自带熟练外，最多再选择 3 项。');return;} state.skillProficiencies[target.dataset.skill]=target.checked; renderSkills(); renderCombat(); scheduleSave(); }
    else if (target.matches('[data-feat]')) { state.selectedFeats[Number(target.dataset.feat)]=target.value; renderFeats(); scheduleSave(); }
    else if (target.id === 'import-file') { importFile(target.files?.[0]).catch(error=>{toast(error.message||'导入失败');}); target.value=''; }
  });
  document.addEventListener('click', event => {
    const cropAction = event.target.closest('[data-crop-action]')?.dataset.cropAction;
    if (cropAction === 'cancel') { closeAvatarCrop(); return; }
    if (cropAction === 'confirm') { state.avatarImage=$('#crop-canvas').toDataURL('image/webp',.88); closeAvatarCrop(); renderImages(); scheduleSave(); toast('角色头像已裁剪并更新。'); return; }
    const removeImage = event.target.closest('[data-remove-image]')?.dataset.removeImage;
    if (removeImage) { state[removeImage]=''; renderImages(); scheduleSave(); toast('图片已移除。'); return; }
    const view = event.target.closest('[data-view]')?.dataset.view;
    if (view) { $('#sheet-view').hidden=view!=='sheet'; $('#rules-view').hidden=view!=='rules'; document.querySelectorAll('[data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===view)); if(view==='rules')renderRules($('#rules-search').value); window.scrollTo(0,0); return; }
    const drive = event.target.closest('[data-drive]'); if (drive) { const index=Number(drive.dataset.drive); state.drive[index]=!state.drive[index]; renderCombat(); scheduleSave(); return; }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action==='export') download();
    if (action==='import') $('#import-file').click();
    if (action==='print') window.print();
    if (action==='reset' && confirm('确定清空当前角色卡吗？此操作会覆盖本机自动存档，建议先导出备份。')) { state=freshState(); localStorage.removeItem(STORAGE_KEY); renderAll(); scheduleSave(); toast('角色卡已清空。'); }
  });
  renderAll(); renderRules(); scheduleSave();
})();
