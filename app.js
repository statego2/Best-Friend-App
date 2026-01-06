const KEY = "best_friends_v2";

let friends = load();
let editingId = null;
let activeGroup = "core";
let currentModal = null;

// ---------- elements ----------
const nameEl = document.getElementById("name");
const jobEl = document.getElementById("job");
const sourceEl = document.getElementById("source");

const bMonthEl = document.getElementById("bMonth");
const bDayEl = document.getElementById("bDay");
const nMonthEl = document.getElementById("nMonth");
const nDayEl = document.getElementById("nDay");

const lastMetEl = document.getElementById("lastMet");
const lastTalkedEl = document.getElementById("lastTalked");

const formTitle = document.getElementById("formTitle");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const formCloseX = document.getElementById("formCloseX");

const listCoreEl = document.getElementById("listCore");
const listCasualEl = document.getElementById("listCasual");

const openFormBtn = document.getElementById("openFormBtn");
const overlay = document.getElementById("overlay");

const formCard = document.getElementById("formCard");

const briefBtn = document.getElementById("briefBtn");
const briefCard = document.getElementById("briefCard");
const briefBody = document.getElementById("briefBody");
const briefCloseX = document.getElementById("briefCloseX");
const briefCloseBtn = document.getElementById("briefCloseBtn");

const backupBtn = document.getElementById("backupBtn");
const backupCard = document.getElementById("backupCard");
const backupCloseX = document.getElementById("backupCloseX");
const backupCloseBtn = document.getElementById("backupCloseBtn");
const exportBtn = document.getElementById("exportBtn");
const importFile = document.getElementById("importFile");

const segBtns = Array.from(document.querySelectorAll(".seg-btn"));

// ---------- init ----------
seedSelects();
migrateDataIfNeeded();
normalizeGroupsOnce();
render();

// defaults
lastMetEl.value = todayISO();
lastTalkedEl.value = ""; // default EMPTY
closeAnyModal();

// ---------- modal ----------
function openModal(el) {
  currentModal = el;
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  el.classList.add("show");
  el.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeAnyModal() {
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
  [formCard, briefCard, backupCard].forEach((m) => {
    m.classList.remove("show");
    m.setAttribute("aria-hidden", "true");
  });
  document.body.classList.remove("modal-open");
  currentModal = null;
}

overlay.addEventListener("click", () => {
  closeAnyModal();
  resetForm();
});

cancelBtn.addEventListener("click", () => {
  closeAnyModal();
  resetForm();
});
formCloseX.addEventListener("click", () => {
  closeAnyModal();
  resetForm();
});

briefCloseX.addEventListener("click", closeAnyModal);
briefCloseBtn.addEventListener("click", closeAnyModal);

backupCloseX.addEventListener("click", closeAnyModal);
backupCloseBtn.addEventListener("click", closeAnyModal);

// ---------- top buttons ----------
briefBtn.addEventListener("click", () => {
  buildBrief();
  openModal(briefCard);
});

backupBtn.addEventListener("click", () => {
  openModal(backupCard);
});

// ---------- open form ----------
openFormBtn.addEventListener("click", () => {
  resetForm();
  openModal(formCard);
});

// ---------- segmented ----------
segBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    segBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeGroup = btn.dataset.group;
  });
});

// ---------- helpers (dates) ----------
function pad2(n) { return String(n).padStart(2, "0"); }

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseISOToLocal(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysBetweenISO(isoA, isoB) {
  const a = parseISOToLocal(isoA);
  const b = parseISOToLocal(isoB);
  if (!a || !b) return null;
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86400000);
}

function daysUntilNext(md) {
  if (!md) return null;

  const [mm, dd] = md.split("-").map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let target = new Date(today.getFullYear(), mm - 1, dd);
  if (target.getTime() < today.getTime()) {
    target = new Date(today.getFullYear() + 1, mm - 1, dd);
  }

  const ms = target.getTime() - today.getTime();
  return Math.round(ms / 86400000);
}

function mdFromSelect(monthSel, daySel) {
  const m = Number(monthSel.value || 0);
  const d = Number(daySel.value || 0);
  if (!m || !d) return "";
  return `${pad2(m)}-${pad2(d)}`;
}

