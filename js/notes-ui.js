/**
 * SMART NOTES UI MODULE
 * Quản lý giao diện và events của hệ thống ghi chú
 */

import {
  renderMarkdown,
  parseTags,
  createNoteCard,
  updateNotesStats,
  filterAndSortNotes,
} from "./notes.js";

// Global state
let appData = null;
let saveDataCallback = null;
let currentFilterType = "all";
let currentSearchQuery = "";

/**
 * Initialize notes module
 */
export function initNotesUI(data, saveCallback) {
  appData = data;
  saveDataCallback = saveCallback;

  if (!appData.smartNotes) {
    appData.smartNotes = [];
  }

  setupNotesListeners();
  renderSmartNotes();
}

/**
 * Render smart notes grid
 */
export function renderSmartNotes() {
  const grid = document.getElementById("smart-notes-grid");
  const emptyState = document.getElementById("notes-empty-state");

  if (!grid) return;

  // Get filtered notes
  const filteredNotes = filterAndSortNotes(
    appData.smartNotes,
    currentFilterType,
    currentSearchQuery,
  );

  // Update stats
  updateNotesStats(appData.smartNotes);

  // Clear grid
  grid.innerHTML = "";

  // Show empty state if no notes
  if (filteredNotes.length === 0) {
    if (emptyState) {
      emptyState.style.display = "flex";
      emptyState.querySelector("p").textContent =
        currentFilterType !== "all" || currentSearchQuery
          ? "Không tìm thấy ghi chú phù hợp"
          : "Chưa có ghi chú nào. Nhấn + để tạo ghi chú mới";
    }
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  // Render notes
  filteredNotes.forEach((note) => {
    const card = createNoteCard(note, {
      onEdit: openNoteModal,
      onDelete: deleteNote,
      onClick: openNoteModal,
    });
    grid.appendChild(card);
  });
}

/**
 * Open note modal
 */
export function openNoteModal(existingNote = null) {
  const modal = document.getElementById("note-modal");
  const overlay = document.getElementById("note-modal-overlay");
  const titleInput = document.getElementById("note-title-input");
  const contentInput = document.getElementById("note-content-input");
  const tagsInput = document.getElementById("note-tags-input");
  const colorInput = document.getElementById("note-color-input");
  const pinnedCheckbox = document.getElementById("note-pinned-checkbox");
  const modalTitle = document.querySelector("#note-modal h3");
  const previewPane = document.getElementById("note-preview-pane");

  if (!modal) return;

  // Reset form
  titleInput.value = "";
  contentInput.value = "";
  tagsInput.value = "";
  colorInput.value = "#60a5fa";
  pinnedCheckbox.checked = false;
  previewPane.innerHTML = "";
  document.getElementById("editor-mode-btn").classList.add("active");
  document.getElementById("preview-mode-btn").classList.remove("active");
  document.getElementById("note-editor-section").style.display = "block";
  document.getElementById("note-preview-section").style.display = "none";

  // Set type to normal by default
  document.getElementById("note-type-normal").checked = true;

  // If editing existing note
  if (existingNote) {
    modalTitle.textContent = "Chỉnh sửa ghi chú";
    titleInput.value = existingNote.title;
    contentInput.value = existingNote.content;
    tagsInput.value = existingNote.tags.join(" ");
    colorInput.value = existingNote.color || "#60a5fa";
    pinnedCheckbox.checked = existingNote.pinned || false;

    if (existingNote.type === "todo") {
      document.getElementById("note-type-todo").checked = true;
    }

    // Store note ID for update
    modal.dataset.editId = existingNote.id;
  } else {
    modalTitle.textContent = "Tạo ghi chú mới";
    delete modal.dataset.editId;
  }

  updateCharCount();
  modal.classList.add("active");
  overlay.classList.add("active");
  titleInput.focus();
}

/**
 * Close note modal
 */
export function closeNoteModal() {
  const modal = document.getElementById("note-modal");
  const overlay = document.getElementById("note-modal-overlay");

  if (modal) {
    modal.classList.remove("active");
    delete modal.dataset.editId;
  }
  if (overlay) overlay.classList.remove("active");
}

/**
 * Save note
 */
export function saveNote() {
  const modal = document.getElementById("note-modal");
  const title = document.getElementById("note-title-input").value.trim();
  const content = document.getElementById("note-content-input").value.trim();
  const tagsInput = document.getElementById("note-tags-input").value.trim();
  const color = document.getElementById("note-color-input").value;
  const pinned = document.getElementById("note-pinned-checkbox").checked;
  const type = document.getElementById("note-type-todo").checked
    ? "todo"
    : "normal";

  // Validation
  if (!title) {
    alert("Vui lòng nhập tiêu đề ghi chú");
    return;
  }

  if (!content) {
    alert("Vui lòng nhập nội dung ghi chú");
    return;
  }

  // Parse tags
  const tags = parseTags(tagsInput);

  const now = new Date().toISOString();

  // Check if editing or creating
  const editId = modal.dataset.editId;

  if (editId) {
    // Update existing note
    const noteIndex = appData.smartNotes.findIndex((n) => n.id === editId);
    if (noteIndex !== -1) {
      appData.smartNotes[noteIndex] = {
        ...appData.smartNotes[noteIndex],
        title,
        content,
        type,
        tags,
        color,
        pinned,
        updatedAt: now,
      };
    }
  } else {
    // Create new note
    const newNote = {
      id: "note-" + Date.now(),
      title,
      content,
      type,
      tags,
      color,
      pinned,
      createdAt: now,
      updatedAt: now,
    };

    appData.smartNotes.push(newNote);
  }

  // Save to localStorage
  saveDataCallback();

  // Re-render
  renderSmartNotes();

  // Close modal
  closeNoteModal();
}

/**
 * Delete note
 */
export function deleteNote(noteId) {
  if (!confirm("Bạn có chắc chắn muốn xóa ghi chú này?")) return;

  appData.smartNotes = appData.smartNotes.filter((n) => n.id !== noteId);
  saveDataCallback();
  renderSmartNotes();
}

/**
 * Toggle preview mode
 */
export function togglePreview(mode) {
  const editorSection = document.getElementById("note-editor-section");
  const previewSection = document.getElementById("note-preview-section");
  const editorBtn = document.getElementById("editor-mode-btn");
  const previewBtn = document.getElementById("preview-mode-btn");
  const previewPane = document.getElementById("note-preview-pane");

  if (mode === "preview") {
    const content = document.getElementById("note-content-input").value;
    previewPane.innerHTML = renderMarkdown(content);

    editorSection.style.display = "none";
    previewSection.style.display = "block";
    editorBtn.classList.remove("active");
    previewBtn.classList.add("active");
  } else {
    editorSection.style.display = "block";
    previewSection.style.display = "none";
    editorBtn.classList.add("active");
    previewBtn.classList.remove("active");
  }
}

/**
 * Insert markdown syntax
 */
export function insertMarkdown(syntax) {
  const textarea = document.getElementById("note-content-input");
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  let newText = "";
  let cursorOffset = 0;

  switch (syntax) {
    case "bold":
      newText = `**${selectedText || "text"}**`;
      cursorOffset = selectedText ? newText.length : 2;
      break;
    case "italic":
      newText = `*${selectedText || "text"}*`;
      cursorOffset = selectedText ? newText.length : 1;
      break;
    case "strike":
      newText = `~~${selectedText || "text"}~~`;
      cursorOffset = selectedText ? newText.length : 2;
      break;
    case "link":
      newText = selectedText ? `[${selectedText}](url)` : "[link text](url)";
      cursorOffset = selectedText ? newText.length - 4 : 1;
      break;
    case "checkbox":
      newText = `[ ] ${selectedText || "Todo item"}`;
      cursorOffset = newText.length;
      break;
  }

  textarea.value =
    textarea.value.substring(0, start) +
    newText +
    textarea.value.substring(end);

  textarea.focus();
  textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);

  updateCharCount();
}

