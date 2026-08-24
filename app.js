// PSX: OG Values — data + rendering
// Everything here runs client-side. Admin edits are saved to localStorage
// so they only apply in the browser that made them — see README for notes
// on wiring this up to a real backend if you want a shared/public admin.

const seedPets = [
  {id:1,name:"R", category:"Huges", variant:"Normal", value:125000000, demand:9, release:"2023-02-17", emoji:"🐱", change:12},
  {id:2,name:"HugDog", category:"Huges", variant:"Normal", value:98000000, demand:8, release:"2023-02-17", emoji:"🐶", change:-7},
  {id:3,name:"Hugragon", category:"Huges", variant:"Golden", value:225000000, demand:10, release:"2023-04-14", emoji:"🐲", change:8},
  {id:4,name:"Huge Lwdwaucky Cat", category:"Huges", variant:"Rainbow", value:410000000, demand:10, release:"2023-03-03", emoji:"😺", change:4},
  {id:5,name:"Huge Hell Rock", category:"Huges", variant:"Normal", value:55000000, demand:7, release:"2023-02-03", emoji:"🪨", change:-2},
  {id:6,name:"Huge Unicorn", category:"Huges", variant:"Rainbow", value:350000000, demand:9, release:"2023-06-09", emoji:"🦄", change:6},
  {id:7,name:"Exclusisdawve Red Panda", category:"Exclusives", variant:"Normal", value:1200000, demand:7, release:"2023-05-12", emoji:"🐼", change:3},
  {id:8,name:"Exclusive Axolotl", category:"Exclusives", variant:"Golden", value:2800000, demand:8, release:"2023-07-21", emoji:"🦎", change:5},
  {id:9,name:"Exclusive Dragon", category:"Exclusives", variant:"Rainbow", value:4200000, demand:8, release:"2023-08-04", emoji:"🐉", change:-4},
  {id:10,name:"Glitcsdawdshed Cat", category:"Other", variant:"Glitched", value:7600000, demand:6, release:"2023-09-15", emoji:"👾", change:11},
  {id:11,name:"Stat Pet X", category:"Other", variant:"Normal", value:3200000, demand:5, release:"2023-10-06", emoji:"⚡", change:0},
  {id:12,name:"Mystisdawdc Egg", category:"Other", variant:"Normal", value:850000, demand:4, release:"2023-11-03", emoji:"🥚", change:-1},
  {id:13,name:"Huge Bsdwdalloon Cat", category:"Huges", variant:"Dark Matter", value:295000000, demand:9, release:"2024-01-19", emoji:"🎈", change:9},
  {id:14,name:"Huge Cupsdawcake", category:"Huges", variant:"Normal", value:87000000, demand:7, release:"2024-02-16", emoji:"🧁", change:-5},
  {id:15,name:"Exclusiveasdw Kitsune", category:"Exclusives", variant:"Normal", value:6300000, demand:9, release:"2024-03-15", emoji:"🦊", change:7},
  {id:16,name:"Phantowdm Pet", category:"Other", variant:"Glitched", value:9100000, demand:6, release:"2024-04-12", emoji:"👻", change:2}
];

// Change log entries. No "note" field on purpose — the numbers speak for
// themselves, people don't need us telling them demand "strengthened".
const defaultChanges = [
  {pet:"Huge Cat", old:111000000, current:125000000, percent:12, demand:9, date:"2026-08-22"},
  {pet:"Huge Dog", old:105000000, current:98000000, percent:-7, demand:8, date:"2026-08-19"},
  {pet:"Huge Dragon", old:208000000, current:225000000, percent:8, demand:10, date:"2026-08-15"},
  {pet:"Huge Balloon Cat", old:271000000, current:295000000, percent:9, demand:9, date:"2026-08-10"},
  {pet:"Exclusive Kitsune", old:5890000, current:6300000, percent:7, demand:9, date:"2026-08-05"}
];

