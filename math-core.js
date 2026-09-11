/* ============================================================
   GVS math core — v30 · ریاضی خالص (مرورگر + Node، UMD)
   فیزیک توپ، فیلتر کالمن، data association، مدل حرکت بالستیک.
   IMPORTANT: بخش بین مارکرهای «Module physics» تا «Analytics/Storage»
   mirror از index.html است — تست T0 تضمین می‌کند دو جا با هم
   انحراف نگیرند. (در v31 تعریف‌های inline از index.html حذف
   و فقط همین فایل می‌ماند.)
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GVS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

/* ================= ماژول فیزیک (GolfPhysicsEngine) — سند §14-25 ================= */
const PHYS={g:9.80665,rho:1.225,m:0.04593,r:0.02135,Cd:0.24,Cl:0.21};
PHYS.A=Math.PI*PHYS.r*PHYS.r;
PHYS.k=PHYS.Cd*PHYS.rho*PHYS.A/(2*PHYS.m);   /* درگ ≈0.0046 1/m — §16 */
PHYS.kl=PHYS.Cl*PHYS.rho*PHYS.A/(2*PHYS.m);  /* لیفت مگنوس، Cl فرضی → Estimated — §17 */
const YD=1/0.9144,MPH=2.23694;
/* شبیه‌سازی صفحه‌ای با درگ؛ y-up؛ تا فرود روی زمین */
function simCarry(vx,vyUp){
  let x=0,y=0,dt=0.008,t=0;const pts=[[0,0]];
  for(let i=0;i<4000;i++){
    const v=Math.hypot(vx,vyUp);
    /* درگ خلاف سرعت + لیفت عمود بر سرعت (بک‌اسپین) — §16-17 */
    const drag=PHYS.k*v,lift=PHYS.kl*v;
    vx+=(-drag*vx-lift*vyUp)*dt;vyUp+=(-PHYS.g-drag*vyUp+lift*vx)*dt;
    x+=vx*dt;y+=vyUp*dt;t+=dt;pts.push([x,y]);
    if(y<0&&t>0.15)return{carry:Math.abs(x),t,pts};
  }
  return{carry:Math.abs(x),t,pts};
}
/* برازش درجه۲ روی y(t) — برای خودکالیبراسیون با گرانش (سند §34) */
function det3(m){return m[0]*m[4]*m[8]+m[1]*m[5]*m[6]+m[2]*m[3]*m[7]-m[2]*m[4]*m[6]-m[1]*m[3]*m[8]-m[0]*m[5]*m[7];}
function quadFit(ts,ys){
  const n=ts.length;if(n<5)return null;
  const S=[0,0,0,0,0,0,0,0,0],B=[0,0,0];
  for(let i=0;i<n;i++){
    const t=ts[i],p=[1,t,t*t];
    for(let j=0;j<3;j++){B[j]+=p[j]*ys[i];for(let k=0;k<3;k++)S[j*3+k]+=p[j]*p[k];}
  }
  const d=det3(S);if(!isFinite(d)||Math.abs(d)<1e-12)return null;
  /* کرامر: مجهول‌ها [c,b,a] — y = a·t² + b·t + c */
  const Mc=[B[0],S[1],S[2],B[1],S[4],S[5],B[2],S[7],S[8]];
  const Mb=[S[0],B[0],S[2],S[3],B[1],S[5],S[6],B[2],S[8]];
  const Ma=[S[0],S[1],B[0],S[3],S[4],B[1],S[6],S[7],B[2]];
  const c=det3(Mc)/d,b=det3(Mb)/d,a=det3(Ma)/d;
  if(!isFinite(a)||!isFinite(b))return null;
  return{a,b,c};
}
/* ================= فیلتر کالمن (KalmanTracker) — سند §8-9 ================= */
/* State: [x,y,vx,vy,ax,ay] — Constant Acceleration */
function makeKF(x,y,dt){
  return{
    s:new Float64Array([x,y,0,0,0,0]),
    P:new Float64Array([50,0,0,0,0,0, 0,50,0,0,0,0, 0,0,900,0,0,0, 0,0,0,900,0,0, 0,0,0,0,2500,0, 0,0,0,0,0,2500]),
    inited:false
  };
}
function kfPredict(kf,dt){
  const s=kf.s;
  s[0]+=s[2]*dt+0.5*s[4]*dt*dt; s[1]+=s[3]*dt+0.5*s[5]*dt*dt;
  s[2]+=s[4]*dt; s[3]+=s[5]*dt;
  const P=kf.P,F=[1,0,dt,0,0.5*dt*dt,0, 0,1,0,dt,0,0.5*dt*dt, 0,0,1,0,dt,0, 0,0,0,1,0,dt, 0,0,0,0,1,0, 0,0,0,0,0,1];
  const NP=new Float64Array(36);
  for(let i=0;i<6;i++)for(let j=0;j<6;j++){
    let v=0;for(let k=0;k<6;k++)v+=F[i*6+k]*P[k*6+j];
    NP[i*6+j]=v;
  }
  for(let i=0;i<6;i++)for(let j=0;j<6;j++){
    let v=0;for(let k=0;k<6;k++)v+=NP[i*6+k]*F[j*6+k];
    P[i*6+j]=v;
  }
  P[0]+=2.5;P[7]+=2.5;P[14]+=180;P[21]+=180;P[28]+=500;P[35]+=500;
}
function kfUpdate(kf,zx,zy,r2){
  const s=kf.s,P=kf.P;
  const S00=P[0]+r2,S01=P[1],S10=P[6],S11=P[7]+r2;
  const det=S00*S11-S01*S10;if(!isFinite(det)||Math.abs(det)<1e-12)return;
  const K00=(P[0]*S11-P[1]*S10)/det,K01=(P[0]*S01-P[1]*S00)/det*-1;
  const K10=(P[6]*S11-P[7]*S10)/det,K11=(P[6]*S01-P[7]*S00)/det*-1;
  const K20=(P[12]*S11-P[13]*S10)/det,K21=(P[12]*S01-P[13]*S00)/det*-1;
  const K30=(P[18]*S11-P[19]*S10)/det,K31=(P[18]*S01-P[19]*S00)/det*-1;
  const K40=(P[24]*S11-P[25]*S10)/det,K41=(P[24]*S01-P[25]*S00)/det*-1;
  const K50=(P[30]*S11-P[31]*S10)/det,K51=(P[30]*S01-P[31]*S00)/det*-1;
  const ix=zx-s[0],iy=zy-s[1];
  s[0]+=K00*ix+K01*iy;s[1]+=K10*ix+K11*iy;s[2]+=K20*ix+K21*iy;
  s[3]+=K30*ix+K31*iy;s[4]+=K40*ix+K41*iy;s[5]+=K50*ix+K51*iy;
  /* P' = (I-KH)P — فرمول دقیق */
  const K=[[K00,K01],[K10,K11],[K20,K21],[K30,K31],[K40,K41],[K50,K51]];
  const P0=Float64Array.from(P);
  for(let i=0;i<6;i++)for(let j=0;j<6;j++){
    P[i*6+j]=P0[i*6+j]-K[i][0]*P0[0*6+j]-K[i][1]*P0[1*6+j];
  }
}
/* ================= تحلیل و ذخیره (Analytics/Storage) — سند §26-33,45 ================= */
/* (در اپ وب: تحلیل ضربه — در index.html. در math-core: افزودنی‌های v30 زیر) */