/**
 * Update character count
 */
export function updateCharCount() {
  const textarea = document.getElementById("note-content-input");
  const counter = document.getElementById("note-char-count");

  if (textarea && counter) {
    const length = textarea.value.length;
    counter.textContent = `${length} ký tự`;
  }
}

/**
 * Setup notes listeners
 */
export function setupNotesListeners() {
  // Create note button
  const createBtn = document.getElementById("create-note-btn");
  if (createBtn) {
    createBtn.addEventListener("click", () => openNoteModal());
  }

  // Close modal buttons
  const closeBtn = document.getElementById("close-note-modal-btn");
  const cancelBtn = document.getElementById("cancel-note-btn");
  const overlay = document.getElementById("note-modal-overlay");

  if (closeBtn) closeBtn.addEventListener("click", closeNoteModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeNoteModal);
  if (overlay) overlay.addEventListener("click", closeNoteModal);

  // Save note button
  const saveBtn = document.getElementById("save-note-btn");
  if (saveBtn) saveBtn.addEventListener("click", saveNote);

  // Toolbar buttons
  const boldBtn = document.getElementById("format-bold-btn");
  const italicBtn = document.getElementById("format-italic-btn");
  const strikeBtn = document.getElementById("format-strike-btn");
  const linkBtn = document.getElementById("format-link-btn");
  const checkboxBtn = document.getElementById("format-checkbox-btn");

  if (boldBtn) boldBtn.addEventListener("click", () => insertMarkdown("bold"));
  if (italicBtn)
    italicBtn.addEventListener("click", () => insertMarkdown("italic"));
  if (strikeBtn)
    strikeBtn.addEventListener("click", () => insertMarkdown("strike"));
  if (linkBtn) linkBtn.addEventListener("click", () => insertMarkdown("link"));
  if (checkboxBtn)
    checkboxBtn.addEventListener("click", () => insertMarkdown("checkbox"));

  // Preview toggle
  const editorModeBtn = document.getElementById("editor-mode-btn");
  const previewModeBtn = document.getElementById("preview-mode-btn");

  if (editorModeBtn)
    editorModeBtn.addEventListener("click", () => togglePreview("editor"));
  if (previewModeBtn)
    previewModeBtn.addEventListener("click", () => togglePreview("preview"));

  // Content input change
  const contentInput = document.getElementById("note-content-input");
  if (contentInput) {
    contentInput.addEventListener("input", updateCharCount);
  }

  // Filter buttons
  const filterButtons = document.querySelectorAll(".notes-filter-btn");
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilterType = btn.dataset.filter;
      renderSmartNotes();
    });
  });

  // Search input
  const searchInput = document.getElementById("notes-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearchQuery = e.target.value.trim();
      renderSmartNotes();
    });
  }

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    const modal = document.getElementById("note-modal");

    // ESC to close modal
    if (e.key === "Escape" && modal?.classList.contains("active")) {
      closeNoteModal();
    }

    // Ctrl+S to save note
    if (e.ctrlKey && e.key === "s" && modal?.classList.contains("active")) {
      e.preventDefault();
      saveNote();
    }
  });
}
