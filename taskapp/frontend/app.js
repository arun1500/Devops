// TaskFlow frontend. The API remains compatible with the original task backend.
const API_BASE = "http://localhost:4000/api/tasks";
const $ = (s) => document.querySelector(s);

const form = $("#task-form"), titleInput = $("#title"), descInput = $("#description");
const list = $("#task-list"), banner = $("#status-banner"), loading = $("#loading"), empty = $("#empty");
const search = $("#search"), sort = $("#sort");
let allTasks = [], currentView = "all", editingId = null, loadingFirst = true;

const STATUS = {
  pending: { label: "Pending", icon: "○" },
  in_progress: { label: "In Progress", icon: "◐" },
  done: { label: "Completed", icon: "✓" }
};
const STATUS_CYCLE = { pending: "in_progress", in_progress: "done", done: "pending" };

function escapeHtml(value = "") {
  const div = document.createElement("div"); div.textContent = value; return div.innerHTML;
}
function showBanner(message, type = "error") {
  banner.textContent = message; banner.className = `banner ${type}`;
  clearTimeout(showBanner.timer); showBanner.timer = setTimeout(() => banner.className = "hidden", 4500);
}
function setLoading(on) { loading.classList.toggle("hidden", !on); }
function formatDate(task) {
  const raw = task.createdAt || task.created_at || task.created || task.updatedAt;
  if (!raw) return "Task";
  const d = new Date(raw); return Number.isNaN(d.getTime()) ? "Task" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

async function fetchTasks(silent = false) {
  if (!silent) setLoading(true);
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    allTasks = await res.json();
    render();
    if (loadingFirst) { showBanner("Tasks synced successfully.", "success"); loadingFirst = false; }
  } catch (err) {
    showBanner(`Could not reach backend: ${err.message}`);
    if (loadingFirst) render();
  } finally { setLoading(false); }
}

function updateStats() {
  const counts = { total: allTasks.length, pending: 0, in_progress: 0, done: 0 };
  allTasks.forEach(t => counts[t.status] = (counts[t.status] || 0) + 1);
  [["stat-total", counts.total],["stat-pending",counts.pending],["stat-progress",counts.in_progress],["stat-done",counts.done],
   ["nav-total",counts.total],["nav-pending",counts.pending],["nav-progress",counts.in_progress],["nav-done",counts.done]]
   .forEach(([id,n]) => { const el = document.getElementById(id); if (el) el.textContent = n; });
}

function getVisibleTasks() {
  const q = search.value.trim().toLowerCase();
  let tasks = allTasks.filter(t => currentView === "all" || t.status === currentView)
    .filter(t => !q || `${t.title} ${t.description || ""}`.toLowerCase().includes(q));
  const rank = { pending: 1, in_progress: 2, done: 3 };
  tasks.sort((a,b) => {
    if (sort.value === "az") return a.title.localeCompare(b.title);
    if (sort.value === "status") return (rank[a.status]||9) - (rank[b.status]||9);
    const da = new Date(a.createdAt || a.created_at || 0).getTime(), db = new Date(b.createdAt || b.created_at || 0).getTime();
    return sort.value === "oldest" ? da - db : db - da;
  });
  return tasks;
}

function render() {
  updateStats();
  const visible = getVisibleTasks();
  const titles = { all: "All tasks", pending: "Pending tasks", in_progress: "In progress", done: "Completed" };
  $("#view-title").textContent = titles[currentView];
  $("#result-count").textContent = `${visible.length} task${visible.length === 1 ? "" : "s"}`;
  list.innerHTML = "";
  const hasAny = allTasks.length > 0;
  empty.classList.toggle("hidden", visible.length !== 0);
  if (!visible.length) {
    $("#empty-title").textContent = search.value ? "No matching tasks" : (hasAny ? "Nothing in this view" : "No tasks yet");
    $("#empty-text").textContent = search.value ? "Try another search term." : "Create your first task and start making progress.";
    return;
  }
  visible.forEach(task => {
    const status = STATUS[task.status] || STATUS.pending;
    const li = document.createElement("article");
    li.className = `task-card ${task.status === "done" ? "completed" : ""}`;
    li.dataset.id = task.id;
    li.innerHTML = `
      <div class="check ${task.status}" data-action="cycle" title="Change status">${status.icon}</div>
      <div class="task-content">
        <div class="task-title-row"><h3>${escapeHtml(task.title)}</h3><span class="badge ${task.status}">${status.label}</span></div>
        ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ""}
        <small>Added ${formatDate(task)}</small>
      </div>
      <div class="task-actions">
        <button class="icon-btn" data-action="edit" title="Edit task" aria-label="Edit task">✎</button>
        <button class="icon-btn danger" data-action="delete" title="Delete task" aria-label="Delete task">⌫</button>
      </div>`;
    list.appendChild(li);
  });
}