function setSelectFromMD(monthSel, daySel, md) {
  if (!md) {
    monthSel.value = "";
    daySel.value = "";
    return;
  }
  const [mm, dd] = md.split("-").map(Number);
  monthSel.value = String(mm);
  daySel.value = String(dd);
}

function seedSelects() {
  const months = [
    ["", "--"],
    ["1", "Ιαν"], ["2", "Φεβ"], ["3", "Μαρ"], ["4", "Απρ"],
    ["5", "Μαι"], ["6", "Ιουν"], ["7", "Ιουλ"], ["8", "Αυγ"],
    ["9", "Σεπ"], ["10", "Οκτ"], ["11", "Νοε"], ["12", "Δεκ"]
  ];

  [bMonthEl, nMonthEl].forEach((sel) => {
    sel.innerHTML = "";
    months.forEach(([val, label]) => {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = label;
      sel.appendChild(opt);
    });
  });

  [bDayEl, nDayEl].forEach((sel) => {
    sel.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "--";
    sel.appendChild(opt0);

    for (let d = 1; d <= 31; d++) {
      const opt = document.createElement("option");
      opt.value = String(d);
      opt.textContent = String(d);
      sel.appendChild(opt);
    }
  });
}

// ---------- storage ----------
function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(friends));
}

// migrate from v1 if exists
function migrateDataIfNeeded() {
  if (Array.isArray(friends) && friends.length) return;

  try {
    const old = JSON.parse(localStorage.getItem("best_friends_v1") || "[]");
    if (!Array.isArray(old) || old.length === 0) return;

    friends = old.map((x) => ({
      id: x.id || String(Date.now() + Math.random()),
      group: "core",
      name: x.name || "",
      job: "",
      source: "",
      birthdayMD: x.birthdayMD || "",
      namedayMD: x.namedayMD || "",
      lastMetISO: x.lastMetISO || todayISO(),
      lastTalkedISO: ""
    }));

    save();
  } catch {}
}

// IMPORTANT: if you had network data before, we remap it to casual so nothing disappears
function normalizeGroupsOnce() {
  let changed = false;
  friends.forEach((f) => {
    const g = (f.group || "core").toLowerCase();
    if (g === "network") {
      f.group = "casual";
      changed = true;
    } else if (g !== "core" && g !== "casual") {
      f.group = "casual";
      changed = true;
    }
  });
  if (changed) save();
}

// ---------- form ----------
function resetForm() {
  editingId = null;
  activeGroup = "core";

  segBtns.forEach((b) => b.classList.remove("active"));
  const first = segBtns.find((b) => b.dataset.group === "core");
  if (first) first.classList.add("active");

  formTitle.textContent = "Προσθήκη φίλου";
  saveBtn.textContent = "Αποθήκευση";

  nameEl.value = "";
  jobEl.value = "";
  sourceEl.value = "";

  bMonthEl.value = "";
  bDayEl.value = "";
  nMonthEl.value = "";
  nDayEl.value = "";

  lastMetEl.value = todayISO();
  lastTalkedEl.value = "";
}

function startEdit(friend) {
  editingId = friend.id;
  activeGroup = (friend.group || "core").toLowerCase();
  if (activeGroup === "network") activeGroup = "casual";

  segBtns.forEach((b) => {
    b.classList.toggle("active", b.dataset.group === activeGroup);
  });

  formTitle.textContent = "Επεξεργασία φίλου";
  saveBtn.textContent = "Αποθήκευση αλλαγών";

  nameEl.value = friend.name || "";
  jobEl.value = friend.job || "";
  sourceEl.value = friend.source || "";

  setSelectFromMD(bMonthEl, bDayEl, friend.birthdayMD || "");
  setSelectFromMD(nMonthEl, nDayEl, friend.namedayMD || "");

  lastMetEl.value = friend.lastMetISO || todayISO();
  lastTalkedEl.value = friend.lastTalkedISO || "";
}

// ---------- status ----------
function statusForMeet(daysSince) {
  if (daysSince === null) return { cls: "pill-warn", text: "Χωρίς date" };
  if (daysSince <= 7) return { cls: "pill-good", text: "Καλά ✅" };
  if (daysSince <= 21) return { cls: "pill-warn", text: "Οκ-ish 🟠" };
  return { cls: "pill-bad", text: "Πρέπει να βρεθείτε 🔥" };
}

