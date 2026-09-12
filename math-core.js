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

/* ---------- v34: AUTO-LOCK چندفرضیه‌ای (multi-hypothesis) ----------
   sts: حالت‌های ثبات [{x,y,r,frames,min,misses}] — هر کاندیدا حالت خودش را نگه می‌دارد
   cands: کاندیداهای این فریم (مرتب‌شده بر اساس score)
   minF: frame لازم برای کاندیدای «بزرگ» (r>=8) · smallF: برای «کوچک» (r<8) —
         بلابِ کوچک ممکن است نویزِ روشن باشد؛ مدرکِ بیشتری می‌خواهد
   hint: {x,y,r,f} — ناحیه‌ی تاچ: کاندیدای داخل آن منطقه min=f می‌گیرد (سریع)
   sizeRef: شعاع توپِ قفل‌شده‌ی قبلی — قفل روی اندازه‌ی خیلی متفاوت ممنوع
   برگشت: {sts, locked:{x,y,r}|null, lead:{x,y,r,frames,min}|null}
   ترتیب ساختِ فرضیه: کاندیداهای بزرگ اول (به‌ترتیب score)، بعدِ کوچک — حداکثر ۴.
   دلیل: اگر یک نقطه‌ی روشنِ پایدار (مثل لبه‌ی تلویزیون) score بالاتری از توپ داشته
   باشد، قفل دیگر نمی‌تواند دزدیده شود؛ هر فرضیه جداگانه ثبات خودش را می‌شمارد. */
function autoLockMulti(sts,cands,minF,smallF,hint,sizeRef,loose){
  const LT=loose?1.5:1; /* v35.1: file mode — لرزش اندازه/موقعیت (فشرده‌سازی + لرزش دست) */
  const sizeOk=function(r){return !sizeRef||Math.abs(r-sizeRef)<Math.max(2,sizeRef*0.5*LT);};
  const out=[];
  const used=new Array(cands.length).fill(false);
  for(let i=0;i<sts.length;i++){
    const st=sts[i];
    let best=-1,bestD=1e9;
    for(let j=0;j<cands.length;j++){
      if(used[j])continue;
      const c=cands[j];
      const d=Math.hypot(c.x-st.x,c.y-st.y);
      if(d<Math.max(4,c.r*0.6)*LT&&Math.abs(c.r-st.r)<st.r*(loose?0.75:0.5)&&d<bestD){bestD=d;best=j;}
    }
    if(best>=0){
      used[best]=true;
      const c=cands[best];
      /* v35.4: dr = بیشینه‌ی نوسان شعاع بلاب در طول عمر فرضیه — توپِ کروی صلب
         r ثابت دارد (dr≈0.2-0.4)؛ گلیتِ سرِ کلاب/کفش/نوارِ چمن r لرزان دارند */
      out.push({x:st.x*0.6+c.x*0.4,y:st.y*0.6+c.y*0.4,r:c.r,frames:st.frames+1,min:st.min,misses:0,dr:Math.max(st.dr||0,Math.abs(c.r-st.r))});
    }else if(loose){
      /* v35.1: file mode — در ویدیوی فشرده‌شده بلاب گاهی ۱-۲ فریم افت می‌کند؛
         فرضیه نمی‌میرد، فقط یک فریم پس می‌رود (بدون ریست کامل) */
      out.push({x:st.x,y:st.y,r:st.r,frames:Math.max(0,st.frames-1),min:st.min,misses:(st.misses||0)+1,dr:st.dr||0});
    }else if((st.misses||0)<2){
      out.push({x:st.x,y:st.y,r:st.r,frames:st.frames,min:st.min,misses:(st.misses||0)+1,dr:st.dr||0});
    }
  }
  for(let pass=0;pass<2&&out.length<4;pass++){
    for(let j=0;j<cands.length&&out.length<4;j++){
      if(used[j])continue;
      const c=cands[j];
      const small=c.r<8;
      if((pass===0&&small)||(pass===1&&!small))continue;
      const hintOk=hint&&Math.hypot(c.x-hint.x,c.y-hint.y)<=hint.r;
      out.push({x:c.x,y:c.y,r:c.r,frames:1,min:hintOk?hint.f:(small?smallF:minF),misses:0,dr:0});
      used[j]=true;
    }
  }
  let locked=null;
  for(let i=0;i<out.length;i++){
    const st=out[i];
    if(st.frames>=st.min&&sizeOk(st.r)){
      if(!locked||st.r>locked.r)locked={x:st.x,y:st.y,r:st.r};
    }
  }
  let lead=null,leadP=-1;
  for(let i=0;i<out.length;i++){
    const pr=out[i].frames/out[i].min;
    if(pr>leadP|| (pr===leadP&&(!lead||out[i].r>lead.r))){lead=out[i];leadP=pr;}
  }
  return{sts:out,locked:locked,lead:lead?{x:lead.x,y:lead.y,r:lead.r,frames:lead.frames,min:lead.min}:null};
}


