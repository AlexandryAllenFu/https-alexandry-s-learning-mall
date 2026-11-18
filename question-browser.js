function questionBrowser(id) {
  const stored = localStorage.getItem('mth026-last-question');
  const index = Math.max(0, Math.min(QUESTION_INDEX.length - 1, Math.trunc(Number(id ?? stored)) || 0));
  const question = QUESTION_INDEX[index];
  if (!question) return head('','全部题目','暂无题目。');
  localStorage.setItem('mth026-last-question', String(index));
  const source = MATERIALS.find(item => item.id === question.source);

  const controls = `<div class="actions">${index > 0 ? `<a class="button" href="#questions/${index-1}">← 上一题</a>` : ''}${index + 1 < QUESTION_INDEX.length ? `<a class="button primary" href="#questions/${index+1}">下一题 →</a>` : ''}</div>`;
  return head(`第 ${index+1} / ${QUESTION_INDEX.length} 题`, '全部题目', `${esc(source.name)} · 第 ${esc(question.number)} 题 · 原文第 ${question.page} 页 · ${esc(question.scope)}`) +
    `<div class="toolbar"><select aria-label="选择题目" onchange="location.hash='questions/'+this.value">${QUESTION_INDEX.map((q,i)=>`<option value="${i}" ${i===index?'selected':''}>${i+1}. ${esc(MATERIALS.find(m=>m.id===q.source).name)} · ${esc(q.number)}（第 ${q.page} 页）</option>`).join('')}</select></div>` +
    controls +
    `<section class="card question-sheet"><h3>原题</h3>${question.images.map(path=>`<img src="${esc(path)}" alt="第 ${esc(question.number)} 题原文">`).join('')}<button onclick="openMaterial('${question.source}',${question.page})">查看完整资料</button></section>` +
    questionStudyPanel(index, question) +
    controls;
}

const TRANSFER=[
 '先分别求出分子两项，再做相减和因式分解。写清约分所要求的非零条件。', '先代入判断极限形式，再选连续性、主项比较、三角或指数标准极限。最后核对趋近方向与定义域。',
 '先统一年利率和时间单位，再根据连续或离散计息选模型。反求时间时两侧取对数。',
 '先检查目标点是否定义，再独立求左右极限。要连续时令双方等于该点的函数值。',
 '查整段连续性，计算端点函数值，再用介值定理。唯一性需另证，例如严格单调。',
 '识别差商、求导点和增量；分段接点先对齐点值，再比较左右差商。',
 '先核验给定点在曲线上，再算导数并用点斜式。水平切线要求斜率存在且为零。',
 '识别最外层是乘积还是商，逐项求导后再化简；保留分母与三角函数的限制。',
 '从外到内拆复合层，逐层乘内层导数。给抽象函数时先写符号式，再代入数值。',
 '逐次求导并核对次数、系数与正负号。位置、速度和加速度按时间依次求导。',
 '先判断题型：反函数找原像，隐式收集 y′，变量幂取对数，反三角结合链式。最后核对适用条件。',
 '从题干提取所求导数和单位，写变量之间的关系，对时间求导后再代入该时刻的数据。',
 '列出端点、驻点和定义域内的不可导点，再比较所有候选函数值。',
 '按定义域及导数符号划分区间；判断拐点时检查两侧凹凸性是否改变。'
];
function getQuestionSolution(q){
  return QUESTION_SOLUTIONS[q.source+':'+q.number];
}
function renderQuestionSolution(q){
  const s=getQuestionSolution(q);
  if(!s)return '<section class="card"><h3>逐题详解待补充</h3><p>此条保留原题，尚未完成独立解答。</p></section>';
  return `<section class="card question-solution"><h3>① 考了什么知识点</h3><p>${esc(s.topic)}</p></section>
  <section class="card question-solution question-sheet"><h3>② 这题该怎么写</h3>
  ${s.image?`<img src="${esc(s.image)}" alt="第 ${esc(q.number)} 题的原解析及数学推导">`:''}
  ${s.steps.length?`<ol>${s.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol>`:''}
  ${s.english?`<h4>英文考场参考答案</h4><pre lang="en">${esc(s.english)}</pre>`:''}
  <button onclick="openMaterial('${s.english?q.source:'review'}',${s.page})">查看解析出处</button></section>
  <section class="card question-solution"><h3>③ 下次遇到该怎么办</h3><p>${esc(TRANSFER[s.module]||s.topic)}</p></section>`;
}
function exportBankState(){
  return Object.fromEntries(QUESTION_INDEX.map(q=>[questionStudyKey(q),questionStudyRecord(q)]).filter(([,value])=>Object.keys(value).length));
}
function restoreBankState(bank){
  if(!bank||typeof bank!=='object')return;
  for(const q of QUESTION_INDEX){
    const key=questionStudyKey(q), record=bank[key];
    if(record&&typeof record==='object'&&!localStorage.getItem(key)){
      localStorage.setItem(key,JSON.stringify({status:['未标记','看过','待复习'].includes(record.status)?record.status:'未标记',
        independent:record.independent===true,draft:String(record.draft||'').slice(0,50000)}));
    }
  }
}
function questionStudyKey(q) {
  return 'mth026-bank:' + q.source + ':' + q.page + ':' + q.number + ':' + q.label;
}
function questionStudyRecord(q) {
  try { return JSON.parse(localStorage.getItem(questionStudyKey(q))) || {}; }
  catch { return {}; }
}
function updateQuestionStudy(index, changes) {
  const q = QUESTION_INDEX[index];
  const record = {...questionStudyRecord(q), ...changes};
  localStorage.setItem(questionStudyKey(q), JSON.stringify(record));
  return record;
}
function questionStudyPanel(index, q) {
  const record = questionStudyRecord(q);
  return `<section class="card"><h3>原题练习与复习记录</h3>
    <label>阅读状态 <select onchange="updateQuestionStudy(${index},{status:this.value})">
    ${['未标记','看过','待复习'].map(x=>`<option ${record.status===x?'selected':''}>${x}</option>`).join('')}</select></label>
    <label><input type="checkbox" ${record.independent?'checked':''} onchange="updateQuestionStudy(${index},{independent:this.checked})"> 独立做对（自评）</label>
    <details ontoggle="if(this.open)this.nextElementSibling.open=false"><summary>独立作答</summary>
    <label>我的解题过程<textarea oninput="updateQuestionStudy(${index},{draft:this.value})">${esc(record.draft||'')}</textarea></label>
    <button onclick="exportBankReview(${index})">导出题目与作答供逐行批改</button>
    <button onclick="openHelper('report')">报告这道题的问题</button>
    </details>
    <details open><summary>查看或收起详解</summary>${renderQuestionSolution(q)}</details></section>`;
}
function exportBankReview(index) {
  const q=QUESTION_INDEX[index], source=MATERIALS.find(m=>m.id===q.source);
  const answer=getQuestionSolution(q);
  const lines=['# MTH026 原题批改','请接受所有正确解法，分别审核数学正确性、推导完整性与英文考场表达。逐行反馈，最后给出完整英文参考答案。请根据原题图独立核对参考解。',
    source.name+' · 第 '+q.page+' 页 · '+q.number,location.href,
    ...q.images.map(path=>new URL(path,location.href).href),
    '### 我的过程',questionStudyRecord(q).draft||'未填写',
    '### 网站英文参考解',answer?.english||(answer?.image?new URL(answer.image,location.href).href:'待补充')];
  download('MTH026-bank-review-'+(index+1)+'.md',lines.join('\n\n'),'text/markdown');
}