// ---------- render ----------
function render() {
  const today = todayISO();

  const core = friends.filter((f) => (f.group || "core").toLowerCase() === "core");
  const casual = friends.filter((f) => (f.group || "").toLowerCase() === "casual");

  const byLastMetDesc = (a, b) => {
    const da = daysBetweenISO(a.lastMetISO, today) ?? -9999;
    const db = daysBetweenISO(b.lastMetISO, today) ?? -9999;
    return db - da;
  };

  core.sort(byLastMetDesc);
  casual.sort(byLastMetDesc);

  renderList(listCoreEl, core, today);
  renderList(listCasualEl, casual, today);
}

function renderList(listEl, items, today) {
  listEl.innerHTML = "";

  if (items.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "Άδειο. Πάτα + για προσθήκη.";
    listEl.appendChild(empty);
    return;
  }

  items.forEach((f) => {
    const daysSinceMet = daysBetweenISO(f.lastMetISO, today);
    const daysSinceTalk = f.lastTalkedISO ? daysBetweenISO(f.lastTalkedISO, today) : null;
    const bdays = daysUntilNext(f.birthdayMD);
    const ndays = daysUntilNext(f.namedayMD);

    const li = document.createElement("li");

    const left = document.createElement("div");
    left.className = "friend-left";

    const titleRow = document.createElement("div");
    titleRow.className = "friend-title-row";

    const title = document.createElement("div");
    title.className = "name";
    title.textContent = f.name || "--";

    const status = document.createElement("span");
    status.className = "pill pill-strong";
    const st = statusForMeet(daysSinceMet ?? 9999);
    status.classList.add(st.cls);
    status.textContent = st.text;

    titleRow.appendChild(title);
    titleRow.appendChild(status);

    const kpi = document.createElement("div");
    kpi.className = "kpi-row";

    const daysNum = document.createElement("span");
    daysNum.className = "days-big";

    if (daysSinceMet !== null) {
      if (daysSinceMet <= 7) daysNum.style.color = "rgb(48, 209, 88)";
      else if (daysSinceMet <= 21) daysNum.style.color = "rgb(255, 159, 10)";
      else daysNum.style.color = "var(--red)";
      daysNum.textContent = String(daysSinceMet);
    } else {
      daysNum.style.color = "rgb(255, 159, 10)";
      daysNum.textContent = "--";
    }

    const daysText = document.createElement("span");
    daysText.className = "meta-big";
    daysText.textContent = "μέρες από την τελευταία συνάντηση";

    const kpiSpacer = document.createElement("span");
    kpiSpacer.className = "spacer";

    const talkChip = document.createElement("span");
    talkChip.className = "pill";
    if (daysSinceTalk !== null) {
      talkChip.textContent = `📞 ${daysSinceTalk}d`;
      if (daysSinceTalk <= 7) talkChip.classList.add("pill-good");
      else if (daysSinceTalk <= 21) talkChip.classList.add("pill-warn");
      else talkChip.classList.add("pill-bad");
    } else {
      talkChip.style.display = "none";
    }

    kpi.appendChild(daysNum);
    kpi.appendChild(daysText);
    kpi.appendChild(kpiSpacer);
    kpi.appendChild(talkChip);

    const chips = document.createElement("div");
    chips.className = "chips";

    function makeChip(label, days) {
      const chip = document.createElement("span");
      chip.className = "pill";

      if (days === null) {
        chip.textContent = `${label}: --`;
        return chip;
      }

      if (days === 0) {
        chip.textContent = `${label}: σήμερα 🎉`;
        chip.classList.add("pill-good");
        return chip;
      }

      chip.textContent = `${label}: ${days} μέρες`;

      if (days > 30) return chip;
      if (days <= 7) chip.classList.add("pill-bad");
      else chip.classList.add("pill-warn");

      return chip;
    }

    chips.appendChild(makeChip("Γενέθλια", bdays));
    chips.appendChild(makeChip("Γιορτή", ndays));

    left.appendChild(titleRow);
    left.appendChild(kpi);

    const metaLines = [];
    if (f.job) metaLines.push(`💼 ${f.job}`);
    if (f.source) metaLines.push(`📍 ${f.source}`);
    if (metaLines.length) {
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = metaLines.join(" • ");
      left.appendChild(meta);
    }

    left.appendChild(chips);

    const actions = document.createElement("div");
    actions.className = "friend-actions";

    // Met FIRST
    const metBtn = document.createElement("button");
    metBtn.className = "iconbtn primary";
    metBtn.textContent = "Met";
    metBtn.title = "Βρεθήκαμε σήμερα";
    metBtn.addEventListener("click", () => {
      f.lastMetISO = todayISO();
      save();
      render();
    });

    const phoneBtn = document.createElement("button");
    phoneBtn.className = "iconbtn secondary";
    phoneBtn.textContent = "📞";
    phoneBtn.title = "Μιλήσατε σήμερα";
    phoneBtn.addEventListener("click", () => {
      f.lastTalkedISO = todayISO();
      save();
      render();
    });

    const editBtn = document.createElement("button");
    editBtn.className = "iconbtn secondary";
    editBtn.textContent = "✏️";
    editBtn.title = "Edit";
    editBtn.addEventListener("click", () => {
      startEdit(f);
      openModal(formCard);
    });

    const delBtn = document.createElement("button");
    delBtn.className = "iconbtn danger";
    delBtn.textContent = "🗑️";
    delBtn.title = "Delete";
    delBtn.addEventListener("click", () => {
      const ok = confirm(`Να διαγραφεί ο/η ${f.name};`);
      if (!ok) return;

      friends = friends.filter((x) => x.id !== f.id);
      save();
      render();
      if (editingId === f.id) resetForm();
    });

    actions.appendChild(metBtn);
    actions.appendChild(phoneBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    const row = document.createElement("div");
    row.className = "friend-row";
    row.appendChild(left);
    row.appendChild(actions);

    li.appendChild(row);
    listEl.appendChild(li);
  });
}

// ---------- save friend ----------
saveBtn.addEventListener("click", () => {
  const name = (nameEl.value || "").trim();
  if (!name) return;

  const lastMetISO = lastMetEl.value || todayISO();
  const birthdayMD = mdFromSelect(bMonthEl, bDayEl);
  const namedayMD = mdFromSelect(nMonthEl, nDayEl);

  const lastTalkedISO = (lastTalkedEl.value || "").trim(); // keep empty if empty
  const job = (jobEl.value || "").trim();
  const source = (sourceEl.value || "").trim();

  if (editingId) {
    const f = friends.find((x) => x.id === editingId);
    if (!f) return;

    f.group = activeGroup; // only core/casual
    f.name = name;
    f.job = job;
    f.source = source;

    f.lastMetISO = lastMetISO;
    f.lastTalkedISO = lastTalkedISO;

    f.birthdayMD = birthdayMD;
    f.namedayMD = namedayMD;
  } else {
    friends.unshift({
      id: String(Date.now()),
      group: activeGroup,
      name,
      job,
      source,
      lastMetISO,
      lastTalkedISO,
      birthdayMD,
      namedayMD
    });
  }

  save();
  render();
  closeAnyModal();
  resetForm();
});

// ---------- brief ----------
function buildBrief() {
  const today = todayISO();

  const counts = {
    core: friends.filter((f) => (f.group || "core").toLowerCase() === "core").length,
    casual: friends.filter((f) => (f.group || "").toLowerCase() === "casual").length
  };

  const todayEvents = [];
  friends.forEach((f) => {
    const b = daysUntilNext(f.birthdayMD);
    const n = daysUntilNext(f.namedayMD);
    if (b === 0) todayEvents.push({ who: f.name, what: "Γενέθλια 🎂" });
    if (n === 0) todayEvents.push({ who: f.name, what: "Γιορτή 🎉" });
  });

  const upcoming = [];
  friends.forEach((f) => {
    const b = daysUntilNext(f.birthdayMD);
    const n = daysUntilNext(f.namedayMD);
    if (b !== null && b > 0 && b <= 7) upcoming.push({ who: f.name, what: "Γενέθλια", in: b });
    if (n !== null && n > 0 && n <= 7) upcoming.push({ who: f.name, what: "Γιορτή", in: n });
  });
  upcoming.sort((a, b) => a.in - b.in);

  const meetTargets = friends
    .filter((f) => (f.group || "core").toLowerCase() === "core")
    .map((f) => ({ f, days: daysBetweenISO(f.lastMetISO, today) }))
    .filter((x) => x.days !== null && x.days > 14)
    .sort((a, b) => b.days - a.days)
    .slice(0, 3);

  // only casual now
  const callTargets = friends
    .filter((f) => (f.group || "").toLowerCase() === "casual")
    .map((f) => ({ f, days: f.lastTalkedISO ? daysBetweenISO(f.lastTalkedISO, today) : null }))
    .filter((x) => x.days === null || x.days > 21)
    .sort((a, b) => {
      const A = a.days === null ? 9999 : a.days;
      const B = b.days === null ? 9999 : b.days;
      return B - A;
    })
    .slice(0, 3);

  briefBody.innerHTML = "";

  const header = document.createElement("div");
  header.className = "muted";
  header.style.margin = "0 2px 8px";
  header.textContent = `Core: ${counts.core} · Casual: ${counts.casual}`;
  briefBody.appendChild(header);

  if (todayEvents.length) {
    briefBody.appendChild(buildBlock("Σήμερα", todayEvents.map((x) => ({
      left: `${x.who}`,
      right: x.what
    }))));
  }

  if (upcoming.length) {
    briefBody.appendChild(buildBlock("Upcoming (7 μέρες)", upcoming.slice(0, 5).map((x) => ({
      left: `${x.who} -- ${x.what}`,
      right: `σε ${x.in}μ`
    }))));
  }

  if (meetTargets.length) {
    briefBody.appendChild(buildBlock("Να κανονίσεις συνάντηση (Core)", meetTargets.map((x) => ({
      left: x.f.name,
      right: `${x.days}μ`
    }))));
  }

  if (callTargets.length) {
    briefBody.appendChild(buildBlock("Να πάρεις τηλέφωνο (Casual)", callTargets.map((x) => ({
      left: x.f.name,
      right: x.days === null ? "--" : `${x.days}μ`
    }))));
  }

  // if empty -> one clean block
  if (briefBody.childNodes.length <= 1) {
    const empty = document.createElement("div");
    empty.className = "brief-block";
    empty.innerHTML = `<div class="brief-title">Όλα καθαρά ✅</div><div class="muted">Δεν υπάρχει κάτι επείγον.</div>`;
    briefBody.appendChild(empty);
  }
}

function buildBlock(title, lines) {
  const block = document.createElement("div");
  block.className = "brief-block";

  const t = document.createElement("div");
  t.className = "brief-title";
  t.textContent = title;

  block.appendChild(t);

  lines.forEach((ln) => {
    const row = document.createElement("div");
    row.className = "brief-line";

    const left = document.createElement("div");
    left.className = "brief-left";
    left.textContent = ln.left;

    const right = document.createElement("div");
    right.className = "brief-right";
    right.textContent = ln.right;

    row.appendChild(left);
    row.appendChild(right);
    block.appendChild(row);
  });

  return block;
}

// ---------- backup ----------
exportBtn.addEventListener("click", async () => {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    friends
  };

  const text = JSON.stringify(data, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const file = new File([blob], "best-friend-backup.json", { type: "application/json" });

  try {
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: "Best Friend App Backup",
        files: [file]
      });
      return;
    }
  } catch {}

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "best-friend-backup.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

importFile.addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    const incoming = Array.isArray(parsed) ? parsed : parsed.friends;
    if (!Array.isArray(incoming)) {
      alert("Δεν είναι σωστό JSON backup.");
      return;
    }

    const normalized = incoming.map((x) => {
      const g = String(x.group || "core").toLowerCase();
      const group = (g === "core") ? "core" : "casual"; // anything else -> casual (includes old network)

      return {
        id: String(x.id || Date.now() + Math.random()),
        group,
        name: String(x.name || "").trim(),
        job: String(x.job || "").trim(),
        source: String(x.source || "").trim(),
        birthdayMD: String(x.birthdayMD || ""),
        namedayMD: String(x.namedayMD || ""),
        lastMetISO: String(x.lastMetISO || todayISO()),
        lastTalkedISO: String(x.lastTalkedISO || "")
      };
    }).filter((x) => x.name);

    friends = normalized;
    save();
    render();
    alert("Έγινε import ✅");
  } catch {
    alert("Σφάλμα στο import.");
  } finally {
    importFile.value = "";
  }
});