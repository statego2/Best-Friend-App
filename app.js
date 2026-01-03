const KEY = "best_friends_v1";

let friends = load();
let editingId = null;

// ---------- elements ----------
const formTitle = document.getElementById("formTitle");
const nameEl = document.getElementById("name");
const birthdayEl = document.getElementById("birthday");
const namedayEl = document.getElementById("nameday");
const lastMetEl = document.getElementById("lastMet");

const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const listEl = document.getElementById("list");

// modal elements
const openFormBtn = document.getElementById("openFormBtn");
const overlay = document.getElementById("overlay");
const formCard = document.getElementById("formCard");

// ---------- init ----------
lastMetEl.value = todayISO();
render();
resetForm();
closeForm(); // ξεκίνα με κλειστή φόρμα

// ---------- modal ----------
function openForm() {
  overlay.classList.add("show");
  formCard.classList.add("show");
  document.body.classList.add("modal-open");
  formCard.setAttribute("aria-hidden", "false");
}

function closeForm() {
  overlay.classList.remove("show");
  formCard.classList.remove("show");
  document.body.classList.remove("modal-open");
  formCard.setAttribute("aria-hidden", "true");
  resetForm();
}

openFormBtn.addEventListener("click", () => {
  resetForm();
  openForm();
});

overlay.addEventListener("click", closeForm);
cancelBtn.addEventListener("click", closeForm);

// ---------- helpers (dates) ----------
function pad2(n) {
  return String(n).padStart(2, "0");
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseISOToLocal(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysBetweenISO(isoA, isoB) {
  const a = parseISOToLocal(isoA);
  const b = parseISOToLocal(isoB);
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86400000);
}

function extractMD(isoDate) {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return "";
  return `${parts[1]}-${parts[2]}`;
}

function mdToInputDate(md) {
  if (!md) return "";
  return `2000-${md}`;
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

// ---------- form ----------
function resetForm() {
  editingId = null;
  formTitle.textContent = "Προσθήκη φίλου";
  saveBtn.textContent = "Αποθήκευση";

  nameEl.value = "";
  birthdayEl.value = "";
  namedayEl.value = "";
  lastMetEl.value = todayISO();
}

function startEdit(friend) {
  editingId = friend.id;
  formTitle.textContent = "Επεξεργασία φίλου";
  saveBtn.textContent = "Αποθήκευση αλλαγών";

  nameEl.value = friend.name || "";
  birthdayEl.value = mdToInputDate(friend.birthdayMD);
  namedayEl.value = mdToInputDate(friend.namedayMD);
  lastMetEl.value = friend.lastMetISO || todayISO();
}

// ---------- render ----------
function render() {
  const today = todayISO();

  const sorted = [...friends].sort((a, b) => {
    const da = daysBetweenISO(a.lastMetISO, today);
    const db = daysBetweenISO(b.lastMetISO, today);
    return db - da;
  });

  listEl.innerHTML = "";

  if (sorted.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "Δεν έχεις προσθέσει φίλους ακόμα. Πάτα + για προσθήκη.";
    listEl.appendChild(empty);
    return;
  }

  sorted.forEach((f) => {
    const daysSince = daysBetweenISO(f.lastMetISO, today);
    const bdays = daysUntilNext(f.birthdayMD);
    const ndays = daysUntilNext(f.namedayMD);

    const li = document.createElement("li");

    // left column
    const left = document.createElement("div");
    left.className = "friend-left";

    // --- title row (name + status pill) ---
    const titleRow = document.createElement("div");
    titleRow.className = "friend-title-row";

    const title = document.createElement("div");
    title.className = "name";
    title.textContent = f.name;

    const status = document.createElement("span");
    status.className = "pill pill-strong";

    if (daysSince <= 7) {
      status.classList.add("pill-good");
      status.textContent = "Καλά ✅";
    } else if (daysSince <= 21) {
      status.classList.add("pill-warn");
      status.textContent = "Οκ-ish 🟠";
    } else {
      status.classList.add("pill-bad");
      status.textContent = "Πρέπει να βρεθείτε 🔥";
    }

    titleRow.appendChild(title);
    titleRow.appendChild(status);

    // --- main KPI: days since met ---
    const kpi = document.createElement("div");
    kpi.className = "kpi-row";

    const daysNum = document.createElement("span");
    daysNum.className = "days-big";

    if (daysSince <= 7) daysNum.style.color = "rgb(48, 209, 88)";
    else if (daysSince <= 21) daysNum.style.color = "rgb(255, 159, 10)";
    else daysNum.style.color = "var(--red)";

    daysNum.textContent = String(daysSince);

    const daysText = document.createElement("span");
    daysText.className = "meta-big";
    daysText.textContent = "μέρες από την τελευταία φορά";

    kpi.appendChild(daysNum);
    kpi.appendChild(daysText);

    // --- chips for birthday/nameday ---
    const chips = document.createElement("div");
    chips.className = "chips";

    function makeChip(label, days) {
      const chip = document.createElement("span");
      chip.className = "pill";

      if (days === null) {
        chip.textContent = `${label}: --`;
        return chip;
      }

      chip.textContent = `${label}: ${days} μέρες`;

      // αδιάφορο αν είναι μακριά (> 30)
      if (days > 30) return chip;

      // από μήνα και κάτω γίνεται έντονο
      if (days <= 7) chip.classList.add("pill-bad"); // κόκκινο
      else chip.classList.add("pill-warn");          // πορτοκαλί (8..30)

      return chip;
    }

    chips.appendChild(makeChip("Γενέθλια", bdays));
    chips.appendChild(makeChip("Γιορτή", ndays));

    left.appendChild(titleRow);
    left.appendChild(kpi);
    left.appendChild(chips);

    // right actions (compact square buttons)
    const actions = document.createElement("div");
    actions.className = "friend-actions";

    const metBtn = document.createElement("button");
    metBtn.className = "iconbtn primary";
    metBtn.textContent = "Met";
    metBtn.title = "Βρεθήκαμε σήμερα";
    metBtn.addEventListener("click", () => {
      f.lastMetISO = todayISO();
      save();
      render();
    });

    const editBtn = document.createElement("button");
    editBtn.className = "iconbtn secondary";
    editBtn.textContent = "✏️";
    editBtn.title = "Edit";
    editBtn.addEventListener("click", () => {
      startEdit(f);
      openForm();
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
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    // assemble row
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
  const birthdayMD = extractMD(birthdayEl.value);
  const namedayMD = extractMD(namedayEl.value);

  if (editingId) {
    const f = friends.find((x) => x.id === editingId);
    if (!f) return;

    f.name = name;
    f.lastMetISO = lastMetISO;
    f.birthdayMD = birthdayMD;
    f.namedayMD = namedayMD;
  } else {
    friends.unshift({
      id: String(Date.now()),
      name,
      lastMetISO,
      birthdayMD,
      namedayMD,
    });
  }

  save();
  render();
  closeForm();
});