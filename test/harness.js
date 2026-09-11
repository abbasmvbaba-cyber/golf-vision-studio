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
   'associate','ballisticStep','liveFit','predictArc','autoLockStep'].forEach(function(k){
    ok(typeof GVS[k]!=='undefined','missing export '+k);
  });
  ['simCarry','det3','quadFit','makeKF','kfPredict','kfUpdate',
   'associate','ballisticStep','liveFit','predictArc','autoLockStep'].forEach(function(k){
    ok(typeof GVS[k]==='function','not a function: '+k);
  });
  near(GVS.PHYS.k,0.004583,0.0002,'PHYS.k');
});


/* T13 — autoLockStep: قفل بعد از ۱۰ فریم پایدار */
T('T13','autoLockStep locks after stable frames',function(){
  let st=null,locked=false;
  for(let i=0;i<9;i++){const r=GVS.autoLockStep(st,{x:100,y:100,r:4},10);st=r.st;locked=r.locked;}
  ok(!locked,'locked too early');
  ok(st&&st.frames===9,'frames='+st.frames);
  const r2=GVS.autoLockStep(st,{x:100.5,y:99.8,r:4},10);
  ok(r2.locked,'should lock on frame 10');
  ok(r2.st===null,'st cleared on lock');
});

/* T14 — autoLockStep: پرش موقعیت → شروع از نو */
T('T14','autoLockStep resets on position jump',function(){
  let st=null,locked=false;
  for(let i=0;i<7;i++){const r=GVS.autoLockStep(st,{x:100,y:100,r:4},10);st=r.st;locked=r.locked;}
  ok(!locked);
  const rj=GVS.autoLockStep(st,{x:130,y:100,r:4},10);
  ok(!rj.locked&&rj.st&&rj.st.frames===1,'should reset on 30px jump');
  let s2=rj.st,lockAt=-1;
  for(let i=0;i<9;i++){
    const r=GVS.autoLockStep(s2,{x:130,y:100,r:4},10);
    s2=r.st;
    if(r.locked&&lockAt<0)lockAt=i+1;
  }
  ok(lockAt===9,'lock on 9th stable frame after jump, got '+lockAt);
  ok(s2===null,'st cleared on lock');
});

/* T15 — autoLockStep: نگهبان اندازه (توپِ قفل‌شده قبل r=4) */
T('T15','autoLockStep size guard rejects different size',function(){
  let st=null,locked=false;
  for(let i=0;i<15;i++){const r=GVS.autoLockStep(st,{x:50,y:50,r:8},10,4);st=r.st;locked=r.locked;}
  ok(!locked,'should never lock r=8 when last ball was r=4');
  const r2=GVS.autoLockStep(null,{x:50,y:50,r:4.2},10,4);
  ok(!r2.locked,'needs stable frames');
});

/* T16 — autoLockStep: فریم خالی → شروع از نو */
T('T16','autoLockStep null frame resets',function(){
  let st=null,locked=false;
  for(let i=0;i<5;i++){const r=GVS.autoLockStep(st,{x:20,y:20,r:4});st=r.st;locked=r.locked;}
  const rn=GVS.autoLockStep(st,null,10,0);
  ok(!rn.locked&&rn.st===null,'null frame clears state');
  let s2=null,lk=false;
  for(let i=0;i<9;i++){const r=GVS.autoLockStep(s2,{x:20,y:20,r:4},10,0);s2=r.st;lk=r.locked;}
  ok(!lk,'recount from zero');
  const r2=GVS.autoLockStep(s2,{x:20,y:20,r:4},10,0);
  ok(r2.locked,'lock on 10th stable frame after gap');
});


/* T18 — calibBallPose: بازیابی پوز از داده‌ی مصنوعی */
T('T18','calibBallPose round-trip',function(){
  const f=272,fy=272,cx=160,cy=90,theta=0.38,h=1.2,d=2.4;
  const cam={f:f,fy:fy,cx:cx,cy:cy,theta:theta,h:h,d:d,C:[0,-d,h]};
  const pr=GVS.project(cam,[0,0,0.021335]);
  ok(pr,'project null');
  const r=f*(0.04267/2)/pr.z;
  const rec=GVS.calibBallPose(f,fy,cx,cy,pr.u,pr.v,r);
  ok(rec,'calib null');
  near(rec.theta,theta,0.04,'theta');
  near(rec.h,h,0.08,'h');
  near(rec.d,d,0.12,'d');
});

