import { makeReader, write, connectWallet, activeAccount, balanceOf, short, toGen, GEN, fmtErr }
  from "./shared/genlayer-lite.js";
import { icon, setIcons } from "./shared/icons.js";

const CONTRACT = "0xa072Ad70Fa91BBF9f89ac87707e960139FAB8973";
const { read } = makeReader(CONTRACT);
const OFFERED = 0, ACTIVE = 1, PAID = 2, EXPIRED = 3;
const STATUS = ["OFFERED", "ACTIVE", "PAID", "EXPIRED"], STLABEL = ["Available", "In force", "Paid out", "Expired"];
let account = null, policies = [];
const $ = (id) => document.getElementById(id);
const esc = (s) => (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const weiOf = (v) => { try { return BigInt(v || "0"); } catch (_) { return 0n; } };
const DISPLAY_DUST_WEI = 10n ** 15n; // below 0.001 GEN reads as a protocol proof, not a payout.
const isDisplayZero = (v) => weiOf(v) < DISPLAY_DUST_WEI;
const isProofPolicy = (p) => isDisplayZero(p.coverage) && isDisplayZero(p.premium);
const statusBadge = (p, st) => {
  if (isProofPolicy(p)) return ["b-proof", st === EXPIRED ? "Archived proof" : "Verified proof"];
  return st === OFFERED ? ["b-off", "Available"] : st === ACTIVE ? ["b-act", "In force"] : st === PAID ? ["b-paid", "Paid out"] : ["b-exp", "Expired"];
};
const metricValue = (value, fallback) => isDisplayZero(value) ? fallback : `${toGen(value)} GEN`;

$("contractFoot").innerHTML = `Contract ${short(CONTRACT)}`;
setIcons();

// Vanta FOG hero (real library)
if (window.VANTA) {
  VANTA.FOG({ el: "#vanta", highlightColor: 0x10b981, midtoneColor: 0x3aa0c9, lowlightColor: 0x0c3b4a,
    baseColor: 0xeef2f0, blurFactor: 0.62, speed: 1.4, zoom: 0.8, mouseControls: true, touchControls: true });
}

function toast(msg, kind = "", title = "aegis") {
  const el = document.createElement("div"); el.className = "toast " + kind;
  el.innerHTML = `<span class="tt">${title}</span>`; el.appendChild(document.createTextNode(msg));
  $("log").appendChild(el); setTimeout(() => el.remove(), kind === "err" ? 16000 : 5200);
}

async function refreshWallet() {
  account = await activeAccount();
  const slot = $("walletslot");
  if (account) { let bal = 0n; try { bal = await balanceOf(account); } catch (_) {} slot.innerHTML = `<span class="mono" style="font-size:12px;color:var(--ink2)">${short(account)} · ${toGen(bal)} GEN</span>`; }
  else { slot.innerHTML = `<button class="btn sm" id="connectBtn">Connect<span class="ic">${icon("arrowRight")}</span></button>`; $("connectBtn").onclick = doConnect; }
}
async function doConnect() { try { account = await connectWallet(); toast("Wallet connected on studionet.", "ok", "wallet"); await refreshWallet(); } catch (e) { toast(fmtErr(e), "err", "wallet"); } }
async function ensureWallet() { if (!account) account = await connectWallet(); await refreshWallet(); }

async function load() {
  try {
    const count = Number(await read("get_policy_count"));
    const out = [];
    for (let i = 0; i < count; i++) out.push({ id: i, ...(await read("get_policy", [i])) });
    policies = out; render();
    $("statCount").textContent = count;
    $("statCov").textContent = toGen(out.reduce((a, p) => a + BigInt(p.coverage), 0n).toString());
  } catch (e) { $("grid").innerHTML = `<div class="empty">Could not open the book. ${fmtErr(e)}</div>`; }
}

function render() {
  const g = $("grid");
  if (!policies.length) { g.innerHTML = `<div class="empty">No policies yet. Underwrite the first one.</div>`; return; }
  g.innerHTML = "";
  [...policies].reverse().forEach((p) => {
    const st = Number(p.status);
    const proof = isProofPolicy(p);
    const badge = statusBadge(p, st);
    const el = document.createElement("div"); el.className = `policy${proof ? " proof-policy" : ""}`;
    el.innerHTML = `<div class="core">
      <div class="policy-top">
        <span class="policy-kind">${proof ? "Protocol proof" : "Parametric cover"}</span>
        <span class="badge ${badge[0]}">${badge[1]}</span>
      </div>
      <h3 class="disp">${esc(p.title) || "Untitled cover"}</h3>
      <div class="trig">${esc(p.trigger)}</div>
      <div class="nums">
        <div class="num"><div class="l">${proof ? "Scope" : "Coverage"}</div><div class="v cov">${metricValue(p.coverage, "Verified")}</div></div>
        <div class="num"><div class="l">${proof ? "Settlement" : "Premium"}</div><div class="v">${metricValue(p.premium, "Audit only")}</div></div>
        <div class="num"><div class="l">Policy</div><div class="v">#${p.id}</div></div>
      </div></div>`;
    el.onclick = () => openDetail(p.id);
    g.appendChild(el);
  });
  // vanilla-tilt on the cards (real library)
  if (window.VanillaTilt) VanillaTilt.init(g.querySelectorAll(".policy"), { max: 7, speed: 500, glare: true, "max-glare": 0.18, scale: 1.02 });
}

function openDrawer() { $("scrim").classList.add("on"); $("drawer").classList.add("on"); }
function closeDrawer() { $("scrim").classList.remove("on"); $("drawer").classList.remove("on"); }

function openUnderwrite() {
  $("drawerTitle").textContent = "Underwrite a policy";
  $("drawerBody").innerHTML = `
    <p style="color:var(--ink2);font-size:14.5px">Lock the coverage, name the data source, and set the premium.</p>
    <div class="fieldset"><span class="leg">The Risk</span>
      <label>Policy title</label><input id="title" maxlength="80" placeholder="Flight AB123 cancellation cover" />
      <label>Trigger condition</label><textarea id="trigger" placeholder="Pays if the status page reads CANCELLED."></textarea>
      <label>Public data source URL</label><input id="url" placeholder="https://example.com/flight/AB123/status" />
      <div class="hint">The contract reads this exact page when a claim is filed.</div></div>
    <div class="fieldset"><span class="leg">The Economics</span>
      <div class="two"><div><label>Coverage you lock (GEN)</label><input id="coverage" type="number" min="0" step="0.1" value="5" /></div>
        <div><label>Premium holder pays (GEN)</label><input id="premium" type="number" min="0" step="0.1" value="0.5" /></div></div>
      <div class="live-ratio"><span>Holder leverage</span><span><b id="liveLev">10.0×</b> · break-even <span id="liveBe">9%</span></span></div></div>
    <button class="btn mint block" id="createBtn">Lock coverage & list <span class="ic">${icon("shield")}</span></button>`;
  $("createBtn").onclick = doCreate;
  const upd = () => { const c = parseFloat($("coverage").value) || 0, pr = parseFloat($("premium").value) || 0; $("liveLev").textContent = pr > 0 ? (c / pr).toFixed(1) + "×" : "-"; $("liveBe").textContent = (c + pr) > 0 ? Math.round(pr / (c + pr) * 100) + "%" : "-"; };
  $("coverage").oninput = upd; $("premium").oninput = upd;
  openDrawer();
}

function openDetail(id) {
  const p = policies.find((x) => x.id === id); if (!p) return;
  const st = Number(p.status);
  const proof = isProofPolicy(p);
  $("drawerTitle").textContent = (p.title || "Policy") + " - #" + id;
  const cov = Number(weiOf(p.coverage)) / 1e18, prem = Number(weiOf(p.premium)) / 1e18;
  const lev = prem > 0 ? (cov / prem) : 0, premPct = (cov + prem) > 0 ? Math.max(4, prem / (cov + prem) * 100) : 50;
  let assess = "";
  if (st === PAID) assess = `<div class="assess yes"><b style="color:#1f7a3d">${proof ? "Proof verified." : "Claim paid."}</b> ${p.assessment ? "Validators: " + esc(p.assessment) : proof ? "Validators confirmed the source condition and stored the result on-chain." : "Trigger met; coverage released to holder."}</div>`;
  if (st === EXPIRED) assess = `<div class="assess no"><b>Claim assessed - trigger not met.</b> ${p.assessment ? "Validators: " + esc(p.assessment) : "Coverage returned to the underwriter."}</div>`;
  let action = "";
  if (st === OFFERED) action = `<button class="btn mint block" id="buyBtn">Buy cover - pay ${toGen(p.premium)} GEN <span class="ic">${icon("coins")}</span></button>`;
  else if (st === ACTIVE) action = `<button class="btn block" id="claimBtn">File a claim - assess from data <span class="ic">${icon("spark")}</span></button><div class="hint" style="text-align:center;margin-top:8px">Reads the source; validators must agree. Calls a real LLM.</div>`;
  $("drawerBody").innerHTML = `
    <div class="detail-ratio${proof ? " proof-detail" : ""}">
      <div class="rr"><div class="big disp">${proof ? "Verified" : toGen(p.coverage)} <small>${proof ? "protocol proof" : "GEN coverage"}</small></div><div class="lev"><div class="x">${proof ? "audit" : lev ? lev.toFixed(1) + "x" : "-"}</div><div class="lab">${proof ? "settlement mode" : "holder leverage"}</div></div></div>
      <div class="barwrap"><div class="prem" style="width:${premPct}%"></div><div class="cov"></div></div>
      <div class="barlegend"><span>${proof ? "no premium charged" : "premium " + toGen(p.premium) + " GEN"}</span><span>${proof ? "no token payout" : "payout " + toGen(p.coverage) + " GEN"}</span></div>
    </div>
    ${assess}
    <div class="kv"><span class="k">Trigger</span><span class="v">${esc(p.trigger)}</span></div>
    <div class="kv"><span class="k">Data source</span><span class="v"><a href="${esc(p.data_url)}" target="_blank" rel="noopener">${esc(p.data_url)}</a></span></div>
    <div class="kv"><span class="k">Underwriter</span><span class="v mono">${short(p.underwriter)}</span></div>
    ${st >= ACTIVE ? `<div class="kv"><span class="k">Holder</span><span class="v mono">${short(p.holder)}</span></div>` : ""}
    <div style="margin-top:18px">${action}</div>`;
  openDrawer();
  if (st === OFFERED) $("buyBtn").onclick = () => doBuy(id, p.premium);
  if (st === ACTIVE) $("claimBtn").onclick = () => doClaim(id);
}

async function doCreate() {
  const title = $("title").value.trim(), trigger = $("trigger").value.trim(), url = $("url").value.trim();
  const coverage = parseFloat($("coverage").value), premium = parseFloat($("premium").value);
  if (!trigger) return toast("Define the trigger condition.", "err", "underwrite");
  if (!url) return toast("A public data source URL is required.", "err", "underwrite");
  if (!(coverage > 0)) return toast("Coverage must be above zero.", "err", "underwrite");
  if (!(premium >= 0)) return toast("Premium must be zero or more.", "err", "underwrite");
  const btn = $("createBtn"); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> listing';
  try { await ensureWallet(); await write(CONTRACT, "offer_policy", [title, trigger, url, GEN(premium).toString()], GEN(coverage)); toast(`Policy listed with ${coverage} GEN coverage.`, "ok", "on-chain"); closeDrawer(); await load(); }
  catch (e) { toast(fmtErr(e), "err", "failed"); btn.disabled = false; btn.textContent = "Lock coverage & list"; }
}
async function doBuy(id, premiumWei) {
  const btn = $("buyBtn"); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> activating';
  try { await ensureWallet(); await write(CONTRACT, "buy_policy", [id], BigInt(premiumWei)); toast("Cover is in force.", "ok", "on-chain"); closeDrawer(); await load(); }
  catch (e) { toast(fmtErr(e), "err", "failed"); if (btn) { btn.disabled = false; btn.textContent = "Buy cover"; } }
}
async function doClaim(id) {
  if (!confirm("File a claim now? The contract reads the data source and validators must agree whether the trigger was met. Calls a real LLM.")) return;
  const btn = $("claimBtn"); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> assessing from live data';
  try { await ensureWallet(); toast("Reading the data source and reaching consensus…", "", "claim"); await write(CONTRACT, "file_claim", [id]); toast("Claim assessed on-chain.", "ok", "settled"); closeDrawer(); await load(); }
  catch (e) { toast(fmtErr(e), "err", "failed"); if (btn) { btn.disabled = false; btn.textContent = "File a claim"; } }
}

// Scroll reveals via IntersectionObserver (safe, never stuck at opacity:0)
const _io = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add("in"); _io.unobserve(e.target); }
}), { threshold: 0.08 });
document.querySelectorAll(".reveal").forEach((el) => _io.observe(el));

$("underwriteBtn").onclick = openUnderwrite;
$("refreshBtn").onclick = load;
$("closeDrawer").onclick = closeDrawer;
$("scrim").onclick = closeDrawer;
if (window.ethereum) window.ethereum.on?.("accountsChanged", refreshWallet);

// Accordion toggle
document.querySelectorAll(".acc-head").forEach((btn) => {
  btn.onclick = () => {
    const item = btn.parentElement;
    const wasOpen = item.classList.contains("open");
    document.querySelectorAll(".acc-item").forEach((i) => i.classList.remove("open"));
    if (!wasOpen) item.classList.add("open");
  };
});

refreshWallet();
load();
