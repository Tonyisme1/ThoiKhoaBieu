/**
 * SMART NOTES MODULE
 * Manage smart notes system with markdown, todo lists, tags
 */

/**
 * Render markdown to HTML
 */
export function renderMarkdown(text) {
  if (!text) return "";

  let html = text;

  // Headers
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

  // Links (auto-detect URLs)
  html = html.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank">$1</a>',
  );

  // Todo checkboxes (interactive - can be checked/unchecked)
  html = html.replace(
    /\[x\]\s(.+)/gi,
    '<div class="todo-item completed"><input type="checkbox" class="todo-checkbox" checked> <span>$1</span></div>',
  );
  html = html.replace(
    /\[ \]\s(.+)/g,
    '<div class="todo-item"><input type="checkbox" class="todo-checkbox"> <span>$1</span></div>',
  );

  console.log("Rendered markdown HTML:", html);

  // Bullet lists
  html = html.replace(/^\- (.+)$/gim, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>");

  // Line breaks
  html = html.replace(/\n/g, "<br>");

  return html;
}

/**
 * Parse tags from string
 */
export function parseTags(tagString) {
  if (!tagString) return [];
  return tagString
    .split(/\s+/)
    .filter((t) => t.startsWith("#"))
    .map((t) => t.toLowerCase());
}

/**
 * Calculate todo progress
 */
export function calculateTodoProgress(content) {
  const totalMatch = content.match(/\[[ x]\]/gi);
  const completedMatch = content.match(/\[x\]/gi);

  const total = totalMatch ? totalMatch.length : 0;
  const completed = completedMatch ? completedMatch.length : 0;

  return {
    total,
    completed,
    percentage: total > 0 ? (completed / total) * 100 : 0,
  };
}

/**
 * Format note date
 */
export function formatNoteDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString("en-US");
}

/**
 * Create note card element
 */
export function createNoteCard(note, { onEdit, onDelete, onClick }) {
  const card = document.createElement("div");
  card.className = "note-card";
  card.dataset.id = note.id;
  card.style.setProperty("--note-color", note.color || "#60a5fa");

  // Header
  const header = document.createElement("div");
  header.className = "note-card-header";

  const title = document.createElement("h4");
  title.className = "note-title";
  title.textContent = note.title;

  const actions = document.createElement("div");
  actions.className = "note-actions";

  if (note.pinned) {
    const pinIndicator = document.createElement("span");
    pinIndicator.className = "note-pinned-indicator";
    pinIndicator.textContent = "📌";
    header.appendChild(pinIndicator);
  }

  const editBtn = document.createElement("button");
  editBtn.className = "note-action-btn";
  editBtn.textContent = "✏️";
  editBtn.title = "Edit";
  editBtn.onclick = (e) => {
    e.stopPropagation();
    onEdit(note);
  };

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "note-action-btn";
  deleteBtn.textContent = "🗑️";
  deleteBtn.title = "Delete";
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    onDelete(note.id);
  };

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  header.appendChild(title);
  header.appendChild(actions);
  card.appendChild(header);

  // Tags
  if (note.tags.length > 0) {
    const tagsContainer = document.createElement("div");
    tagsContainer.className = "note-tags";
    note.tags.forEach((tag) => {
      const tagEl = document.createElement("span");
      tagEl.className = "note-tag";
      tagEl.textContent = tag;
      tagsContainer.appendChild(tagEl);
    });
    card.appendChild(tagsContainer);
  }

  // Todo progress
  if (note.type === "todo") {
    const progress = calculateTodoProgress(note.content);
    const progressContainer = document.createElement("div");
    progressContainer.className = "note-todo-progress";

    const progressBar = document.createElement("div");
    progressBar.className = "note-progress-bar";

    const progressFill = document.createElement("div");
    progressFill.className = "note-progress-fill";
    progressFill.style.width = `${progress.percentage}%`;

    progressBar.appendChild(progressFill);

    const progressText = document.createElement("span");
    progressText.className = "note-progress-text";
    progressText.textContent = `${progress.completed}/${progress.total}`;

    progressContainer.appendChild(progressBar);
    progressContainer.appendChild(progressText);
    card.appendChild(progressContainer);
  }

  // Content preview
  const content = document.createElement("div");
  content.className = "note-content-preview rendered-markdown";
  content.innerHTML = renderMarkdown(note.content);
  content.dataset.noteId = note.id; // Store note ID for checkbox updates
  card.appendChild(content);

  // Footer
  const footer = document.createElement("div");
  footer.className = "note-footer";

  const meta = document.createElement("div");
  meta.className = "note-meta";

  const typeBadge = document.createElement("span");
  typeBadge.className = "note-type-badge";
  typeBadge.innerHTML =
    note.type === "todo" ? "<span>✓</span> Todo" : "<span>📄</span> Note";
  meta.appendChild(typeBadge);

  const timestamp = document.createElement("span");
  timestamp.textContent = formatNoteDate(note.updatedAt);
  meta.appendChild(timestamp);

  footer.appendChild(meta);
  card.appendChild(footer);

  // Click to expand/view (only if onClick is provided)
  if (onClick) {
    card.onclick = () => onClick(note);
    card.style.cursor = "pointer";
  }

  return card;
}

/**
 * Update notes stats display
 */
export function updateNotesStats(smartNotes) {
  const totalEl = document.getElementById("total-notes-count");
  const pinnedEl = document.getElementById("pinned-notes-count");
  const todoEl = document.getElementById("todo-notes-count");
  const completedEl = document.getElementById("completed-todos-count");

  if (totalEl) totalEl.textContent = smartNotes.length;
  if (pinnedEl)
    pinnedEl.textContent = smartNotes.filter((n) => n.pinned).length;
  if (todoEl)
    todoEl.textContent = smartNotes.filter((n) => n.type === "todo").length;

  // Calculate completed todos
  let totalCompleted = 0;
  smartNotes
    .filter((n) => n.type === "todo")
    .forEach((n) => {
      const progress = calculateTodoProgress(n.content);
      if (progress.percentage === 100) totalCompleted++;
    });

  if (completedEl) completedEl.textContent = totalCompleted;
}

/**
 * Filter and sort notes
 */
export function filterAndSortNotes(notes, filterType, searchQuery) {
  let filtered = [...notes];

  // Apply filter
  if (filterType === "pinned") {
    filtered = filtered.filter((n) => n.pinned);
  } else if (filterType === "todos") {
    filtered = filtered.filter((n) => n.type === "todo");
  } else if (filterType === "normal") {
    filtered = filtered.filter((n) => n.type === "normal");
  }

  // Apply search
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query) ||
        n.tags.some((t) => t.includes(query)),
    );
  }

  // Sort: pinned first, then by updatedAt
  filtered.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  return filtered;
}