/* T19 — fit3D: بازیابی v0 / elevation / carry */
T('T19','fit3D recovers v0, elevation, carry',function(){
  const cam={f:272,fy:272,cx:160,cy:90,theta:0.35,h:1.1,d:2.2,C:[0,-2.2,1.1]};
  const v0=[4.181,38.69,9.70],spin=1.2;
  const sim=GVS.simCarry3D(v0,spin);
  const obs=[];
  for(let i=4;i<sim.pts.length;i+=8){
    const pr=GVS.project(cam,sim.pts[i]);
    if(!pr)break;
    obs.push({t:i*0.008,u:pr.u,v:pr.v});
  }
  ok(obs.length>=20,'obs too few: '+obs.length);
  const f=GVS.fit3D(cam,obs,{vx:3,vy:34,vz:8,spin:1});
  ok(f,'fit3D null');
  near(f.v0,40,2,'v0');
  near(f.elevDeg,14,1.2,'elev');
  near(f.carry,sim.carry,2.5,'carry');
});

/* T20 — fit3D با نویز ±1.5px */
T('T20','fit3D robust to 1.5px noise',function(){
  const cam={f:272,fy:272,cx:160,cy:90,theta:0.35,h:1.1,d:2.2,C:[0,-2.2,1.1]};
  const v0=[4.181,38.69,9.70];
  const sim=GVS.simCarry3D(v0,1.2);
  const obs=[];
  for(let i=4;i<sim.pts.length;i+=8){
    const pr=GVS.project(cam,sim.pts[i]);
    if(!pr)break;
    obs.push({t:i*0.008,u:pr.u+1.5*Math.sin(i*2.7),v:pr.v+1.5*Math.cos(i*1.9)});
  }
  const f=GVS.fit3D(cam,obs,{vx:3,vy:34,vz:8,spin:1});
  ok(f,'fit3D null with noise');
  near(f.v0,40,2.5,'v0 noisy');
});

/* T21 — calibBallPose ورودی‌های نامعتبر */
T('T21','calibBallPose invalid inputs',function(){
  ok(GVS.calibBallPose(272,272,160,90,160,100,0.5)===null,'too small r');
  ok(GVS.calibBallPose(5,5,160,90,160,100,3)===null,'too small f');
  ok(GVS.fit3D({f:272,cx:160,cy:90,theta:0.3,C:[0,-2,1]},{length:3},{})===null,'few obs');
});

/* ---------- v34: helpers برای استخراج تابع از index.html ---------- */
const indexHtml=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function exFn(name){
  const m=new RegExp('function '+name+'\\s*\\(','g').exec(indexHtml);
  if(!m)throw new Error('function not found in index.html: '+name);
  let i=indexHtml.indexOf('{',m.index),d=0,j=i;
  for(;j<indexHtml.length;j++){if(indexHtml[j]==='{')d++;else if(indexHtml[j]==='}'){d--;if(d===0)break;}}
  return indexHtml.slice(m.index,j+1);
}

/* T22 — autoLockMulti: توپِ پایدار روی نویزِ روشنِ پایدار (score بالاتر) برنده است */
T('T22','v34 autoLockMulti: stable ball locks over stable bright decoy',function(){
  let sts=[],locked=null,frame=-1;
  for(let i=0;i<25;i++){
    const r=GVS.autoLockMulti(sts,[{x:277,y:14,r:5.7},{x:100,y:520,r:33}],10,20,null,0);
    sts=r.sts;
    if(r.locked){locked=r.locked;frame=i+1;break;}
  }
  ok(locked,'never locked');
  ok(frame===10,'ball should lock at frame 10, got '+frame);
  ok(Math.abs(locked.r-33)<1,'locked wrong object r='+locked.r);
  ok(Math.hypot(locked.x-100,locked.y-520)<2,'locked wrong position');
});

/* T23 — autoLockMulti: نویزِ لرزان (جیتر لبه‌ای) قفل نمی‌گیرد؛ توپ می‌گیرد */
T('T23','v34 autoLockMulti: jittering decoy cannot lock, ball does',function(){
  let sts=[],locked=null,frame=-1;
  for(let i=0;i<30;i++){
    const decoy={x:277+(i%2?6:-6),y:14+(i%2?-5:5),r:5.7*(1+0.15*(i%2?1:-1))};
    const r=GVS.autoLockMulti(sts,[decoy,{x:100,y:520,r:33}],10,20,null,0);
    sts=r.sts;
    if(r.locked){locked=r.locked;frame=i+1;break;}
  }
  ok(locked,'never locked');
  ok(Math.abs(locked.r-33)<1,'locked the jittering decoy!');
  ok(frame<=12,'ball took too long: frame '+frame);
});

/* T24 — autoLockMulti: ناحیه‌ی تاچ → قفل سریع ۳فریمی */
T('T24','v34 autoLockMulti: tap hint fast path (3 frames)',function(){
  let sts=[],locked=null,frame=-1;
  for(let i=0;i<5;i++){
    const r=GVS.autoLockMulti(sts,[{x:150,y:400,r:12}],10,20,{x:150,y:400,r:56,f:3},0);
    sts=r.sts;
    if(r.locked){locked=r.locked;frame=i+1;break;}
  }
  ok(locked,'hint candidate never locked');
  ok(frame===3,'should lock on 3rd frame inside hint, got '+frame);
});

