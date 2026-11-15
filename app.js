"use strict";
const q=(sel,root=document)=>root.querySelector(sel);
const qa=(sel,root=document)=>[...root.querySelectorAll(sel)];
const motionPreference=matchMedia("(prefers-reduced-motion: reduce)");
const root=document.documentElement;
const canAnimate=()=>!motionPreference.matches;
function syncMotionChoice(){
  root.classList.toggle("less-motion",!canAnimate());
}
syncMotionChoice();
motionPreference.addEventListener("change",()=>{
  syncMotionChoice();
  dispatchEvent(new Event("aoun-motion-change"));
});
const siteLoader=q("#site-loader");
function closeSiteIntro(){
  if(!root.classList.contains("site-intro-active"))return;
  root.classList.remove("site-intro-active");
  dispatchEvent(new Event("aoun-intro-done"));
}
if(siteLoader){
  siteLoader.addEventListener("animationend",e=>{if(e.target===siteLoader)closeSiteIntro();});
  addEventListener("pagehide",closeSiteIntro);
  addEventListener("aoun-motion-change",()=>{if(!canAnimate())closeSiteIntro();});
}


// Keep reveal animation reversible as content approaches from either direction.
if("IntersectionObserver" in window){
  root.classList.add("motion");
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting||entry.boundingClientRect.top>0){
      entry.target.classList.toggle("visible",entry.isIntersecting);
    }
  }),{threshold:.08,rootMargin:"0px 0px 5% 0px"});
  qa(".reveal").forEach(el=>observer.observe(el));
}

const story=q("#story"), steps=story?qa("[data-story-step]",story):[];
const frames=story?qa("[data-story-frame]",story):[];
const siteHeader=q(".top");
const pagePalette=[[10,25,50],[13,36,67],[8,39,47],[8,20,41]];
let storyIndex=-1, ticking=false, headerCompact=false, pageTint=-1;
function paintScroll(){
  ticking=false;
  const top=window.scrollY, viewport=window.innerHeight;
  const compact=top>(headerCompact?40:64);
  if(compact!==headerCompact){
    headerCompact=compact;
    siteHeader?.classList.toggle("is-compact",compact);
  }
  const scrollMax=root.scrollHeight-viewport;
  const progress=scrollMax>0?Math.max(0,Math.min(1,top/scrollMax)):0;
  root.style.setProperty("--progress",progress);
  const tint=canAnimate()?Math.round(progress*1000):0;
  if(tint!==pageTint){
    pageTint=tint;
    const position=tint/1000*(pagePalette.length-1);
    const index=Math.min(Math.floor(position),pagePalette.length-2);
    const blend=position-index;
    const color=pagePalette[index].map((channel,i)=>Math.round(channel+(pagePalette[index+1][i]-channel)*blend));
    root.style.setProperty("--page-background",`rgb(${color.join(",")})`);
  }
  const offset=Math.min(Math.max(0,top),viewport);
  root.style.setProperty("--atmosphere-shift",canAnimate()?offset*.095+"px":"0px");
  root.style.setProperty("--product-shift",canAnimate()?offset*-.047+"px":"0px");
  if(!story)return;
  const anchor=viewport*(innerWidth<=720?.7:.56);
  let next=0;
  steps.forEach((step,i)=>{if(step.getBoundingClientRect().top<=anchor)next=i;});
  if(storyIndex===next)return;
  storyIndex=next;
  story.style.setProperty("--story-progress",(next+1)/steps.length);
  const scene=q("[data-invoice-scene]",story);
  if(scene){
    scene.dataset.invoiceScene=next;
    q(".scene-caption",scene).textContent=["١ · الفاتورة الأصلية جاهزة للرفع","٢ · عَون ينقل البيانات من المستند","٣ · يفحص احتمال التكرار قبل التسجيل","٤ · راجع البيانات ثم اعتمدها"][next];
    q(".monitor-status",scene).textContent=next===2?"✓ لا يوجد تكرار في هذا المثال":"بانتظار مراجعة فريقك";
  }
  steps.forEach((step,i)=>step.classList.toggle("is-active",i===next));
  frames.forEach((frame,i)=>{
    frame.classList.toggle("is-active",i===next);
    frame.setAttribute("aria-hidden",String(i!==next));
  });
}
function onScroll(){
  if(ticking)return; ticking=true; requestAnimationFrame(paintScroll);
}
addEventListener("scroll",onScroll,{passive:true});
addEventListener("resize",onScroll,{passive:true});
addEventListener("pageshow",onScroll);
addEventListener("aoun-motion-change",onScroll);
onScroll();