// Categories that count as "Exclusives" for the home page stat. Titanics
// aren't in the game yet but the stat is ready for them once they land.
const EXCLUSIVE_TIERS = ["Huges", "Exclusives", "Titanics"];

// 1. Change these lines to only read your typed data arrays
let pets = seedPets;
let changes = defaultChanges;
let currentRoute = location.hash.replace("#","") || "home";
let currentPage = 1;
const perPage = 12;
let calcOffers = { yours: [], theirs: [] };

const $ = (s) => document.querySelector(s);
const fmt = (n) => {
  if (n >= 1e12) return (n/1e12).toFixed(2).replace(/\.00$/,"") + "T";
  if (n >= 1e9) return (n/1e9).toFixed(2).replace(/\.00$/,"") + "B";
  if (n >= 1e6) return (n/1e6).toFixed(2).replace(/\.00$/,"") + "M";
  if (n >= 1e3) return (n/1e3).toFixed(2).replace(/\.00$/,"") + "K";
  return n.toLocaleString();
};
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

function formatDate(d) {
  const dt = new Date(d);
  if (isNaN(dt)) return d || "—";
  return dt.toLocaleDateString("en-US", {month:"short", day:"numeric", year:"numeric"});
}

function lastUpdatedLabel() {
  const dates = changes.map(c => new Date(c.date)).filter(d => !isNaN(d));
  if (!dates.length) return "—";
  return formatDate(new Date(Math.max(...dates)));
}

// 2. Change this function so it only updates the footer text
function save() {
  $("#footerUpdated").textContent = "Last updated " + lastUpdatedLabel();
}
save();

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg; el.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => el.classList.remove("show"), 2300);
}

// Pet images live in assets/pets/<slug>.png. If one's missing (or you
// haven't added images yet) it just falls back to a paw icon — the emoji
// per pet is shown next to the name instead, so nothing's lost either way.
function petImageMarkup(p) {
  const src = p.image || `assets/pets/${slugify(p.name)}.png`;
  return `<div class="pet-image">
    <img src="${src}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
    <div class="pet-image-fallback">🐾</div>
  </div>`;
}

function demandBadge(d) {
  if (d >= 9) return {text:"🔥 High demand", cls:""};
  if (d >= 7) return {text:"📈 Rising", cls:""};
  if (d <= 3) return {text:"💤 Slow", cls:"slow"};
  return null;
}

function petCard(p) {
  const badge = demandBadge(p.demand);
  return `<article class="pet-card" data-id="${p.id}" onclick="showPet(${p.id})">
    ${petImageMarkup(p)}
    <div class="pet-name">${p.emoji ? p.emoji + " " : ""}${esc(p.name)}</div>
    <div class="pet-type">${esc(p.category)} · ${esc(p.variant)}</div>
    <div class="pet-tags">
      <span class="tag">Demand ${p.demand}/10</span>
      ${badge ? `<span class="tag tag-badge ${badge.cls}">${badge.text}</span>` : ""}
    </div>
    <div class="pet-row"><span class="value">${fmt(p.value)}</span><span class="${p.change >= 0 ? "up":"down"}">${p.change > 0 ? "+" : ""}${p.change}%</span></div>
  </article>`;
}

