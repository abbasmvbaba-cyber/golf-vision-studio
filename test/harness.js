#!/usr/bin/env node
/* ============================================================
   GVS test harness — v30
   بدون وابستگی:  node test/harness.js
   پوشش: همگامی mirror، فیزیک، کالمن، association،
   مدل بالستیک، برازش زنده، قوس پیش‌بینی
   ============================================================ */
'use strict';
const fs=require('fs'),path=require('path');
const GVS=require('../math-core.js');

const results=[];
function T(id,name,fn){
  try{fn();results.push({id:id,name:name,ok:true});}
  catch(e){results.push({id:id,name:name,ok:false,err:String(e&&e.message||e)});}
}
function ok(cond,msg){if(!cond)throw new Error(msg||'assertion failed');}
function near(a,b,tol,msg){
  if(!(isFinite(a)&&Math.abs(a-b)<=tol))throw new Error((msg||'near')+': got='+a+' want='+(b-0)+' tol='+tol);
}

/* T0 — همگامی mirror: بخش ریاضی index.html با math-core.js یکی است */
T('T0','mirror sync index.html <-> math-core.js',function(){
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  const core=fs.readFileSync(path.join(__dirname,'..','math-core.js'),'utf8');
  const FROM='/* ================= ماژول فیزیک (GolfPhysicsEngine) — سند §14-25 ================= */';
  const TO='/* ================= تحلیل و ذخیره (Analytics/Storage) — سند §26-33,45 ================= */';
  const ex=function(s){
    const i=s.indexOf(FROM),j=s.indexOf(TO);
    if(i<0||j<0||j<i)throw new Error('marker not found in '+s.slice(0,40));
    return s.slice(i,j);
  };
  const norm=function(s){
    return s.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ').replace(/\s+/g,'');
  };
  ok(norm(ex(html))===norm(ex(core)),'math section diverged between index.html and math-core.js');
});

/* T1 — quadFit دقیق */
T('T1','quadFit recovers exact parabola',function(){
  const ts=[],ys=[];
  for(let i=0;i<10;i++){const t=i*0.1;ts.push(t);ys.push(3+2*t+1*t*t);}
  const f=GVS.quadFit(ts,ys);
  ok(f,'null fit');
  near(f.a,1,1e-6,'a');near(f.b,2,1e-6,'b');near(f.c,3,1e-6,'c');
});

/* T2 — quadFit با نویز کوچک (شبیه داده‌ی واقعی) */
T('T2','quadFit robust to small noise',function(){
  const a=441.5,b=-300,c=10,ts=[],ys=[];
  for(let i=0;i<12;i++){
    const t=i*0.05;
    const noise=Math.sin(i*1.7)*0.8; /* ±0.8px */
    ts.push(t);ys.push(a*t*t+b*t+c+noise);
  }
  const f=GVS.quadFit(ts,ys);
  ok(f,'null fit');
  near(f.a,a,25,'a');near(f.b,b,30,'b');
});

/* T3 — quadFit ورودی‌های نامعتبر */
T('T3','quadFit degenerate inputs',function(){
  ok(GVS.quadFit([1,2,3],[1,2,3])===null,'too few points');
  const ts=[0,0,0,0,0],ys=[1,2,3,4,5];
  ok(GVS.quadFit(ts,ys)===null,'degenerate matrix');
});

/* T4 — simCarry: درایو 60m/s @ 12° + پارابول بدون درگ */
T('T4','simCarry driver + no-drag parabola',function(){
  const th=12*Math.PI/180,v=60;
  const r=GVS.simCarry(v*Math.cos(th),v*Math.sin(th));
  ok(r.carry>180&&r.carry<320,'carry out of range: '+r.carry);
  ok(r.t>4.5&&r.t<8,'flight time out of range: '+r.t);
  const k0=GVS.PHYS.k,k0l=GVS.PHYS.kl;
  GVS.PHYS.k=0;GVS.PHYS.kl=0;
  const r0=GVS.simCarry(v*Math.cos(th),v*Math.sin(th));
  GVS.PHYS.k=k0;GVS.PHYS.kl=k0l;
  const expected=v*v*Math.sin(2*th)/GVS.PHYS.g;
  near(r0.carry,expected,2.0,'no-drag carry vs v^2 sin2g / g');
});

/* T5 — کالمن: هدف خطی با نویز */
T('T5','Kalman tracks straight-line CV target',function(){
  const kf=GVS.makeKF(0,0,0.016),dt=0.016;
  for(let i=1;i<=60;i++){
    const t=i*dt;
    GVS.kfPredict(kf,dt);
    GVS.kfUpdate(kf,100*t+(i%2?1:-1),50*t+(i%3?0.7:-0.7),1);
  }
  near(kf.s[0],100*0.96,6,'x');
  near(kf.s[1],50*0.96,6,'y');
  near(kf.s[2],100,60,'vx');
  near(kf.s[3],50,60,'vy');
});

