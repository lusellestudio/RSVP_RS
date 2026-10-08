
// Invitation gate + background music
(() => {
  const gate = document.getElementById('invitationGate');
  const openBtn = document.getElementById('openInvitationBtn');
  const music = document.getElementById('backgroundMusic');
  const musicToggle = document.getElementById('musicToggle');
  if (!gate || !openBtn || !music || !musicToggle) return;

  document.body.classList.add('invitation-locked');

  async function openInvitation(){
    gate.classList.add('is-hidden');
    document.body.classList.remove('invitation-locked');
    musicToggle.classList.add('is-visible');
    try {
      music.volume = 0.72;
      await music.play();
      musicToggle.classList.remove('is-muted');
      musicToggle.setAttribute('aria-label','Pause background music');
      musicToggle.setAttribute('title','Pause music');
      musicToggle.setAttribute('aria-pressed','true');
    } catch (err) {
      console.warn('Background music could not start:', err);
      musicToggle.classList.add('is-muted');
      musicToggle.setAttribute('aria-label','Play background music');
      musicToggle.setAttribute('title','Play music');
      musicToggle.setAttribute('aria-pressed','false');
    }
  }

  openBtn.addEventListener('click', openInvitation);
  musicToggle.addEventListener('click', async () => {
    if (music.paused) {
      try { await music.play(); } catch (err) { console.warn(err); }
      musicToggle.classList.remove('is-muted');
      musicToggle.setAttribute('aria-label','Pause background music');
      musicToggle.setAttribute('title','Pause music');
      musicToggle.setAttribute('aria-pressed','true');
    } else {
      music.pause();
      musicToggle.classList.add('is-muted');
      musicToggle.setAttribute('aria-label','Play background music');
      musicToggle.setAttribute('title','Play music');
      musicToggle.setAttribute('aria-pressed','false');
    }
  });
})();


const API_URL = window.RSVP_API_URL || "https://script.google.com/macros/s/AKfycbzX6D5-8VYcLKpmIFQunKkYfniM-5INKB2j9iLVfYyeBgsglHJokfLMFb4_nFe-91rCzQ/exec";
const $ = id => document.getElementById(id);
let selected = null, searchTimer = null;

window.addEventListener("load",()=>setTimeout(()=>$("loader").classList.add("done"),450));
window.addEventListener("scroll",()=>$("siteHeader").classList.toggle("scrolled",window.scrollY>30));

const toggle=$("menuToggle"), nav=document.querySelector("#mainNav");
toggle.addEventListener("click",()=>nav.classList.toggle("open"));
nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>nav.classList.remove("open")));

function status(el,msg,type=""){el.textContent=msg;el.className="status"+(type?" "+type:"");}
function esc(v){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}

async function searchGuests(){
  const q=$("nameSearch").value.trim();
  $("results").innerHTML="";
  if(q.length<2){status($("searchStatus"),"Please enter at least 2 characters.");return;}
  $("searchBtn").disabled=true; status($("searchStatus"),"Searching…");
  try{
    const r=await fetch(`${API_URL}?action=search&name=${encodeURIComponent(q)}`,{redirect:"follow"});
    const data=await r.json();
    if(!data.success) throw new Error(data.message||"Unable to search.");
    const guests=data.guests||[];
    if(!guests.length){status($("searchStatus"),"No matching invitation found. Please check the spelling or try another part of your name.");return;}
    status($("searchStatus"),`${guests.length} invitation${guests.length===1?"":"s"} found.`);
    guests.forEach(g=>{
      const b=document.createElement("button"); b.type="button"; b.className="guest-option";
      b.innerHTML=`<strong>${esc(g.name)}</strong><small>${g.group?esc(g.group)+" · ":""}${Number(g.reservedSeats)} reserved seat${Number(g.reservedSeats)===1?"":"s"}</small>`;
      b.onclick=()=>selectGuest(g); $("results").appendChild(b);
    });
  }catch(e){console.error(e);status($("searchStatus"),"We couldn't connect to the invitation list. Please check that your Google Apps Script is deployed as a Web App accessible to guests.","error");}
  finally{$("searchBtn").disabled=false;}
}

