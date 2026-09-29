const STORAGE_KEY = "kanban-lak-actions-v1";
const columns = [
  { id: "backlog", title: "Backlog", description: "Nog te starten", limit: 5 },
  { id: "ready", title: "Ready", description: "Klaar om op te pakken" },
  { id: "progress", title: "In progress", description: "Actief in uitvoering", limit: 3 },
  { id: "review", title: "In review", description: "Wacht op afstemming" },
  { id: "done", title: "Done", description: "Afgerond" },
  { id: "blocked", title: "Blocked", description: "Actie kan niet verder" },
];
const starterTasks = [
  { id: "1", title: "Planning Q4 aanscherpen", owner: "Olivier", due: "2026-10-02", note: "Laatste feedback verwerken en delen.", status: "progress" },
  { id: "2", title: "Openstaande klantvragen bundelen", owner: "Maaike", due: "2026-10-01", note: "Eén overzicht maken met prioriteit per vraag.", status: "ready" },
  { id: "3", title: "Nieuwe werkwijze documenteren", owner: "Olivier", due: "2026-10-09", note: "Eerste versie van de checklist staat klaar.", status: "backlog" },
  { id: "4", title: "Besluit leverancier bevestigen", owner: "Maaike", due: "2026-09-28", note: "Wacht op terugkoppeling vanuit finance.", status: "blocked" },
  { id: "5", title: "Intakeformulier publiceren", owner: "Olivier", due: "2026-09-25", note: "Getest met drie collega’s.", status: "done" },
];
let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || starterTasks;
let draggedId = null;
const $ = (selector) => document.querySelector(selector);
const today = new Date().toISOString().slice(0, 10);

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
function initials(name) { return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function formatDate(date) { if (!date) return "Geen deadline"; return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00`)); }
function escapeHtml(value = "") { return value.replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char])); }
function render() {
  const query = $("#searchInput").value.toLowerCase().trim();
  const owner = $("#ownerFilter").value;
  const filtered = tasks.filter((task) => (!query || `${task.title} ${task.note} ${task.owner}`.toLowerCase().includes(query)) && (owner === "all" || task.owner === owner));
  $("#board").innerHTML = columns.map((column) => {
    const items = filtered.filter((task) => task.status === column.id);
    return `<section class="column" data-column="${column.id}"><div class="column-header"><h3>${column.title}</h3><small>${items.length}${column.limit ? ` / ${column.limit}` : ""}</small></div><p class="column-description">${column.description}</p><div class="column-list" data-dropzone="${column.id}">${items.length ? items.map(taskCard).join("") : '<div class="empty-state">Nog geen acties hier.<br>Sleep of voeg er één toe.</div>'}</div></section>`;
  }).join("");
  document.querySelectorAll(".task-card").forEach((card) => {
    card.addEventListener("dragstart", () => { draggedId = card.dataset.id; card.classList.add("dragging"); });
    card.addEventListener("dragend", () => { draggedId = null; card.classList.remove("dragging"); });
    card.querySelector(".task-status").addEventListener("change", (event) => moveTask(card.dataset.id, event.target.value));
  });
  document.querySelectorAll("[data-dropzone]").forEach((zone) => { zone.addEventListener("dragover", (event) => event.preventDefault()); zone.addEventListener("drop", () => { if (draggedId) moveTask(draggedId, zone.dataset.dropzone); }); });
  updateMetrics();
}
function taskCard(task) {
  const overdue = task.due && task.due < today && task.status !== "done";
  return `<article class="task-card" draggable="true" data-id="${task.id}"><h4 class="task-title">${escapeHtml(task.title)}</h4>${task.note ? `<p class="task-note">${escapeHtml(task.note)}</p>` : ""}<div class="task-meta"><span class="owner"><span class="owner-dot">${initials(task.owner)}</span>${escapeHtml(task.owner)}</span><span class="due ${overdue ? "overdue" : ""}">${formatDate(task.due)}</span></div><select class="task-status" aria-label="Verplaats ${escapeHtml(task.title)}">${columns.map((column) => `<option value="${column.id}" ${task.status === column.id ? "selected" : ""}>${column.title}</option>`).join("")}</select></article>`;
}
function updateMetrics() {
  const total = tasks.length; const done = tasks.filter((task) => task.status === "done").length;
  $("#openMetric").textContent = total - done; $("#progressMetric").textContent = tasks.filter((task) => task.status === "progress").length; $("#blockedMetric").textContent = tasks.filter((task) => task.status === "blocked").length; $("#doneMetric").textContent = `${total ? Math.round((done / total) * 100) : 0}%`; $("#doneSubmetric").textContent = `${done} van ${total} acties`;
  $("#lastUpdated").textContent = `Bijgewerkt ${new Intl.DateTimeFormat("nl-NL", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }).format(new Date())}`;
}
function moveTask(id, status) { const task = tasks.find((item) => item.id === id); if (!task || task.status === status) return; task.status = status; save(); render(); showToast(`Actie verplaatst naar ${columns.find((column) => column.id === status).title}`); }
function showToast(message) { const toast = $("#toast"); toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2300); }
function refreshOwners() { const owners = [...new Set(tasks.map((task) => task.owner))].sort(); const current = $("#ownerFilter").value; $("#ownerFilter").innerHTML = `<option value="all">Alle eigenaren</option>${owners.map((owner) => `<option value="${escapeHtml(owner)}">${escapeHtml(owner)}</option>`).join("")}`; $("#ownerFilter").value = owners.includes(current) ? current : "all"; }

$("#searchInput").addEventListener("input", render); $("#ownerFilter").addEventListener("change", render);
$("#openAddTask").addEventListener("click", () => { $("#taskForm").reset(); $("#taskDialog").showModal(); $("#taskTitle").focus(); });
$("#taskForm").addEventListener("submit", (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); tasks.unshift({ id: crypto.randomUUID(), title: data.get("title"), owner: data.get("owner"), due: data.get("due"), note: data.get("note"), status: "backlog" }); save(); refreshOwners(); render(); $("#taskDialog").close(); showToast("Actie toegevoegd aan Backlog"); });
$("#resetBoard").addEventListener("click", () => { if (confirm("Zet het board terug naar de voorbeeldacties?")) { tasks = starterTasks.map((task) => ({ ...task })); save(); refreshOwners(); render(); showToast("Board teruggezet"); } });
$("#focusAction").addEventListener("click", () => { const open = tasks.filter((task) => task.status !== "done"); const focus = open[Math.floor(Math.random() * open.length)]; $("#focusText").textContent = focus ? focus.title : "Alle acties zijn afgerond."; });
refreshOwners(); render();
