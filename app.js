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
  $('#pex').innerHTML=o;$('#rex').innerHTML=o;const hv=$('#hex').value;$('#hex').innerHTML='<option value="">All exercises</option>'+o;$('#hex').value=hv;
  if(cur)$('#ex').value=cur;if(pc)$('#pex').value=pc;
  await onEx();
}
const isBw=n=>exs.find(e=>e.name===n)?.bodyweight;

async function onEx(){
  const n=$('#ex').value;$('#newex').hidden=n!=='__new';$('#rn').hidden=!n||n==='__new';
  const bw=n==='__new'?$('#newbw').checked:isBw(n);
  $('#wl').firstChild.textContent=bw?'Added weight (lbs, optional)':'Weight (lbs)';
  let t='';
  if(n&&n!=='__new'){
    const s=await db.sets.where('exercise').equals(n).toArray();
    if(s.length){const d=s.map(x=>x.date).sort().pop();t=`Last time (${dl(d)}): `+s.filter(x=>x.date===d).sort((a,b)=>a.set-b.set).map(st).join(', ')}
  }
  $('#last').textContent=t;
}
async function list(){
  const s=(await db.sets.where('date').equals($('#date').value).toArray()).sort((a,b)=>a.updated-b.updated);
  $('#list').innerHTML=s.map(x=>`<li><span data-e="${x.id}">${esc(x.exercise)}: ${st(x)}${x.assisted?' (assisted)':''}</span><button data-id="${x.id}" aria-label="Delete set">✕</button></li>`).join('')||'<li>No sets logged for this date yet.</li>';
}
$('#list').onclick=async e=>{if(e.target.dataset.e)return openEdit(e.target.dataset.e);const id=e.target.dataset.id;if(id&&confirm('Delete this set?')){await db.sets.delete(id);list()}};

$('#add').onclick=async()=>{
  let n=$('#ex').value,bw;
  if(n==='__new'){
    n=$('#newname').value.trim();bw=$('#newbw').checked;
    if(!n)return msg('Enter a name for the new exercise.');
    await db.exercises.put({name:n,bodyweight:bw,updated:Date.now()});
  }else bw=isBw(n);
  const reps=num($('#r').value);if(reps==null)return msg('Enter the reps.');if(reps<=0)return msg('Reps must be greater than 0. Please enter a positive number.');
  const date=$('#date').value,k=(await db.sets.where('[exercise+date]').equals([n,date]).count())+1;
  await db.sets.add({id:crypto.randomUUID(),date,exercise:n,set:k,weight:num($('#w').value),reps,side:$('#side').value,failed:+$('#f').checked,assisted:+$('#a').checked,effort_pct:null,notes:$('#n').value,updated:Date.now()});
  ['f','a'].forEach(i=>$('#'+i).checked=false);$('#n').value='';$('#r').value='';$('#newname').value='';
  msg('Set added.');await loadEx();$('#ex').value=n;list();
};
$('#ex').onchange=onEx;$('#newbw').onchange=onEx;$('#date').onchange=list;