function renderHome() {
  const top = [...pets].sort((a,b)=>b.value-a.value).slice(0,5);
  const recent = [...changes].slice(0,5);
  const exclusiveCount = pets.filter(p => EXCLUSIVE_TIERS.includes(p.category)).length;
  $("#app").innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow">Pet Simulator X</div>
        <h1>See what pets<br><span style="color:var(--accent)">are worth right now.</span></h1>
        <p>A simple value list for Pet Simulator X. Look up a pet, see what's changed lately, and run the calculator before you commit to a trade.</p>
        <div class="hero-actions">
          <a class="btn primary" href="#values">Browse Values →</a>
          <a class="btn ghost" href="#calculator">Open Calculator</a>
        </div>
      </div>
      <div class="hero-stats">
        <div class="stat"><b>${pets.length}</b><span>Total Pets Added</span></div>
        <div class="stat"><b>${exclusiveCount}</b><span>Exclusives</span></div>
        <div class="stat stat-date"><b>${lastUpdatedLabel()}</b><span>Last Updated</span></div>
      </div>
    </section>

    <div class="section-head">
      <div><h2>Latest changes</h2><p>What's moved recently.</p></div>
    </div>
    <section class="changes-grid">${recent.map(c => `
      <div class="change-card">
        <div class="change-top"><span class="change-name">${esc(c.pet)}</span><span class="${c.percent >= 0 ? "up":"down"}">${c.percent >= 0 ? "+" : ""}${c.percent}%</span></div>
        <div class="change-value"><span class="change-old">${fmt(c.old)} →</span><span class="change-new">${fmt(c.current)}</span></div>
        <div class="change-meta"><span>Demand ${c.demand}/10</span><span>${formatDate(c.date)}</span></div>
      </div>`).join("")}</section>

    <div class="section-head">
      <div><h2>Highest values</h2><p>Top pets in the database right now.</p></div>
      <a class="btn" href="#values">See database</a>
    </div>
    <section class="pet-grid">${top.map(petCard).join("")}</section>
  `;
}

function renderValues() {
  $("#app").innerHTML = `
    <div class="page-title"><h1>Values</h1><p>Search the database, filter by category and compare variants.</p></div>
    <div class="toolbar">
      <input id="search" class="field" placeholder="Search pets..." autocomplete="off">
      <select id="sort" class="field">
        <option value="default">Default sort</option>
        <option value="high">Value: High to Low</option>
        <option value="low">Value: Low to High</option>
        <option value="az">Name: A to Z</option>
        <option value="demand">Demand: High to Low</option>
        <option value="release">Release Date: New to Old</option>
      </select>
      <select id="variant" class="field">
        <option>All Variants</option><option>Normal</option><option>Golden</option>
        <option>Rainbow</option><option>Dark Matter</option><option>Glitched</option>
      </select>
      <select id="category" class="field">
        <option>All</option><option>Huges</option><option>Exclusives</option><option>Titanics</option><option>Other</option>
      </select>
    </div>
    <div class="filters-row" id="chips">
      <button class="chip active" data-cat="All">All</button>
      <button class="chip" data-cat="Huges">Huges</button>
      <button class="chip" data-cat="Exclusives">Exclusives</button>
      <button class="chip" data-cat="Titanics">Titanics</button>
      <button class="chip" data-cat="Other">Other</button>
    </div>
    <div class="results-meta" id="resultsMeta"></div>
    <section class="pet-grid" id="petGrid"></section>
    <div class="pagination" id="pagination"></div>
  `;
  $("#search").addEventListener("input", ()=>{currentPage=1; updateValues();});
  $("#sort").addEventListener("change", ()=>{currentPage=1; updateValues();});
  $("#variant").addEventListener("change", ()=>{currentPage=1; updateValues();});
  $("#category").addEventListener("change", ()=>{currentPage=1; updateValues();});
  document.querySelectorAll("#chips .chip").forEach(btn => btn.addEventListener("click", ()=>{
    $("#category").value = btn.dataset.cat; currentPage=1;
    document.querySelectorAll("#chips .chip").forEach(x=>x.classList.remove("active")); btn.classList.add("active");
    updateValues();
  }));
  updateValues();
}

function updateValues() {
  const q = $("#search").value.trim().toLowerCase();
  const cat = $("#category").value;
  const variant = $("#variant").value;
  let list = pets.filter(p =>
    (!q || p.name.toLowerCase().includes(q)) &&
    (cat === "All" || p.category === cat) &&
    (variant === "All Variants" || p.variant === variant)
  );
  const sort = $("#sort").value;
  if(sort==="high") list.sort((a,b)=>b.value-a.value);
  if(sort==="low") list.sort((a,b)=>a.value-b.value);
  if(sort==="az") list.sort((a,b)=>a.name.localeCompare(b.name));
  if(sort==="demand") list.sort((a,b)=>b.demand-a.demand || b.value-a.value);
  if(sort==="release") list.sort((a,b)=>new Date(b.release)-new Date(a.release));
  const totalPages = Math.max(1, Math.ceil(list.length/perPage));
  currentPage = Math.min(currentPage,totalPages);
  const pageItems = list.slice((currentPage-1)*perPage,currentPage*perPage);
  $("#resultsMeta").textContent = `${list.length} result${list.length===1?"":"s"} · page ${currentPage} of ${totalPages}`;
  $("#petGrid").innerHTML = pageItems.length ? pageItems.map(petCard).join("") : `<div class="panel empty">No pets matched your search.</div>`;
  $("#pagination").innerHTML = Array.from({length:totalPages},(_,i)=>`<button class="btn ${i+1===currentPage?"primary":""}" onclick="goPage(${i+1})">${i+1}</button>`).join("");
}
function goPage(n){currentPage=n;updateValues();window.scrollTo({top:0,behavior:"smooth"});}

function showPet(id) {
  const p = pets.find(x=>x.id===id); if(!p) return;
  const badge = demandBadge(p.demand);
  const backdrop=document.createElement("div");
  backdrop.className="modal-backdrop";
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });
  backdrop.innerHTML=`<div class="modal">
    <div class="modal-head"><div><h2>${p.emoji ? p.emoji + " " : ""}${esc(p.name)}</h2><p>${esc(p.category)} · ${esc(p.variant)}</p></div><button class="btn" onclick="this.closest('.modal-backdrop').remove()">✕</button></div>
    ${petImageMarkup(p)}
    <div class="pet-tags" style="margin-top:12px">
      <span class="tag">Demand ${p.demand}/10</span>
      ${badge ? `<span class="tag tag-badge ${badge.cls}">${badge.text}</span>` : ""}
    </div>
    <div class="admin-grid" style="margin-top:14px">
      <div class="stat"><b>${fmt(p.value)}</b><span>Current value</span></div>
      <div class="stat"><b>${p.change>=0?"+":""}${p.change}%</b><span>Recent change</span></div>
    </div>
    <p>Added: <strong>${formatDate(p.release)}</strong></p>
    <div class="modal-actions"><button class="btn primary" onclick="addToCalc(${p.id},'yours');this.closest('.modal-backdrop').remove()">Add to my offer</button><button class="btn" onclick="this.closest('.modal-backdrop').remove()">Close</button></div>
  </div>`;
  document.body.appendChild(backdrop);
}

function renderCalculator() {
  $("#app").innerHTML=`
    <div class="page-title"><h1>Calculator</h1><p>Build both offers and compare their total values and demand.</p></div>
    <div class="calc-layout">
      <section class="panel">
        <div class="offer-title"><h2>Your offer</h2><strong id="yourTotal">0</strong></div>
        <div class="offer-list" id="yoursList"></div>
        <div class="add-row"><select id="yourPet" class="field">${pets.map(p=>`<option value="${p.id}">${esc(p.name)} · ${fmt(p.value)}</option>`).join("")}</select><button class="btn primary" onclick="addSelected('yours')">Add</button></div>
      </section>
      <section class="panel">
        <div class="offer-title"><h2>Their offer</h2><strong id="theirTotal">0</strong></div>
        <div class="offer-list" id="theirsList"></div>
        <div class="add-row"><select id="theirPet" class="field">${pets.map(p=>`<option value="${p.id}">${esc(p.name)} · ${fmt(p.value)}</option>`).join("")}</select><button class="btn primary" onclick="addSelected('theirs')">Add</button></div>
      </section>
      <aside class="calc-side">
        <div class="eyebrow">Trade evaluation</div>
        <div id="calcResult" class="calc-result"><strong>ADD PETS</strong><p style="margin:5px 0 0;color:var(--muted)">Add items to both sides to evaluate the trade.</p></div>
        <div><span style="color:var(--muted);font-size:12px">Value difference</span><div class="calc-total" id="diff">0</div></div>
        <p class="admin-note">This just compares the values in this database. Demand and how badly someone wants a pet can still change what a "fair" trade looks like in practice.</p>
        <button class="btn danger" onclick="clearCalc()">Clear calculator</button>
      </aside>
    </div>`;
  renderOffers();
}

function addSelected(side) {
  const id=Number(document.getElementById(side==="yours"?"yourPet":"theirPet").value);
  addToCalc(id,side);
}
function addToCalc(id,side){ const p=pets.find(x=>x.id===id); if(p){calcOffers[side].push({...p}); renderOffers(); toast(`${p.name} added to ${side==="yours"?"your":"their"} offer.`);} }
function removeCalc(side,index){calcOffers[side].splice(index,1);renderOffers();}
function clearCalc(){calcOffers={yours:[],theirs:[]};renderOffers();toast("Calculator cleared.");}
function total(side){return calcOffers[side].reduce((s,p)=>s+p.value,0);}

function calcCard(p, side, i) {
  return `<div class="pet-card calc-card">
    <button class="offer-remove" onclick="removeCalc('${side}',${i})" aria-label="Remove ${esc(p.name)}">×</button>
    ${petImageMarkup(p)}
    <div class="pet-name">${p.emoji ? p.emoji + " " : ""}${esc(p.name)}</div>
    <div class="pet-type">${esc(p.variant)}</div>
    <div class="pet-row"><span class="value">${fmt(p.value)}</span></div>
  </div>`;
}

function renderOffers(){
  ["yours","theirs"].forEach(side=>{
    const list=$(side==="yours"?"#yoursList":"#theirsList");
    list.innerHTML=calcOffers[side].length ? calcOffers[side].map((p,i)=>calcCard(p,side,i)).join("") : `<div class="empty">No pets added yet.</div>`;
  });
  const a=total("yours"),b=total("theirs"),d=a-b;
  $("#yourTotal").textContent=fmt(a);$("#theirTotal").textContent=fmt(b);$("#diff").textContent=(d>0?"+":"")+fmt(Math.abs(d));
  const result=$("#calcResult");
  if(!a&&!b){result.className="calc-result";result.innerHTML="<strong>ADD PETS</strong><p style='margin:5px 0 0;color:var(--muted)'>Add items to both sides to evaluate the trade.</p>";return;}
  const pct = Math.max(a,b) ? Math.round(Math.abs(d)/Math.max(a,b)*100) : 0;
  let title = pct <= 5 ? "FAIR" : d > 0 ? "YOU WIN" : "THEY WIN";
  result.className="calc-result"+(d<0&&pct>5?" loss":"");
  result.innerHTML=`<strong>${title}</strong><p style="margin:5px 0 0;color:var(--muted)">${pct}% value difference · ${d>=0?"You":"They"} have the higher total.</p>`;
}

function renderAdmin(){
  $("#app").innerHTML=`
    <div class="page-title"><h1>Admin</h1><p>Add pets, update values, and manage images here. Saves to this browser only — see README for hooking this up to a real backend.</p></div>
    <div class="admin-grid">
      <section class="panel">
        <div class="eyebrow">Add a pet</div>
        <h2>New entry</h2>
        <div class="form-grid">
          <input id="newName" class="field" placeholder="Pet name">
          <select id="newCategory" class="field">
            <option>Huges</option><option>Exclusives</option><option>Titanics</option><option>Other</option>
          </select>
          <input id="newVariant" class="field" placeholder="Variant (Normal, Golden...)">
          <input id="newValue" class="field" type="number" placeholder="Value">
          <input id="newDemand" class="field" type="number" min="1" max="10" placeholder="Demand (1-10)">
          <input id="newRelease" class="field" type="date">
          <input id="newEmoji" class="field" placeholder="Emoji (optional)">
          <input id="newImage" class="field" type="file" accept="image/*">
        </div>
        <button class="btn primary" style="margin-top:10px" onclick="addPet()">Add pet</button>
      </section>
      <section class="panel">
        <div class="eyebrow">Demo controls</div>
        <h2>Data</h2>
        <p class="admin-note">Everything here is stored in this browser's local storage, so edits don't show up for other visitors yet. Export the JSON once your list looks right and plug it into a real backend if you want a shared, public admin panel.</p>
        <div class="admin-actions">
          <button class="btn" onclick="exportData()">Export JSON</button>
          <button class="btn" onclick="resetData()">Reset demo data</button>
        </div>
      </section>
    </div>

    <div class="section-head"><div><h2>All pets</h2><p>${pets.length} in the database</p></div></div>
    <section class="panel">
      <table class="admin-table"><thead><tr><th>Pet</th><th>Category</th><th>Value</th><th>Demand</th><th></th></tr></thead><tbody>
      ${pets.map(p=>`<tr>
        <td>${p.emoji ? p.emoji + " " : ""}${esc(p.name)}</td>
        <td>${esc(p.category)}</td>
        <td><input class="field admin-inline" data-field="value" data-id="${p.id}" type="number" value="${p.value}"></td>
        <td><input class="field admin-inline" data-field="demand" data-id="${p.id}" type="number" min="1" max="10" value="${p.demand}"></td>
        <td><button class="btn" onclick="deletePet(${p.id})">Delete</button></td>
      </tr>`).join("")}
      </tbody></table>
    </section>`;
  document.querySelectorAll(".admin-inline").forEach(inp => {
    inp.addEventListener("change", () => {
      const p = pets.find(x => x.id === Number(inp.dataset.id)); if (!p) return;
      const v = Number(inp.value);
      if (inp.dataset.field === "value" && v > 0) p.value = v;
      if (inp.dataset.field === "demand" && v >= 1 && v <= 10) p.demand = v;
      save(); toast("Saved.");
    });
  });
}

function addPet() {
  const name = $("#newName").value.trim();
  if (!name) { toast("Give the pet a name first."); return; }
  const value = Number($("#newValue").value) || 0;
  const demand = Math.min(10, Math.max(1, Number($("#newDemand").value) || 5));
  const category = $("#newCategory").value;
  const variant = $("#newVariant").value.trim() || "Normal";
  const release = $("#newRelease").value || new Date().toISOString().slice(0,10);
  const emoji = $("#newEmoji").value.trim();
  const id = pets.length ? Math.max(...pets.map(p => p.id)) + 1 : 1;

  const finish = (image) => {
    pets.push({id, name, category, variant, value, demand, release, emoji, change:0, image: image || null});
    save(); toast(`${name} added.`); renderAdmin();
  };

  const file = $("#newImage").files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => finish(reader.result);
    reader.readAsDataURL(file);
  } else {
    finish(null);
  }
}
function deletePet(id) {
  if (!confirm("Remove this pet?")) return;
  pets = pets.filter(p => p.id !== id);
  save(); toast("Pet removed."); renderAdmin();
}
function exportData(){
  const blob=new Blob([JSON.stringify({pets,changes},null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="psx-og-values-data.json";a.click();URL.revokeObjectURL(a.href);
}
function resetData(){
  if(!confirm("Reset this browser to the starter dataset?"))return;
  pets=seedPets.map(x=>({...x}));changes=defaultChanges.map(x=>({...x}));save();toast("Demo data reset.");renderAdmin();
}

function route(){
  currentRoute=location.hash.replace("#","")||"home";
  document.querySelectorAll(".nav a").forEach(a=>a.classList.toggle("active",a.dataset.route===currentRoute));
  if(currentRoute==="values")renderValues();
  else if(currentRoute==="calculator")renderCalculator();
  else if(currentRoute==="admin")renderAdmin();
  else renderHome();
  $(".nav")?.classList.remove("open");
  window.scrollTo(0,0);
}
window.addEventListener("hashchange",route);
$("#mobileMenu").addEventListener("click",()=>$(".nav").classList.toggle("open"));
route();
