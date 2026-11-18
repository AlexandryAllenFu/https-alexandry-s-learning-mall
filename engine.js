(function(root){
function num(s){s=String(s).trim().replaceAll('−','-');if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\s*\/\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+))?$/.test(s))return NaN;let [a,b]=s.split('/').map(Number);return b===undefined?a:b===0?NaN:a/b;}
function numbers(s){return String(s).trim().replaceAll('−','-').replace(/[\[\]()]/g,'').split(/[\s,，;；]+/).filter(Boolean).map(num)}

function generate(id,seed=0,level=1){
  const index=TOPICS.findIndex(t=>t.id===id);
  const topic=TOPICS[index];
  const [en,method,fact,problem]=LESSONS[index];
  const k=3+seed%13+(level-1)*13;
  const alternative=seed>=1000&&seed%2===0?alternateProblem(id,k):null;
  const [prompt,value,english]=alternative||problem(k);
  const methods={
    t04:'先把 2x+1 代入外层，再令根号内非负。',
    t12:'乘根式共轭，约掉 x 后代入。',
    t20:'用半角恒等式转为正弦标准极限的平方。',
    t26:'因式分解后求极限，再令点值等于极限。',
    t30:'通分化简差商，再令 h 趋零。',
    t43:'把 y 看成 x 的函数，对 xy 用乘积法则，再收集 y′。'
  };
  const applied=alternative?methods[id]:method;
  const next=LESSONS[(index+1)%LESSONS.length], other=LESSONS[(index+7)%LESSONS.length];
  const option=(dim,label,expected,wrong,explain)=>{
    const items=[expected,...wrong];
    const shift=(seed+dim+index)%items.length;
    return {dim,label,expected,type:'choice',options:items.slice(shift).concat(items.slice(0,shift)),explain};
  };
  const fields=[
    option(0,'这道英文题对应哪个任务？',topic.name,
      [TOPICS[(index+1)%TOPICS.length].name,TOPICS[(index+7)%TOPICS.length].name],topic.bridge),
    option(1,'哪项前提或性质直接对应本题？',fact,[next[2],other[2]],fact),
    option(2,'选择本题的解题路径',applied,[next[1],other[1]],applied),
    {dim:3,label:'输入题目所求的数值',expected:[value],type:'numbers',explain:english},
    ...(seed<1000?[{dim:4,label:'补全结论句：Therefore, the ____ value is as shown above.（所求的）',expected:'requested',type:'english',explain:'Therefore, the requested value is …'}]:[])
  ];
  return {id:`${id}:${seed}:${level}`,topic:id,seed,level,
    source:`独立教学变式 · ${topic.sec} · ${topic.section}`,
    prompt,fields,steps:[applied,fact,`核对结果：${Number(value.toPrecision(9))}。完整推导见英文答案。`],english};
}
function alternateProblem(id,k){
  const examples={
    t04:()=>[`Let f(u) = √(u − ${k}) and g(x) = 2x + 1. Find the left endpoint of the domain of f ∘ g.`,(k-1)/2,`Require 2x + 1 − ${k} ≥ 0, so x ≥ ${(k-1)/2}. The left endpoint is ${(k-1)/2}.`],
    t12:()=>[`Evaluate lim(x → 0) (√(${k*k} + x) − ${k})/x.`,1/(2*k),`Multiply by the conjugate. For x ≠ 0, the quotient is 1/(√(${k*k} + x) + ${k}). Its limit is 1/${2*k}.`],
    t20:()=>[`Evaluate lim(x → 0) (1 − cos(${k}x))/x².`,k*k/2,`Use 1 − cos u = 2 sin²(u/2). The quotient becomes (${k}²/2)[sin(${k}x/2)/(${k}x/2)]². The bracket tends to 1 (radians), so the limit is ${k*k/2}.`],
    t26:()=>[`Find c so that f is continuous at 1, where f(x) = (x² + (${k-1})x − ${k})/(x − 1) for x ≠ 1 and f(1) = c.`,k+1,`Factor the numerator as (x − 1)(x + ${k}). For x ≠ 1, f(x) = x + ${k}. The limit at 1 is ${k+1}, so c = ${k+1}.`],
    t30:()=>[`For f(x) = 1/x, use the derivative definition to find f′(${k}).`,-1/(k*k),`The difference quotient is (1/(${k}+h) − 1/${k})/h = −1/[${k}(${k}+h)]. Let h tend to zero to get −1/${k*k}.`],
    t43:()=>[`On x² + xy + y² = ${k*k+3*k+9}, find dy/dx at (${k}, 3).`,-(2*k+3)/(k+6),`Differentiate: 2x + y + xy′ + 2yy′ = 0. Thus y′ = −(2x+y)/(x+2y). At (${k},3) the denominator is nonzero, so y′ = −${2*k+3}/${k+6}.`]
  };
  return examples[id]?.();
}
function normalize(s){return String(s).trim().toLowerCase().replace(/[.!。]$/,'').replace(/\s+/g,' ').replaceAll('−','-');}
function grade(q,answers,{independent=false,guess=false,assisted=false,timed=false,elapsed=0,limit=240}={}){let results=q.fields.map((f,i)=>{let s=answers[i]??'';if(String(s).trim()==='')return{dim:f.dim,state:'U',ok:false,message:'未作答，没有证据。'};if(f.type==='english'){let ok=normalize(s)===normalize(f.expected);return {dim:f.dim,state:ok?'B':'U',ok,message:ok?'受控英文句式正确；不代表自由证明表达已通过。':'此表达未被自动规则确认，保留 U 待复核；不因措辞不同直接判错。'};}let ok=f.type==='choice'?s===f.expected:(()=>{let ns=numbers(s);return ns.length===f.expected.length&&ns.every((v,j)=>Number.isFinite(v)&&Math.abs(v-f.expected[j])<1e-7)})();return{dim:f.dim,state:ok?'B':'C',ok,message:ok?'本检查点正确。':f.explain};});let eligible=independent&&!guess&&!assisted&&(!timed||elapsed<=limit);let dims=DIMS.map((_,d)=>{let rr=results.filter(r=>r.dim===d);if(!rr.length)return'U';if(rr.some(r=>r.state==='C'))return'C';if(rr.some(r=>r.state==='U'))return'U';return eligible?'B':'U';});return{results,dims,eligible,passed:eligible&&results.every(r=>r.ok),timed,elapsed,limit};}
function topicState(id,attempts){let arr=attempts.filter(a=>a.topic===id).sort((a,b)=>a.at-b.at);return DIMS.map((_,d)=>{let tested=arr.filter(a=>a.grade.dims[d]!=='U');if(!tested.length)return'U';let last=tested.at(-1);if(last.grade.dims[d]==='C')return'C';let start=arr.findLastIndex(a=>a.grade.dims[d]==='C');let good=arr.slice(start+1).filter(a=>a.grade.eligible&&a.grade.dims[d]==='B');let seeds=new Set(good.map(a=>generate(a.topic,a.seed,a.level).prompt));let delayed=good.length>=2&&good.at(-1).at-good[0].at>=86400000;let timed=good.some(a=>a.grade.timed&&a.grade.elapsed<=a.grade.limit);return last.seed<1000&&d!==4&&seeds.size>=3&&delayed&&timed?'A':'B';});}
function nextAction(state,now=Date.now()){if(state.active)return{topic:state.active.topic,stage:'resume',reason:'有一道尚未完成的题，保留草稿与计时，先完成它。'};let core=TOPICS.filter(t=>t.sec!=='补充');let due=core.filter(t=>state.due[t.id]&&state.due[t.id]<=now).sort((a,b)=>state.due[a.id]-state.due[b.id]);if(due.length)return{topic:due[0].id,stage:'review',reason:'这项已到复习时间，先用新变式检验是否真正修复。'};let weak=core.find(t=>topicState(t.id,state.attempts).includes('C'));if(weak)return{topic:weak.id,stage:'repair',reason:'最近作答有明确错误，先看针对性讲解，再做同级新变式。'};let target=core.find(t=>!topicState(t.id,state.attempts).every(x=>x==='A')&&!state.due[t.id]);if(!target)target=core.find(t=>topicState(t.id,state.attempts).includes('U'));if(!target){let upcoming=core.filter(t=>state.due[t.id]).sort((a,b)=>state.due[a.id]-state.due[b.id]);return{topic:upcoming[0]?.id||TOPICS[0].id,stage:'wait',reason:'当前没有到期复习。可以休息，或主动选未掌握知识点；不自动升级难度。'};}return{topic:target.id,stage:state.read[target.id]?'practice':'learn',reason:state.read[target.id]?'讲解已看，尚需独立证据。先做同级诊断。':'先建立概念与例题，再进入独立作答；阅读不计掌握。'};}
function difficulty(id,attempts){let last=attempts.filter(a=>a.topic===id).at(-1);if(last&&!last.grade.passed)return 1;let clean=attempts.filter(a=>a.topic===id&&a.grade.passed);return new Set(clean.map(a=>generate(a.topic,a.seed,a.level).prompt)).size>=2?2:1;}
root.Engine={num,numbers,generate,grade,topicState,nextAction,difficulty};
})(typeof window==='undefined'?globalThis:window);