const wk=d=>{const t=new Date(d+'T12:00');t.setDate(t.getDate()-(t.getDay()+6)%7);return t.toISOString().slice(0,10)};
let P=[],sel=-1,rg=0;
const st=x=>(isBw(x.exercise)&&x.weight!=null?x.reps+' × +'+x.weight:(x.weight!=null?x.weight+'×':'')+x.reps)+(x.side?' '+x.side:'')+(x.failed?'🫠':'');
const dn=d=>Date.parse(d+'T12:00')/864e5;
const dl=d=>new Date(d+'T12:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
function chart(){
  const cut=rg?dn(today())-rg:-Infinity,p=P.filter(x=>dn(x.d)>=cut);
  if(!p.length)return'<p class="hint">No sessions in this range.</p>';
  const W=340,H=210,L=42,R=12,T=12,B=26,v=p.map(x=>x.v);
  let lo=Math.min(...v),hi=Math.max(...v);if(lo==hi){lo-=5;hi+=5}
  const m=(hi-lo)/4,pw=10**Math.floor(Math.log10(m)),q=m/pw,step=(q<=1?1:q<=2?2:q<=5?5:10)*pw;
  const y0=Math.floor(lo/step)*step,y1=Math.ceil(hi/step)*step,a=dn(p[0].d),b=dn(p.at(-1).d);
  const Xn=t=>b==a?(L+W-R)/2:L+(t-a)/(b-a)*(W-L-R),Y=y=>H-B-(y-y0)/(y1-y0)*(H-T-B);
  let g='';
  for(let y=y0;y<=y1+1e-9;y+=step)g+=`<line x1="${L}" x2="${W-R}" y1="${Y(y)}" y2="${Y(y)}" stroke="var(--line)"/><text x="${L-6}" y="${Y(y)+3}" class="t" text-anchor="end">${Math.round(y*10)/10}</text>`;
  const tk=b==a?[a]:[0,1/3,2/3,1].map(f=>a+f*(b-a));
  g+=tk.map((t,i)=>`<text x="${Xn(t)}" y="${H-8}" class="t" text-anchor="${tk.length==1?'middle':i==0?'start':i==tk.length-1?'end':'middle'}">${new Date(t*864e5).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</text>`).join('');
  g+=`<polyline fill="none" stroke="var(--ac)" stroke-width="2" points="${p.map(x=>Xn(dn(x.d))+','+Y(x.v)).join(' ')}"/>`;
  g+=p.map(x=>{const i=P.indexOf(x),cx=Xn(dn(x.d)),cy=Y(x.v);return`<circle cx="${cx}" cy="${cy}" r="${i==sel?6:4}" fill="${i==sel?'var(--bg)':'var(--ac)'}" stroke="var(--ac)" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="14" fill="transparent" data-i="${i}"/>`}).join('');
  return`<svg viewBox="0 0 ${W} ${H}">${g}</svg>`;
}
function draw(){
  $('#chart').innerHTML=chart();const x=P[sel];
  $('#detail').innerHTML=x?`<div class="stat"><span>${dl(x.d)}</span><b>${x.sets.map(st).join(', ')}</b></div>`:'<p class="hint">Tap a point to see that day’s sets.</p>';
}
async function prog(){
  const n=$('#pex').value;if(!n){$('#stats').innerHTML='<p class="hint">Log or import sets to see progress.</p>';$('#chart').innerHTML='';$('#detail').innerHTML='';return}
  const bw=isBw(n),s=await db.sets.where('exercise').equals(n).toArray(),m=bw?'r':$('#met').value,key=bw?'reps':'weight';
  $('#met').parentElement.hidden=!!bw;
  const by={};s.forEach(x=>(by[x.date]??=[]).push(x));
  P=Object.keys(by).sort().map(d=>{
    const a=by[d].sort((x,y)=>x.set-y.set),w=a.filter(x=>x.weight!=null&&x.reps!=null);
    const v=m=='r'?Math.max(...a.map(x=>x.reps)):m=='w'?Math.max(...w.map(x=>x.weight)):m=='e'?Math.max(...w.map(x=>x.weight*(1+x.reps/30))):w.reduce((t,x)=>t+x.weight*x.reps,0);
    return{d,v:Math.round(v*10)/10,sets:a};
  }).filter(x=>isFinite(x.v)&&x.v>0);
  sel=-1;
  const best=[...s].filter(x=>x[key]!=null).sort((a,b)=>b[key]-a[key]||b.reps-a.reps)[0];
  const e1=bw?0:Math.max(0,...s.filter(x=>x.weight).map(x=>x.weight*(1+x.reps/30)));
  const row=(a,b)=>`<div class="stat"><span>${a}</span><b>${b}</b></div>`;
  $('#stats').innerHTML=row('Sessions',P.length)+row('Total sets',s.length)+(best?row(bw?'Most reps in a set':'Heaviest set',bw?best.reps:`${best.weight} × ${best.reps} (${best.date})`):'')+(e1?row('Best estimated 1RM',Math.round(e1)+' lbs'):'');
  draw();
  const all=await db.sets.toArray(),w={};
  all.forEach(x=>{if(x.weight!=null)w[wk(x.date)]=(w[wk(x.date)]||0)+x.weight*x.reps});
  $('#weeks').innerHTML=Object.keys(w).sort().reverse().slice(0,8).map(k=>`<tr><td>Week of ${k}</td><td>${Math.round(w[k]).toLocaleString()}</td></tr>`).join('');
}
$('#met').onchange=prog;
$('#chart').onclick=e=>{const i=e.target.dataset.i;if(i!=null){sel=+i;draw()}};
$('#rng').onclick=e=>{if(e.target.dataset.r==null)return;rg=+e.target.dataset.r;[...$('#rng').children].forEach(x=>x.classList.toggle('on',x===e.target));sel=-1;draw()};
$('#pex').onchange=prog;

let hn=20;
async function hist(){
  const f=$('#hex').value;let s=await db.sets.toArray();if(f)s=s.filter(x=>x.exercise===f);
  const by={};s.forEach(x=>((by[x.date]??={})[x.exercise]??=[]).push(x));
  const ds=Object.keys(by).sort().reverse();
  const fmt=d=>new Date(d+'T12:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'});
  $('#hlist').innerHTML=ds.slice(0,hn).map(d=>`<h3 data-d="${d}">${fmt(d)} ✎</h3>`+Object.entries(by[d]).map(([e,a])=>`<div class="stat"><span>${esc(e)}</span><b>${a.sort((x,y)=>x.set-y.set).map(st).join(', ')}</b></div>`).join('')).join('')||'<p class="hint">No sets yet.</p>';
  $('#more').hidden=ds.length<=hn;
}
$('#hlist').onclick=e=>{const d=e.target.dataset.d;if(d){$('#date').value=d;list();document.querySelector('nav button[data-t=log]').click()}};
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
async function backup(share){
  const s=(await db.sets.toArray()).sort((a,b)=>a.date.localeCompare(b.date)||a.updated-b.updated);
  const q=v=>{v=v==null?'':String(v);return/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  const csv=[COLS.join(',')].concat(s.map(x=>COLS.map(c=>q(x[c])).join(','))).join('\n');
  const name='workouts-'+today()+'.csv',f=new File([csv],name,{type:'text/csv'});
  if(share&&navigator.canShare?.({files:[f]})){try{await navigator.share({files:[f],title:'Workout backup'})}catch(e){return}}
  else{const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=name;a.click()}
  localStorage.bk_last=today();bk();
}
function bk(){
  const f=+localStorage.bk_f||0,l=localStorage.bk_last,d=l?Math.floor(dn(today())-dn(l)):null,due=f&&(l==null||d>=f);
  $('#bk').hidden=!due;if(due)$('#bkt').textContent=l?`It has been ${d} days since your last backup.`:'You have not backed up yet.';
}
$('#exp').onclick=()=>backup(false);$('#shr').onclick=()=>backup(true);$('#bkb').onclick=()=>backup(true);
$('#bkf').value=localStorage.bk_f||'0';$('#bkf').onchange=()=>{localStorage.bk_f=$('#bkf').value;bk()};
async function renameEx(o,n){
  if(!o||!n||o===n)return;
  const ex=exs.find(e=>e.name===n);
  if(ex&&!confirm(`"${n}" already exists. Merge "${o}" into it?`))return;
  await db.transaction('rw',db.sets,db.exercises,async()=>{
    await db.sets.where('exercise').equals(o).modify({exercise:n,modified:Date.now()});
    const old=await db.exercises.get(o);await db.exercises.delete(o);
    if(!ex)await db.exercises.put({...old,name:n,updated:Date.now()});
  });
  $('#rname').value='';await loadEx();$('#ex').value=n;await onEx();await list();
  $('#info').textContent=$('#msg').textContent=`"${o}" is now "${n}".`;
}
$('#ren').onclick=()=>renameEx($('#rex').value,$('#rname').value.trim());
$('#rn').onclick=async()=>{const o=$('#ex').value,n=prompt(`Rename "${o}" to:`,o);if(n)await renameEx(o,n.trim())};

let eid=null;
async function openEdit(id){
  const x=await db.sets.get(id);if(!x)return;eid=id;
  $('#edt').textContent=x.exercise;$('#edm').textContent='';
  $('#ed_d').value=x.date;$('#ed_w').value=x.weight??'';$('#ed_r').value=x.reps;$('#ed_s').value=x.side||'';
  $('#ed_f').checked=!!x.failed;$('#ed_a').checked=!!x.assisted;$('#ed_n').value=x.notes||'';
  $('#ed').hidden=false;$('#ed').scrollIntoView({behavior:'smooth'});
}
$('#ed_x').onclick=()=>{$('#ed').hidden=true;eid=null};
$('#ed_save').onclick=async()=>{
  const reps=num($('#ed_r').value),d=$('#ed_d').value;
  if(reps==null||reps<=0)return $('#edm').textContent='Reps must be greater than 0. Please enter a positive number.';
  if(!d)return $('#edm').textContent='Pick a date.';
  await db.sets.update(eid,{date:d,weight:num($('#ed_w').value),reps,side:$('#ed_s').value,failed:+$('#ed_f').checked,assisted:+$('#ed_a').checked,notes:$('#ed_n').value,modified:Date.now()});
  $('#ed').hidden=true;eid=null;$('#date').value=d;msg('Set updated.');await list();await onEx();
};
async function info(){$('#info').textContent=`${await db.sets.count()} sets across ${await db.exercises.count()} exercises stored on this device.`}

document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('main section').forEach(s=>s.hidden=s.id!==b.dataset.t);
  if(b.dataset.t=='hist')hist();if(b.dataset.t=='prog')prog();if(b.dataset.t=='data')info();
});
$('#date').value=today();bk();
loadEx().then(list).then(info);
navigator.storage?.persist?.();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');