function selectGuest(g){
 selected=g;
 $("selectedGuest").innerHTML=`<div class="selected-name">${esc(g.name)}</div><div class="selected-meta">${g.group?esc(g.group)+" · ":""}${Number(g.reservedSeats)} reserved seat${Number(g.reservedSeats)===1?"":"s"}</div>`;
 const max=Math.max(0,Number(g.reservedSeats)||0); $("confirmedSeats").innerHTML="";
 for(let i=1;i<=max;i++){const o=document.createElement("option");o.value=i;o.textContent=`${i} seat${i===1?"":"s"}`;$("confirmedSeats").appendChild(o);}
 $("seatNote").textContent=`You may confirm up to ${max} reserved seat${max===1?"":"s"}.`;
 $("searchStep").classList.add("hidden"); $("formStep").classList.remove("hidden"); $("rsvpForm").classList.remove("hidden");
 if(String(g.rsvpStatus||"").toLowerCase()!=="pending") {
   $("rsvpForm").classList.add("hidden");
   status($("formStatus"),`Your RSVP is already recorded as ${g.rsvpStatus}. Please contact the couple for changes.`,"error");
 }
 document.querySelectorAll('input[name="attendance"]').forEach(x=>x.checked=false);
 $("seatsField").classList.remove("hidden");
}

document.querySelectorAll('input[name="attendance"]').forEach(r=>r.addEventListener("change",()=>{
 $("seatsField").classList.toggle("hidden",document.querySelector('input[name="attendance"]:checked')?.value==="no");
}));
$("searchBtn").addEventListener("click",searchGuests);
$("nameSearch").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();searchGuests();}});
$("nameSearch").addEventListener("input",()=>{
 clearTimeout(searchTimer); const q=$("nameSearch").value.trim();
 if(q.length<2){$("results").innerHTML="";status($("searchStatus"),"");return;}
 searchTimer=setTimeout(searchGuests,400);
});

$("rsvpForm").addEventListener("submit",async e=>{
 e.preventDefault(); if(!selected)return;
 const attendance=document.querySelector('input[name="attendance"]:checked')?.value;
 if(!attendance){status($("formStatus"),"Please select your attendance.","error");return;}
 const seats=attendance==="yes"?Number($("confirmedSeats").value):0;
 if(attendance==="yes" && (!Number.isInteger(seats)||seats<1||seats>Number(selected.reservedSeats))){status($("formStatus"),"Please select a valid number of seats.","error");return;}
 $("submitBtn").disabled=true;status($("formStatus"),"Submitting your RSVP…");
 const body=new URLSearchParams({guestId:selected.id,attendance,confirmedSeats:String(seats),message:$("message").value.trim().slice(0,500),songRequest:$("songRequest").value.trim().slice(0,150)});
 try{
   const r=await fetch(API_URL,{method:"POST",redirect:"follow",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body});
   const data=await r.json();
   if(!data.success) throw new Error(data.duplicate?"Your RSVP has already been recorded. Please contact the couple for changes.":(data.message||"The RSVP could not be saved."));
   $("confirmationTitle").textContent=attendance==="yes"?"We’ll see you there!":"Thank you for letting us know.";
   $("confirmationText").textContent=attendance==="yes"?`Thank you, ${data.name||selected.name}. Your RSVP for ${seats} seat${seats===1?"":"s"} has been recorded. We can't wait to celebrate with you!`:`Thank you, ${data.name||selected.name}. We’re sorry you won’t be able to join us, but we truly appreciate your response.`;
   $("formStep").classList.add("hidden");$("confirmationStep").classList.remove("hidden");
 }catch(err){console.error(err);status($("formStatus"),err.message||"The RSVP could not be saved.","error");}
 finally{$("submitBtn").disabled=false;}
});

$("newRsvpBtn").addEventListener("click",()=>{
 selected=null;$("confirmationStep").classList.add("hidden");$("formStep").classList.add("hidden");$("searchStep").classList.remove("hidden");
 $("nameSearch").value="";$("results").innerHTML="";$("rsvpForm").reset();status($("searchStatus"),"");window.location.hash="rsvp";
});


