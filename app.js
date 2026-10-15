const $=s=>document.querySelector(s),db=new Dexie('gym');
db.version(1).stores({sets:'id,date,exercise,[exercise+date],updated',exercises:'name'});
const COLS=['date','exercise','set','weight','reps','side','failed','assisted','effort_pct','notes'];
const esc=s=>String(s).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');
const today=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)};
const num=v=>v===''||v==null||isNaN(+v)?null:+v;
let exs=[];
const msg=t=>$('#msg').textContent=t;

async function loadEx(){
  exs=await db.exercises.orderBy('name').toArray();
  const o=exs.map(e=>`<option>${esc(e.name)}</option>`).join('');
  const cur=$('#ex').value,pc=$('#pex').value;
  $('#ex').innerHTML=o+'<option value="__new">+ New exercise…</option>';
  $('#pex').innerHTML=o;const hv=$('#hex').value;$('#hex').innerHTML='<option value="">All exercises</option>'+o;$('#hex').value=hv;
  if(cur)$('#ex').value=cur;if(pc)$('#pex').value=pc;
  await onEx();
}
const isBw=n=>exs.find(e=>e.name===n)?.bodyweight;

async function onEx(){
  const n=$('#ex').value;$('#newex').hidden=n!=='__new';
  const bw=n==='__new'?$('#newbw').checked:isBw(n);$('#wl').hidden=!!bw;
  if(n&&n!=='__new'&&!bw){
    const s=await db.sets.where('exercise').equals(n).sortBy('date');
    const l=[...s].reverse().find(x=>x.weight!=null);if(l)$('#w').value=l.weight;
  }
}

async function list(){
  const s=(await db.sets.where('date').equals($('#date').value).toArray()).sort((a,b)=>a.updated-b.updated);
  $('#list').innerHTML=s.map(x=>`<li><span>${esc(x.exercise)}: ${x.weight!=null?x.weight+' × ':''}${x.reps}${x.side?' '+x.side:''}${x.failed?' ✗':''}${x.assisted?' (assisted)':''}</span><button data-id="${x.id}" aria-label="Delete set">✕</button></li>`).join('')||'<li>No sets logged for this date yet.</li>';
}
$('#list').onclick=async e=>{const id=e.target.dataset.id;if(id&&confirm('Delete this set?')){await db.sets.delete(id);list()}};

$('#add').onclick=async()=>{
  let n=$('#ex').value,bw;
  if(n==='__new'){
    n=$('#newname').value.trim();bw=$('#newbw').checked;
    if(!n)return msg('Enter a name for the new exercise.');
    await db.exercises.put({name:n,bodyweight:bw,updated:Date.now()});
  }else bw=isBw(n);
  const reps=num($('#r').value);if(reps==null)return msg('Enter the reps.');
  const date=$('#date').value,k=(await db.sets.where('[exercise+date]').equals([n,date]).count())+1;
  await db.sets.add({id:crypto.randomUUID(),date,exercise:n,set:k,weight:bw?null:num($('#w').value),reps,side:$('#side').value,failed:+$('#f').checked,assisted:+$('#a').checked,effort_pct:null,notes:$('#n').value,updated:Date.now()});
  ['f','a'].forEach(i=>$('#'+i).checked=false);$('#n').value='';$('#r').value='';$('#newname').value='';
  msg('Set added.');await loadEx();$('#ex').value=n;list();
};
$('#ex').onchange=onEx;$('#newbw').onchange=onEx;$('#date').onchange=list;

const wk=d=>{const t=new Date(d+'T12:00');t.setDate(t.getDate()-(t.getDay()+6)%7);return t.toISOString().slice(0,10)};
function chart(p){
  if(p.length<2)return'<p class="hint">Log at least two sessions to see a chart.</p>';
  const W=320,H=150,P=26,v=p.map(x=>x[1]),mn=Math.min(...v),mx=Math.max(...v);
  const X=i=>P+i*(W-2*P)/(p.length-1),Y=y=>H-P-(mx==mn?.5:(y-mn)/(mx-mn))*(H-2*P);
  return`<svg viewBox="0 0 ${W} ${H}"><polyline fill="none" stroke="var(--ac)" stroke-width="2" points="${p.map((x,i)=>X(i)+','+Y(x[1])).join(' ')}"/>${p.map((x,i)=>`<circle cx="${X(i)}" cy="${Y(x[1])}" r="3" fill="var(--ac)"/>`).join('')}<text x="2" y="${P}" class="t">${mx}</text><text x="2" y="${H-P}" class="t">${mn}</text><text x="${P}" y="${H-6}" class="t">${p[0][0].slice(5)}</text><text x="${W-P}" y="${H-6}" class="t" text-anchor="end">${p.at(-1)[0].slice(5)}</text></svg>`;
}
async function prog(){
  const n=$('#pex').value;if(!n){$('#stats').innerHTML='<p class="hint">Log or import sets to see progress.</p>';$('#chart').innerHTML='';return}
  const bw=isBw(n),s=await db.sets.where('exercise').equals(n).toArray(),key=bw?'reps':'weight';
  const by={};s.filter(x=>x[key]!=null).forEach(x=>(by[x.date]??=[]).push(x));
  const pts=Object.keys(by).sort().map(d=>[d,Math.max(...by[d].map(x=>x[key]))]);
  const best=[...s].filter(x=>x[key]!=null).sort((a,b)=>b[key]-a[key]||b.reps-a.reps)[0];
  const e1=bw?null:Math.max(0,...s.filter(x=>x.weight).map(x=>x.weight*(1+x.reps/30)));
  const row=(a,b)=>`<div class="stat"><span>${a}</span><b>${b}</b></div>`;
  $('#stats').innerHTML=row('Sessions',pts.length)+row('Total sets',s.length)+(best?row(bw?'Most reps in a set':'Heaviest set',bw?best.reps:`${best.weight} × ${best.reps} (${best.date})`):'')+(e1?row('Best estimated 1RM',Math.round(e1)+' lbs'):'');
  $('#chart').innerHTML=chart(pts);
  const all=await db.sets.toArray(),w={};
  all.forEach(x=>{if(x.weight!=null)w[wk(x.date)]=(w[wk(x.date)]||0)+x.weight*x.reps});
  $('#weeks').innerHTML=Object.keys(w).sort().reverse().slice(0,8).map(k=>`<tr><td>Week of ${k}</td><td>${Math.round(w[k]).toLocaleString()}</td></tr>`).join('');
}
$('#pex').onchange=prog;