/* ---------- v30: Data association (چرخه‌ی کلاسیک tracking: Data association) ----------
   cands: لیست اندازه‌گیری‌ها [{x,y}] · kf: کالمن بعد از predict
   فاصله‌ی Mahalanobis در فضای innovation با دروازه‌ی chi2 (2 DOF, 99% ≈ 9.21)
   بهترین کاندیدای زیر دروازه را {x,y,d2} برمی‌گرداند، وگرنه null */
function associate(cands,kf,r2,gate){
  if(!kf||!cands||!cands.length)return null;
  const s=kf.s,P=kf.P;
  const x0=s[0],y0=s[1];
  const S00=P[0]+r2,S01=P[1],S11=P[7]+r2;
  const det=S00*S11-S01*S01;
  if(!isFinite(det)||Math.abs(det)<1e-12)return null;
  const i00=S11/det,i11=S00/det,i01=-S01/det;
  let best=null,bestD2=gate;
  for(let i=0;i<cands.length;i++){
    const z=cands[i];
    const nx=z.x-x0,ny=z.y-y0;
    const d2=i00*nx*nx+2*i01*nx*ny+i11*ny*ny;
    if(!isFinite(d2)||d2<=0||d2>=bestD2)continue;
    bestD2=d2;best={x:z.x,y:z.y,d2};
  }
  return best;
}

/* ---------- v30: مدل حرکت بالستیک (فضای تصویر) ----------
   s [m/px]؛ گرانش تصویر به پایین (y+)؛ ضریب درگ k_px = k_m * s */