/* ================= v33: مدل ۳بعدی (کالیبراسیون + فیت بالستیک) =================
   مختصات جهان: مبدأ = نقطه‌ی تماس توپ با زمین؛ x=راست، y=سوی هدف، z=بالا.
   دوربین در (0,-d,h) با چرخش pitch به پایین. */

/* تصویرسازی: P=[x,y,z] → {u,v,z(عمق)} — f=f_x، fy=f_y (کشش بوم تحلیلی) */
function project(cam,P){
  const fx=cam.f,fy=cam.fy||cam.f;
  const vx=P[0]-cam.C[0],vy=P[1]-cam.C[1],vz=P[2]-cam.C[2];
  const c=Math.cos(cam.theta),s=Math.sin(cam.theta);
  const Z=vy*c-vz*s;
  if(Z<=0.05)return null;
  return{u:cam.cx+fx*vx/Z,v:cam.cy+fy*(-vy*s-vz*c)/Z,z:Z};
}

/* کالیبراسیون پوز دوربین از توپِ ایستاده در مرکز کادر:
   (1) عمق از اندازه: Z0 = f·D/2r
   (2) تصویر مرکز توپ، (3) تصویر نقطه‌ی تماس (پایینِ توپ ≈ v+r)
   مجهولات: d (فاصله)، h (ارتفاع)، theta (pitch) — جستجوی شبکه + ریزبندی */
function calibBallPose(f,fy,cx,cy,u,v,r){
  if(!(r>=1&&r<=60&&f>10&&fy>10))return null;
  const D=0.04267;
  const Z0=f*D/(2*r);
  const ev=function(th,h){
    const c=Math.cos(th),s=Math.sin(th);
    const d=(Z0+(D/2-h)*s)/c;
    if(!(d>0.4&&d<12))return null;
    const e1=(cy+fy*(-d*s-(D/2-h)*c)/Z0)-v;
    const e2=(cy+fy*(h*c-d*s)/(d*c+h*s))-(v+r);
    const ep=(h-1.15)/0.3;return{th:th,h:h,d:d,err:e1*e1+e2*e2+2.25*ep*ep};
  };
  let best=null;
  for(let th=0.02;th<=1.08;th+=0.01){
    for(let h=0.35;h<=2.6;h+=0.02){
      const e=ev(th,h);
      if(e&&(!best||e.err<best.err))best=e;
    }
  }
  if(!best)return null;
  for(let it=0;it<3;it++){
    const st=(it===0?0.01:(it===1?0.004:0.0016));
    const sth=st*1.5,sth2=st*1.5;
    let local=null;
    for(let th=best.th-sth2;th<=best.th+sth2;th+=sth2/3){
      for(let h=best.h-sth*3;h<=best.h+sth*3;h+=sth){
        const e=ev(th,h);
        if(e&&(!local||e.err<local.err))local=e;
      }
    }
    if(!local||local.err>=best.err)break;
    best=local;
  }
  if(best.err>36)return null; /* ~6px حداکثر خطا */
  return{f:f,fy:fy,cx:cx,cy:cy,theta:best.th,h:best.h,d:best.d,rms:Math.sqrt(best.err)/2,Z0:Z0};
}

/* شبیه‌سازی بالستیک ۳بعدی — درگ + لیفت مگنوس (بک‌اسپین) */
function simCarry3D(v0,spin){
  const D=0.04267;
  let x=0,y=0,z=D/2;
  let vx=v0[0],vy=v0[1],vz=v0[2];
  const dt=0.008;
  const pts=[[0,0,D/2]];
  let t=0;
  for(let i=0;i<4000;i++){
    const v=Math.hypot(vx,vy,vz);
    let ax=-PHYS.k*v*vx,ay=-PHYS.k*v*vy,az=-PHYS.g-PHYS.k*v*vz;
    if(spin>0&&v>0.5){
      const L=v;
      ax+=PHYS.kl*spin*(-vx*vz/L);
      ay+=PHYS.kl*spin*(-vy*vz/L);
      az+=PHYS.kl*spin*((vx*vx+vy*vy)/L);
    }
    vx+=ax*dt;vy+=ay*dt;vz+=az*dt;
    x+=vx*dt;y+=vy*dt;z+=vz*dt;t+=dt;
    pts.push([x,y,z]);
    if(z<=0.01&&t>0.15)break;
  }
  return{carry:Math.hypot(x,y),t:t,pts:pts,end:[x,y]};
}