const menu=q(".menu"), nav=q("#navlinks");
function setMenu(open){
  nav.classList.toggle("open",open);menu.setAttribute("aria-expanded",String(open));
  menu.setAttribute("aria-label",open?"إغلاق القائمة":"فتح القائمة");
}
menu.addEventListener("click",()=>setMenu(!nav.classList.contains("open")));
qa("a",nav).forEach(a=>a.addEventListener("click",()=>setMenu(false)));
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&nav.classList.contains("open")){setMenu(false);menu.focus();}
});

// Keep decorative loops local to the visible preview.
function setupLoop({target,count,duration,render,staticIndex}){
  let index=0, visible=!("IntersectionObserver" in window), timer=0;
  const delayAt=i=>typeof duration==="function"?duration(i):duration;
  function schedule(delay=delayAt(index)){
    clearTimeout(timer);
    if(visible&&canAnimate()&&!document.hidden&&!root.classList.contains("site-intro-active")){
      timer=setTimeout(()=>{go(index+1);},delay);
    }
  }
  function go(next,manual=false){
    index=(next+count)%count;
    render(index,manual);
    schedule(manual?Math.max(delayAt(index),4600):delayAt(index));
  }
  if("IntersectionObserver" in window){
    const watch=new IntersectionObserver(([entry])=>{
      visible=entry.isIntersecting&&entry.intersectionRatio>=.35;
      schedule();
    },{threshold:.35});
    watch.observe(target);
  }
  document.addEventListener("visibilitychange",()=>schedule());
  addEventListener("aoun-intro-done",()=>schedule());
  function syncMotion(){
    if(!canAnimate()&&staticIndex!==undefined)go(staticIndex);
    else schedule();
  }
  addEventListener("aoun-motion-change",syncMotion);
  syncMotion();
  return {go};
}

const rail=q("#flow-rail");
if(rail){
  const stageText=[
    "ارفع فواتير المشتريات دفعة واحدة وارجع للمستند الأصلي وقت المراجعة.",
    "عَون يقرأ بيانات المورد ورقم الفاتورة والإجمالي والبنود من المستند.",
    "لو ظهرت فاتورة محتملة التكرار، عَون ينبه الفريق عشان يراجعها.",
    "فريقك يراجع البيانات ويعتمدها قبل التسجيل في النظام المحاسبي المرتبط."
  ];
  const stages=qa("button",rail), dots=qa(".flow-dots i"), panel=q("#flow-panel"), copy=q("#flow-text");
  const loop=setupLoop({target:rail,count:4,duration:1650,
    render(i,manual){
      if(manual)panel.setAttribute("aria-live","polite");else panel.removeAttribute("aria-live");
      stages.forEach((button,j)=>button.setAttribute("aria-pressed",String(j===i)));
      dots.forEach((dot,j)=>dot.classList.toggle("on",j===i));
      q("#flow-count").firstChild.nodeValue=["٠١ ","٠٢ ","٠٣ ","٠٤ "][i];
      copy.textContent=stageText[i];
      if(canAnimate())copy.animate([{opacity:0,transform:"translateY(4px)"},{opacity:1,transform:"translateY(0)"}],{duration:240,easing:"ease-out"});
    }
  });
  stages.forEach((button,i)=>button.addEventListener("click",()=>loop.go(i,true)));
  rail.addEventListener("keydown",e=>{
    const i=stages.indexOf(e.target);
    if(i<0)return;
    const next={"ArrowLeft":i+1,"ArrowRight":i-1,"Home":0,"End":stages.length-1}[e.key];
    if(next===undefined)return;
    e.preventDefault();loop.go(next,true);stages[(next+stages.length)%stages.length].focus();
  });
}