/* T6 — کالمن: P همگرا می‌شود */
T('T6','Kalman P converges',function(){
  const kf=GVS.makeKF(0,0,0.016);
  for(let i=1;i<=60;i++){GVS.kfPredict(kf,0.016);GVS.kfUpdate(kf,100*i*0.016,50*i*0.016,1);}
  ok(kf.P[0]<5,'P[0] not converged: '+kf.P[0]);
});

/* T7 — association: هدف واقعی انتخاب می‌شود */
T('T7','associate picks true target over decoys',function(){
  const kf={
    s:new Float64Array([100,100,0,0,0,0]),
    P:new Float64Array([9,0,0,0,0,0,0,9,0,0,0,0,0,0,100,0,0,0,0,0,0,100,0,0,0,0,0,0,1000,0,0,0,0,0,0,1000]),
    inited:true
  };
  const m=GVS.associate([{x:102,y:99},{x:140,y:100},{x:220,y:220}],kf,9,9.21);
  ok(m,'no match found');
  near(m.x,102,0.001,'x');near(m.y,99,0.001,'y');
  ok(m.d2<9.21,'d2 above gate: '+m.d2);
});

/* T8 — association: decoy‌های دور رد می‌شوند */
T('T8','associate rejects far decoys',function(){
  const kf={
    s:new Float64Array([100,100,0,0,0,0]),
    P:new Float64Array([9,0,0,0,0,0,0,9,0,0,0,0,0,0,100,0,0,0,0,0,0,100,0,0,0,0,0,0,1000,0,0,0,0,0,0,1000]),
    inited:true
  };
  ok(GVS.associate([{x:160,y:100},{x:100,y:180}],kf,9,9.21)===null,'should reject all');
});

/* T9 — مدل بالستیک: زمان پرواز + اثر درگ */
T('T9','ballisticStep time-of-flight and drag',function(){
  const ppm=90,gpx=GVS.PHYS.g*ppm;
  const step=function(withDrag){
    let pos={x:0,y:0},vel={x:900,y:-600};
    for(let i=0;i<85;i++){const r=GVS.ballisticStep(pos,vel,1/ppm,0.016,withDrag);pos=r.pos;vel=r.vel;}
    return pos;
  };
  const pn=step(false),pd=step(true);
  near(pn.y,0,40,'no-drag y ~ start');
  near(pn.x,900*(2*600/gpx),70,'no-drag x ~ v*t');
  ok(pd.x<pn.x-15,'drag must shorten range: '+pd.x+' vs '+pn.x);
});

/* T10 — liveFit: بازیابی v0 و مقیاس از داده‌ی مصنوعی */
T('T10','liveFit recovers v0 and px/m scale',function(){
  const ppm=90,gpx=GVS.PHYS.g*ppm,vx=300,vy0=-400;
  const obs=[];
  for(let i=1;i<=11;i++){
    const t=i*0.05;
    obs.push({t:t,x:vx*t,y:vy0*t+0.5*gpx*t*t});
  }
  const f=GVS.liveFit(obs,0.55,0.6);
  ok(f,'fit null');
  near(f.vyUp,400,45,'vyUp');
  near(f.vx,300,35,'vx');
  near(f.ppm,90,15,'ppm');
});

/* T11 — predictArc: فرود و مسافت باقی‌مانده */
T('T11','predictArc landing and remaining carry',function(){
  const ppm=90,gpx=GVS.PHYS.g*ppm,vx=300,vy0=-400,tL=0.55;
  const x0=vx*tL,y0=vy0*tL+0.5*gpx*tL*tL;
  const arc=GVS.predictArc(x0,y0,vx/ppm,-vy0/ppm,ppm,1);
  ok(arc,'null arc');
  ok(arc.carryM>2.0&&arc.carryM<3.4,'remaining carry: '+arc.carryM);
  ok(arc.land.x>x0+180&&arc.land.x<x0+320,'land.x: '+arc.land.x);
  ok(Math.abs(arc.land.y-y0)<25,'land.y: '+arc.land.y);
});

/* T12 — خروجی‌های UMD */
T('T12','UMD exports complete',function(){
  ['PHYS','YD','MPH','simCarry','det3','quadFit','makeKF','kfPredict','kfUpdate',
   'associate','ballisticStep','liveFit','predictArc'].forEach(function(k){
    ok(typeof GVS[k]!=='undefined','missing export '+k);
  });
  ['simCarry','det3','quadFit','makeKF','kfPredict','kfUpdate',
   'associate','ballisticStep','liveFit','predictArc'].forEach(function(k){
    ok(typeof GVS[k]==='function','not a function: '+k);
  });
  near(GVS.PHYS.k,0.004583,0.0002,'PHYS.k');
});

let p=0,f=0;
for(const r of results){
  if(r.ok){p++;console.log('  PASS '+r.id+' — '+r.name);}
  else{f++;console.log('  FAIL '+r.id+' — '+r.name+': '+r.err);}
}
console.log('=================================');
console.log(p+' PASS / '+f+' FAIL  ('+results.length+' tests)');
process.exit(f?1:0);