/* solve4: حل سیستم 4×4 */
function solve4(A,b){
  const M=[];
  for(let i=0;i<4;i++)M.push([A[i*4],A[i*4+1],A[i*4+2],A[i*4+3],b[i]]);
  for(let col=0;col<4;col++){
    let piv=col;
    for(let r2=col+1;r2<4;r2++)if(Math.abs(M[r2][col])>Math.abs(M[piv][col]))piv=r2;
    if(Math.abs(M[piv][col])<1e-12)return null;
    if(piv!==col){const t=M[piv];M[piv]=M[col];M[col]=t;}
    for(let r2=col+1;r2<4;r2++){
      const f2=M[r2][col]/M[col][col];
      for(let c2=col;c2<5;c2++)M[r2][c2]-=f2*M[col][c2];
    }
  }
  const x=[0,0,0,0];
  for(let r2=3;r2>=0;r2--){
    let s2=M[r2][4];
    for(let c2=r2+1;c2<4;c2++)s2-=M[r2][c2]*x[c2];
    x[r2]=s2/M[r2][r2];
  }
  return x;
}

/* فیت ۳بعدی: par=[vx0,vy0,vz0,spin] — Gauss-Newton روی باقی‌مانده‌های (u,v)
   obs: [{t,u,v}] (t از لحظه‌ی ضربه، پیکسلِ بوم تحلیلی) */
function solveN(A,b,n){
  const M=[];
  for(let i=0;i<n;i++){const row=[];for(let j=0;j<n;j++)row.push(A[i*n+j]);row.push(b[i]);M.push(row);}
  for(let col=0;col<n;col++){
    let piv=col;
    for(let r2=col+1;r2<n;r2++)if(Math.abs(M[r2][col])>Math.abs(M[piv][col]))piv=r2;
    if(Math.abs(M[piv][col])<1e-12)return null;
    if(piv!==col){const t=M[piv];M[piv]=M[col];M[col]=t;}
    for(let r2=col+1;r2<n;r2++){
      const f2=M[r2][col]/M[col][col];
      for(let c2=col;c2<=n;c2++)M[r2][c2]-=f2*M[col][c2];
    }
  }
  const x=new Array(n);
  for(let r2=n-1;r2>=0;r2--){
    let s2=M[r2][n];
    for(let c2=r2+1;c2<n;c2++)s2-=M[r2][c2]*x[c2];
    x[r2]=s2/M[r2][r2];
  }
  return x;
}

/* فیت ۳بعدی هم‌زمان: par=[vx0,vy0,vz0,spin,theta,h,d]
   پوز دوربین (theta,h,d) هم با ترایدکتوری جابه‌جایی می‌کند — مدل ۲مجهولِ تک‌فریم با
   داده‌ی چندفریمiی قابل‌تعیین می‌شود. obs: [{t,u,v}] از لحظه‌ی ضربه */