function ballisticStep(pos,vel,s,dt,withDrag){
  const gpx=PHYS.g/s;
  let ax=0,ay=gpx;
  if(withDrag){
    const v=Math.hypot(vel.x,vel.y);
    const kpx=PHYS.k*s; /* k_m [1/m] × s [m/px] = k_px [1/px] */
    ax+=-kpx*v*vel.x;
    ay+=-kpx*v*vel.y;
  }
  return{
    pos:{x:pos.x+vel.x*dt+0.5*ax*dt*dt,y:pos.y+vel.y*dt+0.5*ay*dt*dt},
    vel:{x:vel.x+ax*dt,y:vel.y+ay*dt}
  };
}

/* ---------- v30: برازش زنده — درجه۲ y(t) + خطی x(t) روی پنجره‌ی اخیر ----------
   obs: [{t,x,y}] (t = ثانیه از ضربه)
   نتیجه: {a,gpx,ppm,vx,vyUp,v0,t0,n} یا null (رول/پرواز نیست/داده کم) */
function liveFit(obs,nowT,win){
  if(!obs||obs.length<6)return null;
  const w=win||0.6;
  const rec=obs.filter(o=>o.t>nowT-w&&o.t<=nowT+0.05);
  const src=rec.length>=6?rec:obs.slice(-Math.min(obs.length,12));
  if(src.length<6)return null;
  const t0=src[0].t;
  const ts=src.map(o=>o.t-t0);
  const fitY=quadFit(ts,src.map(o=>o.y));
  if(!fitY||fitY.a<0.75)return null; /* بدون انحنای عمودی = پرواز نیست */
  const fitX=quadFit(ts,src.map(o=>o.x));
  if(fitX&&Math.abs(fitX.a)>0.25*fitY.a)return null; /* شتاب افقی زیاد = رول */
  const gpx=fitY.a*2;
  const ppm=gpx/PHYS.g; /* px/m — خودکالیبراسیون گرانشی (§34) */
  if(!(ppm>2&&ppm<20000))return null; /* کالیبراسیون غیرمنطقی */
  const vx=fitX?fitX.b:0;
  const vyUp=-fitY.b;
  if(!isFinite(vx)||!isFinite(vyUp))return null;
  return{a:fitY.a,gpx,ppm,vx,vyUp,v0:Math.hypot(vx,vyUp),t0,n:src.length};
}

/* ---------- v30: قوس پیش‌بینی — شبیه‌سازی فیزیکی (متر) → بازگشت به پیکسل ----------
   از آخرین نقطه‌ی مشاهده‌شده با سرعت فیزیکی → قوس کامل تا فرود */
function predictArc(x0px,y0px,vxM,vyMup,ppm,xm){
  if(!isFinite(vxM)||!isFinite(vyMup)||!(ppm>0))return null;
  const k=xm||1;
  const sim=simCarry(vxM*k,vyMup*k);
  const pts=sim.pts.filter((p,i)=>i%6===0).slice(0,80).map(p=>({
    x:x0px+p[0]*ppm/k,
    y:y0px-p[1]*ppm/k
  }));
  const land=pts.length?pts[pts.length-1]:{x:x0px,y:y0px};
  return{pts:pts,carryM:sim.carry,land:land,t:sim.t};
}


/* ---------- v31: auto-lock stability (state machine خالص) ----------
   cand: {x,y,r} | null (این فریم کاندیدا نبود)
   sizeRef: شعاع توپِ قفل‌شده‌ی قبل (نگهبان اندازه) | 0
   نتیجه: {st, locked} — در لحظه‌ی قفل st=null برمی‌گردد */
function autoLockStep(st,cand,minFrames,sizeRef){
  if(!cand)return{st:null,locked:false};
  if(st&&Math.hypot(cand.x-st.x,cand.y-st.y)<Math.max(4,cand.r*0.6)&&Math.abs(cand.r-st.r)<st.r*0.5){
    st={x:st.x*0.6+cand.x*0.4,y:st.y*0.6+cand.y*0.4,r:cand.r,frames:st.frames+1};
  }else{
    st={x:cand.x,y:cand.y,r:cand.r,frames:1};
  }
  const locked=st.frames>=minFrames&&(!sizeRef||Math.abs(cand.r-sizeRef)<Math.max(2,sizeRef*0.5));
  return{st:locked?null:st,locked:locked};
}

return {PHYS:PHYS,YD:YD,MPH:MPH,simCarry:simCarry,det3:det3,quadFit:quadFit,
  makeKF:makeKF,kfPredict:kfPredict,kfUpdate:kfUpdate,
  associate:associate,ballisticStep:ballisticStep,liveFit:liveFit,predictArc:predictArc,autoLockStep:autoLockStep};
});