async function request(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`Server responded ${res.status}`);
  return res;
}

list.addEventListener("click", async e => {
  const target = e.target.closest("[data-action]"); if (!target) return;
  const card = target.closest(".task-card"), id = card?.dataset.id, action = target.dataset.action;
  const task = allTasks.find(t => String(t.id) === String(id));
  if (!task) return;
  try {
    target.disabled = true;
    if (action === "delete") {
      if (!confirm(`Delete "${task.title}"?`)) return;
      await request(`${API_BASE}/${id}`, { method: "DELETE" });
      showBanner("Task deleted.", "success");
    } else if (action === "cycle") {
      await request(`${API_BASE}/${id}`, { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({status: STATUS_CYCLE[task.status] || "pending"}) });
      showBanner("Task status updated.", "success");
    } else if (action === "edit") {
      editingId = id; $("#edit-title").value = task.title || ""; $("#edit-description").value = task.description || "";
      $("#edit-status").value = task.status || "pending"; $("#edit-dialog").showModal(); return;
    }
    await fetchTasks(true);
  } catch (err) { showBanner(`Action failed: ${err.message}`); }
  finally { target.disabled = false; }
});

form.addEventListener("submit", async e => {
  e.preventDefault();
  const title = titleInput.value.trim(); if (!title) return;
  const button = form.querySelector("button"); button.disabled = true;
  try {
    await request(API_BASE, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({title, description:descInput.value.trim()})});
    titleInput.value = ""; descInput.value = ""; showBanner("Task created successfully.", "success"); await fetchTasks(true); titleInput.focus();
  } catch (err) { showBanner(`Could not create task: ${err.message}`); }
  finally { button.disabled = false; }
});

$("#edit-form").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await request(`${API_BASE}/${editingId}`, {method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({
      title: $("#edit-title").value.trim(), description: $("#edit-description").value.trim(), status: $("#edit-status").value
    })});
    $("#edit-dialog").close(); showBanner("Task updated.", "success"); await fetchTasks(true);
  } catch (err) { showBanner(`Could not update task: ${err.message}`); }
});
$("#close-modal").onclick = () => $("#edit-dialog").close();
$("#cancel-edit").onclick = () => $("#edit-dialog").close();
$("#focus-add").onclick = () => { titleInput.focus(); window.scrollTo({top:0,behavior:"smooth"}); };
$("#empty-add").onclick = () => titleInput.focus();
search.addEventListener("input", render); sort.addEventListener("change", render);

document.querySelectorAll(".nav-item[data-view]").forEach(btn => btn.addEventListener("click", () => {
  currentView = btn.dataset.view;
  document.querySelectorAll(".nav-item[data-view]").forEach(b => b.classList.toggle("active", b === btn));
  render();
}));

const savedTheme = localStorage.getItem("taskflow-theme");
if (savedTheme === "dark") document.body.classList.add("dark");
function updateThemeLabel() { $("#theme-icon").textContent = document.body.classList.contains("dark") ? "☀" : "☾"; }
$("#theme-toggle").onclick = () => {
  document.body.classList.toggle("dark"); localStorage.setItem("taskflow-theme", document.body.classList.contains("dark") ? "dark" : "light"); updateThemeLabel();
};
updateThemeLabel();
fetchTasks();
setInterval(() => fetchTasks(true), 10000);