let hn=20;
async function hist(){
  const f=$('#hex').value;let s=await db.sets.toArray();if(f)s=s.filter(x=>x.exercise===f);
  const by={};s.forEach(x=>((by[x.date]??={})[x.exercise]??=[]).push(x));
  const ds=Object.keys(by).sort().reverse();
  const fmt=d=>new Date(d+'T12:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'});
  $('#hlist').innerHTML=ds.slice(0,hn).map(d=>`<h3>${fmt(d)}</h3>`+Object.entries(by[d]).map(([e,a])=>`<div class="stat"><span>${esc(e)}</span><b>${a.sort((x,y)=>x.set-y.set).map(x=>(x.weight!=null?x.weight+'×':'')+x.reps+(x.side?' '+x.side:'')+(x.failed?'✗':'')).join(', ')}</b></div>`).join('')).join('')||'<p class="hint">No sets yet.</p>';
  $('#more').hidden=ds.length<=hn;
}
$('#hex').onchange=()=>{hn=20;hist()};$('#more').onclick=()=>{hn+=20;hist()};

function parse(t){
  const r=[];let row=[],c='',q=0;
  for(let i=0;i<t.length;i++){const h=t[i];
    if(q){if(h=='"'){if(t[i+1]=='"'){c+='"';i++}else q=0}else c+=h}
    else if(h=='"')q=1;else if(h==','){row.push(c);c=''}
    else if(h=='\n'||h=='\r'){if(h=='\r'&&t[i+1]=='\n')i++;row.push(c);r.push(row);row=[];c=''}else c+=h}
  if(c||row.length){row.push(c);r.push(row)}
  return r.filter(x=>x.some(y=>y!==''));
}
$('#imp').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  const [h,...rows]=parse(await f.text());
  const have=new Set((await db.sets.toArray()).map(x=>[x.date,x.exercise,x.set,x.side].join('|')));
  const add=[],withW=new Set(),all=new Set();
  rows.forEach(r=>{
    const o=Object.fromEntries(h.map((k,i)=>[k.trim(),r[i]??'']));
    if(!o.date||!o.exercise)return;
    all.add(o.exercise);if(o.weight!=='')withW.add(o.exercise);
    const k=[o.date,o.exercise,+o.set,o.side].join('|');if(have.has(k))return;have.add(k);
    add.push({id:crypto.randomUUID(),date:o.date,exercise:o.exercise,set:+o.set,weight:num(o.weight),reps:num(o.reps),side:o.side,failed:+o.failed||0,assisted:+o.assisted||0,effort_pct:num(o.effort_pct),notes:o.notes,updated:Date.now()});
  });
  const known=new Set(exs.map(x=>x.name));
  await db.exercises.bulkPut([...all].filter(n=>!known.has(n)).map(n=>({name:n,bodyweight:!withW.has(n),updated:Date.now()})));
  await db.sets.bulkAdd(add);e.target.value='';
  await loadEx();await info();$('#info').textContent=`Imported ${add.length} sets (${rows.length-add.length} duplicates skipped).`;
};
$('#exp').onclick=async()=>{
  const s=(await db.sets.toArray()).sort((a,b)=>a.date.localeCompare(b.date)||a.updated-b.updated);
  const q=v=>{v=v==null?'':String(v);return/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  const csv=[COLS.join(',')].concat(s.map(x=>COLS.map(c=>q(x[c])).join(','))).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='workouts-'+today()+'.csv';a.click();
};
async function info(){$('#info').textContent=`${await db.sets.count()} sets across ${await db.exercises.count()} exercises stored on this device.`}

document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('main section').forEach(s=>s.hidden=s.id!==b.dataset.t);
  if(b.dataset.t=='hist')hist();if(b.dataset.t=='prog')prog();if(b.dataset.t=='data')info();
});
$('#date').value=today();
loadEx().then(list).then(info);
navigator.storage?.persist?.();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');