function fit3D(cam,obs,hint){
  if(!cam||!obs||obs.length<6)return null;
  const cN=function(v,a,b){return v<a?a:(v>b?b:v);};
  const f=cam.f,fy=cam.fy||cam.f,cx=cam.cx,cy=cam.cy;
  let p=[hint?hint.vx:0,hint?hint.vy:25,hint?hint.vz:8,hint?hint.spin:1,
         cam.theta||0.35,cam.h||1.15,cam.d||2.2];
  if(!isFinite(p[0])||!isFinite(p[1])||!isFinite(p[2])){p=[0,25,8,1,cam.theta||0.35,cam.h||1.15,cam.d||2.2];}
  const clampPar=function(par){
    return[cN(par[0],-80,80),cN(par[1],-10,90),cN(par[2],-5,35),cN(par[3],0,3),
           cN(par[4],0.02,1.1),cN(par[5],0.35,2.6),cN(par[6],0.4,12)];
  };
  p=clampPar(p);
  const resid=function(par){
    const sim=simCarry3D([par[0],par[1],par[2]],par[3]);
    const cam2={f:f,fy:fy,cx:cx,cy:cy,theta:par[4],h:par[5],d:par[6],C:[0,-par[6],par[5]]};
    const out=[];
    for(let i=0;i<obs.length;i++){
      const o=obs[i];
      const idx=Math.min(sim.pts.length-1,Math.round(o.t/0.008));
      const pr=project(cam2,sim.pts[idx]);
      if(!pr)return null;
      out.push(pr.u-o.u,pr.v-o.v);
    }
    let ss=0;for(let i=0;i<out.length;i++)ss+=out[i]*out[i];
    return{r:out,ss:ss};
  };
  let cur=resid(p);
  if(!cur)return null;
  let best=cur.ss;
  let steps=[0.15,0.15,0.15,0.04,0.008,0.02,0.02];
  const stepsMax=[0.15,0.15,0.15,0.04,0.008,0.02,0.02];
  const n=7;
  let stuck=0;
  for(let it=0;it<60&&best>9;it++){
    const par=p.slice();
    const J=new Float64Array(2*obs.length*n);
    const b=new Float64Array(n);
    let okJ=true;
    for(let j=0;j<n;j++){
      const p2=par.slice();p2[j]+=steps[j];
      const r2=resid(p2);
      if(!r2){okJ=false;break;}
      for(let i=0;i<cur.r.length;i++){
        J[i*n+j]=(r2.r[i]-cur.r[i])/steps[j];
        b[j]+=J[i*n+j]*cur.r[i];
      }
    }
    if(!okJ)break;
    const A=new Float64Array(n*n);
    for(let i=0;i<n;i++)for(let j=0;j<n;j++){
      let s2=0;
      for(let k=0;k<cur.r.length;k++)s2+=J[k*n+i]*J[k*n+j];
      A[i*n+j]=s2;
    }
    const mu=0.01;
    for(let i=0;i<n;i++)A[i*n+i]+=mu*steps[i]*steps[i];
    const d=solveN(A,[-b[0],-b[1],-b[2],-b[3],-b[4],-b[5],-b[6]],n);
    if(!d)break;
    const np=clampPar([par[0]+d[0],par[1]+d[1],par[2]+d[2],par[3]+d[3],par[4]+d[4],par[5]+d[5],par[6]+d[6]]);
    const r3=resid(np);
    if(r3&&r3.ss<best-1e-9){
      best=r3.ss;cur=r3;p=np;stuck=0;
    }else{
      stuck++;
      if(stuck>=3){
        steps=steps.map(function(s2){return s2*0.5;});
        stuck=0;
        let mn=1e9;for(let q=0;q<n;q++)if(steps[q]<mn)mn=steps[q];
        if(mn<1e-4)break;
      }
    }
  }
  const m2=obs.length;
  const rms=Math.sqrt(best/(2*m2));
  if(!(rms<4))return null;
  const v0=Math.hypot(p[0],p[1],p[2]);
  const sim=simCarry3D([p[0],p[1],p[2]],p[3]);
  let apex=0;
  for(let i=0;i<sim.pts.length;i++)if(sim.pts[i][2]>apex)apex=sim.pts[i][2];
  return{
    vx:p[0],vy:p[1],vz:p[2],spin:p[3],v0:v0,
    theta:p[4],h:p[5],d:p[6],
    elevDeg:Math.asin(cN(p[2]/v0,-1,1))*180/Math.PI,
    azimDeg:Math.atan2(p[0],p[1])*180/Math.PI,
    carry:sim.carry,t:sim.t,apex:apex,rms:rms,
    pts3d:sim.pts.filter(function(q,i){return i%12===0;})
  };
}

/* زمان ضربه از داده‌ی ردیابی: اولین لحظه‌ای که توپ از نقطه‌ی شروع به‌طور مداوم جابه‌جا می‌شود */
function findImpactTime(obs){
  if(!obs||obs.length<6)return null;
  const bx=obs[0].x,by=obs[0].y;
  for(let i=2;i<Math.min(obs.length,400);i++){
    const d1=Math.hypot(obs[i].x-bx,obs[i].y-by);
    const d0=Math.hypot(obs[i-1].x-bx,obs[i-1].y-by);
    if(d1>6&&d1>d0+2){
      let m=0;
      for(let k=i;k<Math.min(obs.length,i+6);k++){
        if(Math.hypot(obs[k].x-obs[i-1].x,obs[k].y-obs[i-1].y)>4)m++;
      }
      if(m>=3)return obs[i-1].t;
    }
  }
  return null;
}

return {PHYS:PHYS,YD:YD,MPH:MPH,simCarry:simCarry,det3:det3,quadFit:quadFit,
  makeKF:makeKF,kfPredict:kfPredict,kfUpdate:kfUpdate,
  associate:associate,ballisticStep:ballisticStep,liveFit:liveFit,predictArc:predictArc,autoLockStep:autoLockStep,autoLockMulti:autoLockMulti,project:project,calibBallPose:calibBallPose,simCarry3D:simCarry3D,fit3D:fit3D,findImpactTime:findImpactTime};
});