// Compact justified gallery builder + lightbox
(() => {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  const items = [...grid.querySelectorAll('.gallery-item')];

  function columnsForWidth() {
    const w = grid.clientWidth || window.innerWidth;
    if (w >= 900) return 4;
    if (w >= 650) return 3;
    return 2;
  }

  function buildGallery() {
    const columns = columnsForWidth();
    const original = items.slice();
    const ratios = original.map(item => {
      const img = item.querySelector('img');
      return (img.naturalWidth || 4) / (img.naturalHeight || 3);
    });

    // Greedily distribute images into equal-count rows with balanced aspect-ratio totals.
    // This prevents rows containing several portrait images from becoming excessively tall.
    const rowCount = Math.ceil(original.length / columns);
    const rows = Array.from({length: rowCount}, () => []);
    const sums = Array(rowCount).fill(0);
    const counts = Array(rowCount).fill(0);
    const order = original.map((_,i)=>i).sort((a,b)=>ratios[b]-ratios[a]);

    for (const i of order) {
      let best = -1;
      let bestScore = Infinity;
      for (let r=0;r<rowCount;r++) {
        if (counts[r] >= columns) continue;
        // Favor low total ratio while also filling rows evenly.
        const score = sums[r] + counts[r]*0.08;
        if (score < bestScore) { bestScore=score; best=r; }
      }
      rows[best].push(i);
      sums[best] += ratios[i];
      counts[best]++;
    }

    // Preserve a stable visual sequence inside each row by image number.
    rows.forEach(row => row.sort((a,b)=>a-b));
    rows.sort((a,b)=>Math.min(...a)-Math.min(...b));

    grid.innerHTML='';
    const gap = columns >= 4 ? 8 : 7;
    const width = grid.clientWidth;
    rows.forEach((row, ri) => {
      const rowEl=document.createElement('div');
      rowEl.className='gallery-row';
      const totalRatio=row.reduce((sum,i)=>sum+ratios[i],0);
      const rowHeight=Math.max(110, (width - gap*(row.length-1))/totalRatio);
      rowEl.style.height=`${rowHeight}px`;
      row.forEach(i=>{
        const item=original[i];
        item.style.width=`${ratios[i]*rowHeight}px`;
        rowEl.appendChild(item);
      });
      grid.appendChild(rowEl);
    });
    grid.classList.add('is-ready');
  }

  Promise.all(items.map(item => {
    const img=item.querySelector('img');
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => { img.addEventListener('load',resolve,{once:true}); img.addEventListener('error',resolve,{once:true}); });
  })).then(buildGallery);

  let resizeTimer;
  window.addEventListener('resize',()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(buildGallery,180);
  });
})();

// Gallery lightbox
(() => {
  const triggers = [...document.querySelectorAll('.gallery-lightbox-trigger')];
  const lightbox = document.getElementById('galleryLightbox');
  const image = document.getElementById('galleryLightboxImage');
  const close = document.getElementById('galleryClose');
  const prev = document.getElementById('galleryPrev');
  const next = document.getElementById('galleryNext');
  const counter = document.getElementById('galleryCounter');
  if (!triggers.length || !lightbox) return;
  let current = 0;
  function show(index) {
    current=(index+triggers.length)%triggers.length;
    const trigger=triggers[current];
    image.src=trigger.dataset.full;
    image.alt=trigger.querySelector('img')?.alt||'Gallery photo';
    counter.textContent=`${current+1} / ${triggers.length}`;
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden','false');
    document.body.classList.add('gallery-open');
  }
  function hide(){lightbox.classList.remove('open');lightbox.setAttribute('aria-hidden','true');document.body.classList.remove('gallery-open');image.src='';}
  triggers.forEach((trigger,index)=>trigger.addEventListener('click',()=>show(index)));
  close.addEventListener('click',hide);
  prev.addEventListener('click',()=>show(current-1));
  next.addEventListener('click',()=>show(current+1));
  lightbox.addEventListener('click',e=>{if(e.target===lightbox)hide();});
  document.addEventListener('keydown',e=>{if(!lightbox.classList.contains('open'))return;if(e.key==='Escape')hide();if(e.key==='ArrowLeft')show(current-1);if(e.key==='ArrowRight')show(current+1);});
})();