const heroDemo=q("#hero-demo");
if(heroDemo){
  const state=q("#demo-state"), segments=qa(".product-timeline i",heroDemo), fields=qa(".demo-value",heroDemo);
  const eventBox=q(".invoice-event",heroDemo), eventTitle=q("#invoice-event-title"), eventDetail=q("#invoice-event-detail");
  const eventMark=q("#invoice-event-mark"), counter=q("#invoice-stage-count"), eventCode=q("#invoice-event-code");
  const phases=[
    ["upload",2300,"تم رفع الفاتورة","وصل الملف للدفعة","جاهز للقراءة","M12 16V5m-4 4 4-4 4 4M6 15v4h12v-4"],
    ["scan",2600,"جارٍ استخراج البيانات","قراءة الفاتورة","جاري تحديد الرقم والإجمالي","M8 5H5v3m11-3h3v3M5 16v3h3m11-3v3h-3M4 12h16"],
    ["verified",2300,"اكتمل فحص التكرار","تم التحقق من البيانات","لا يوجد تطابق في هذا المثال","m5 12 4 4 10-10"],
    ["review",3000,"قيد المراجعة","بانتظار اعتماد المحاسب","مطابقة البيانات مع المستند الأصلي","M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0"],
    ["posted",3200,"تم تسجيل الفاتورة","تم تسجيل الفاتورة بعد موافقة فريقك","البيانات انتقلت للنظام المحاسبي في هذا المثال","m5 12 4 4 10-10"]
  ];
  const demoLoop=setupLoop({target:heroDemo,count:phases.length,duration:i=>phases[i][1],staticIndex:4,
    render(i){
      const [phase,,message,title,detail,glyph]=phases[i];
      heroDemo.dataset.phase=phase;
      fields.forEach(field=>field.setAttribute("aria-hidden",String(i<2)));
      eventCode.setAttribute("aria-hidden",String(i!==4));
      eventMark.setAttribute("d",glyph);
      eventTitle.textContent=title;eventDetail.textContent=detail;
      state.textContent=message;counter.textContent="١٢٣٤٥"[i]+" / ٥";
      segments.forEach((segment,j)=>{
        segment.classList.toggle("done",j<=i);segment.classList.toggle("on",j===i);
      });
      if(canAnimate()){
        eventBox.animate([{opacity:.55,transform:"translateY(5px)"},{opacity:1,transform:"translateY(0)"}],{duration:340,easing:"ease-out"});
        if(i===2)fields.forEach((field,j)=>field.animate(
          [{opacity:0,transform:"translateY(5px)"},{opacity:1,transform:"translateY(0)"}],
          {duration:360,delay:j*115,fill:"backwards",easing:"ease-out"}
        ));
      }
    }
  });
  function launchDemo(){
    demoLoop.go(canAnimate()?0:4);
    heroDemo.focus({preventScroll:true});
    if(canAnimate())heroDemo.animate([{filter:"brightness(1.21)"},{filter:"brightness(1)"}],{duration:640,easing:"ease-out"});
  }
  qa("[data-demo-start]").forEach(link=>link.addEventListener("click",launchDemo));
  if(location.hash==="#hero-demo")launchDemo();
}

const arabicNumber=new Intl.NumberFormat("ar-SA-u-nu-arab",{maximumFractionDigits:1});
const estimator=q("[data-estimator]");
if(estimator){
  const field=q("#invoice-count",estimator), slider=q("#invoice-slider",estimator);
  const saved=q("#estimate-saved",estimator), unit=q("#estimate-unit",estimator);
  const manual=q("#estimate-manual",estimator), automated=q("#estimate-aoun",estimator);
  const announcement=q("#estimate-announcement",estimator);
  const max=Number(slider.max), minutesManual=5.5, minutesPrototype=1;
  let announceTimer;
  function parseCount(raw){
    const digits=raw.replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-0x660))
      .replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-0x6f0)).replace(/[٬,\s]/g,"");
    return /^\d+$/.test(digits)?Math.min(max,Number(digits)):0;
  }
  function hoursLabel(minutes){
    const hours=minutes/60;
    if(hours===1)return "ساعة واحدة";
    if(hours===2)return "ساعتان";
    return arabicNumber.format(hours)+(Number.isInteger(hours)&&hours>=3&&hours<=10?" ساعات":" ساعة");
  }
  function updateEstimate(count,announce=false){
    const manualMinutes=count*minutesManual, prototypeMinutes=count*minutesPrototype;
    const difference=manualMinutes-prototypeMinutes;
    const useMinutes=difference>0&&difference<60;
    slider.value=String(count);
    slider.style.setProperty("--range-fill",count/max*100+"%");
    slider.setAttribute("aria-valuetext",arabicNumber.format(count)+" فاتورة");
    saved.textContent=arabicNumber.format(useMinutes?difference:difference/60);
    unit.textContent=useMinutes?"دقيقة / شهر":"ساعة / شهر";
    manual.textContent=hoursLabel(manualMinutes);
    automated.textContent=hoursLabel(prototypeMinutes);
    if(announce){
      clearTimeout(announceTimer);
      announceTimer=setTimeout(()=>{
        announcement.textContent="الوقت التقديري اللي ممكن توفّره: "+saved.textContent+" "+unit.textContent;
      },300);
    }
  }
  slider.addEventListener("input",()=>{
    const count=Number(slider.value);
    field.value=arabicNumber.format(count);
    updateEstimate(count,true);
  });
  field.addEventListener("input",()=>updateEstimate(parseCount(field.value),true));
  field.addEventListener("change",()=>{field.value=arabicNumber.format(parseCount(field.value));});
  field.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();field.blur();}});
  updateEstimate(parseCount(field.value));
}