/* T25 — autoLockMulti: نگهبان اندازه — توپِ قبلی r=12، کاندیدای r=40 قفل نشود */
T('T25','v34 autoLockMulti: size guard blocks wrong-size lock',function(){
  let sts=[],locked=null;
  for(let i=0;i<25;i++){
    const r=GVS.autoLockMulti(sts,[{x:80,y:300,r:40}],10,20,null,12);
    sts=r.sts;
    if(r.locked)locked=r.locked;
  }
  ok(locked===null,'r=40 must not lock when last ball was r=12');
});

/* T26 — layoutDetect: شبکه‌ی تشخیص هم‌نسبت با بوم (ایزوتروپ) + رگرسیون 16:9 */
T('T26','v34 layoutDetect: grid tracks canvas aspect (isotropic)',function(){
  const src=exFn('layoutDetect');
  const run=function(cw,ch){
    const cv={width:cw,height:ch},anA={width:0,height:0};
    return new Function('cv','anA',
      'var AW=320,AH=180,SCX=1,SCY=1,prevGray="sentinel";'+src+
      '\nlayoutDetect();'
      +'\nreturn{AW:AW,AH:AH,SCX:SCX,SCY:SCY,prevGray:prevGray,anW:anA.width,anH:anA.height};'
    )(cv,anA);
  };
  const land=run(1920,1080);
  ok(land.AW===320&&land.AH===180,'16:9 must stay 320x180, got '+land.AW+'x'+land.AH);
  ok(land.SCX===land.SCY,'16:9 isotropic: SCX='+land.SCX+' SCY='+land.SCY);
  ok(land.prevGray===null,'prevGray reset on relayout');
  const port=run(780,1688);
  ok(port.AH>180,'portrait AH must grow: '+port.AH);
  ok(Math.abs(port.SCX-port.SCY)/port.SCX<0.01,'portrait isotropic: SCX='+port.SCX.toFixed(4)+' SCY='+port.SCY.toFixed(4));
  ok(port.anW===port.AW&&port.anH===port.AH,'anA canvas resized with grid');
  const ultra=run(400,1200);
  ok(ultra.AH<=768,'AH clamped at extreme aspect: '+ultra.AH);
});

/* T27 — scanBallCands: توپِ نزدیک (r=34) در گرید portrait بر نویز لبه‌ای برتر است */
T('T27','v34 scanBallCands: close ball beats bright edge noise (portrait)',function(){
  const satOf=(0,eval)('('+exFn('satOf')+')');
  const AW=320,AH=670,N=AW*AH;
  const gray=new Float32Array(N).fill(0.32);
  const data=new Uint8ClampedArray(N*4).fill(Math.round(0.32*255));
  const setPx=function(i,l){gray[i]=l;const v=Math.round(l*255);data[i*4]=v;data[i*4+1]=v;data[i*4+2]=v;};
  const disc=function(cx,cy,r,l){
    for(let y=Math.max(0,Math.round(cy-r));y<=Math.min(AH-1,Math.round(cy+r));y++)
      for(let x=Math.max(0,Math.round(cx-r));x<=Math.min(AW-1,Math.round(cx+r));x++)
        if((x-cx)*(x-cx)+(y-cy)*(y-cy)<=r*r)setPx(y*AW+x,l);
  };
  const rect=function(x0,y0,x1,y1,l){
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)setPx(y*AW+x,l);
  };
  rect(200,0,319,60,0.12);   /* پنل تلویزیونِ تیره */
  disc(277,14,5.7,1.0);      /* هایلایتِ سرخوردِ لبه‌ای (نویزِ کلاسیک) */
  disc(100,520,34,0.96);     /* توپِ نزدیک روی مبل */
  const scanFn=new Function('AW','AH','lowThr','lastLumaAvg','satOf',exFn('scanBallCands')+'\nreturn scanBallCands;')(AW,AH,false,0.5,satOf);
  const out=scanFn(gray,data,8);
  ok(out.length>0,'no candidates at all');
  const ball=out.find(c=>Math.hypot(c.x-100,c.y-520)<4);
  ok(ball,'close ball not found: '+out.map(c=>c.x.toFixed(0)+','+c.y.toFixed(0)+'(r'+c.r.toFixed(0)+')').join(' '));
  ok(out[0]===ball,'ball must be rank #1, top is '+out[0].x.toFixed(0)+','+out[0].y.toFixed(0));
});

let p=0,f=0;
for(const r of results){
  if(r.ok){p++;console.log('  PASS '+r.id+' — '+r.name);}
  else{f++;console.log('  FAIL '+r.id+' — '+r.name+': '+r.err);}
}
console.log('=================================');
console.log(p+' PASS / '+f+' FAIL  ('+results.length+' tests)');
process.exit(f?1:0);