for(const details of qa(".questions details")){
  const summary=q("summary",details), answer=q(".faq-answer",details);
  if(!summary||!answer||typeof answer.animate!=="function")continue;
  let expanded=details.open, running=null;
  details.classList.add("faq-enhanced");
  details.classList.toggle("faq-expanded",expanded);
  summary.addEventListener("click",e=>{
    if(e.defaultPrevented||e.button!==0)return;
    e.preventDefault();
    const from=details.open?answer.getBoundingClientRect().height:0;
    if(running)running.cancel();
    expanded=!expanded;
    details.classList.toggle("faq-expanded",expanded);
    if(!canAnimate()){
      details.open=expanded;running=null;return;
    }
    if(expanded)details.open=true;
    const target=expanded?answer.scrollHeight:0;
    if(Math.abs(target-from)<1){details.open=expanded;running=null;return;}
    const animation=answer.animate([{height:from+"px",opacity:from>0?1:0},{height:target+"px",opacity:expanded?1:0}],{
      duration:290,easing:"cubic-bezier(.24,.78,.25,1)",fill:"both"
    });
    running=animation;
    animation.onfinish=()=>{
      if(running!==animation)return;
      details.open=expanded;
      running=null;
      animation.cancel();
    };
  });
}

const planDialog=q("#plan-dialog");
if(planDialog){
  const billing=q(".billing-choice"), buttons=qa("[data-plan]"), note=q("#billing-note");
  let annual=false;
  function shownPrice(button){return arabicNumber.format(Number(button.dataset.price)*(annual?12:1));}
  function shownUnit(){return annual?"ر.س / ١٢ شهرًا":"ر.س / شهر";}
  function updateBilling(){
    if(billing)qa("[data-billing]",billing).forEach(button=>{
      button.setAttribute("aria-pressed",String((button.dataset.billing==="annual")===annual));
    });
    buttons.forEach(button=>{
      const price=q(".plan-price",button.closest(".plan-card"));
      q("strong",price).textContent=shownPrice(button);
      q("span",price).textContent=shownUnit();
    });
    if(note)note.textContent=annual?"الإجمالي السنوي مجرد تقدير: السعر الشهري × ١٢، بدون خصم.":"";
  }
  if(billing){
    billing.hidden=false;
    qa("[data-billing]",billing).forEach(button=>button.addEventListener("click",()=>{
      annual=button.dataset.billing==="annual";updateBilling();
    }));
  }
  buttons.forEach(button=>button.addEventListener("click",()=>{
    q("#plan-title").textContent="معاينة باقة "+button.dataset.plan;
    q("#plan-preview-price").textContent=shownPrice(button);
    q("#plan-preview-unit").textContent=shownUnit();
    planDialog.showModal();
  }));
  q("#plan-close").addEventListener("click",()=>planDialog.close());
  updateBilling();
}

const dialog=q("#contact-dialog");
if(dialog){
  const status=q("#copy-status");
  q("#contact-open").addEventListener("click",()=>{status.textContent="";dialog.showModal();});
  q("#contact-close").addEventListener("click",()=>dialog.close());
  q("#copy").addEventListener("click",async()=>{
    const msg=q("#offer");
    try{await navigator.clipboard.writeText(msg.value);status.textContent="تم نسخ الرسالة.";}
    catch{msg.focus();msg.select();status.textContent="تم تحديد الرسالة. انسخها لإرسالها.";}
  });
}
