/**
 * SMART NOTES UI MODULE
 * Manage UI and events for smart notes system
 */

import {
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
  const grid = document.getElementById("smart-notes-list");
  const emptyState = document.getElementById("notes-empty-state");

  if (!grid) {
    return;
  }

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
    grid.style.display = "none";
    if (emptyState) {
      emptyState.style.display = "flex";
      const pEl = emptyState.querySelector("p");
      if (pEl) {
        pEl.textContent =
          currentFilterType !== "all" || currentSearchQuery
            ? "No matching notes found"
            : 'Click "+ New Note" to create your first note';
      }
    }
    return;
  }

  // Has notes - show grid, hide empty state
  grid.style.display = "grid";
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
  const titleInput = document.getElementById("note-title");
  const contentInput = document.getElementById("note-content");
  const tagsInput = document.getElementById("note-tags");
  const colorInput = document.getElementById("note-color");
  const pinnedCheckbox = document.getElementById("note-pinned");
  const modalTitle = document.getElementById("note-modal-title");

  if (!modal) {
    return;
  }

  // Reset form
  if (titleInput) titleInput.value = "";
  if (contentInput) contentInput.value = "";
  if (tagsInput) tagsInput.value = "";
  if (colorInput) colorInput.value = "#60a5fa";
  if (pinnedCheckbox) pinnedCheckbox.checked = false;

  // Set type to normal by default
  const normalTypeRadio = document.querySelector(
    'input[name="note-type"][value="normal"]',
  );
  if (normalTypeRadio) normalTypeRadio.checked = true;

  // If editing existing note
  if (existingNote) {
    if (modalTitle) modalTitle.textContent = "Edit Note";
    if (titleInput) titleInput.value = existingNote.title;
    if (contentInput) contentInput.value = existingNote.content;
    if (tagsInput) tagsInput.value = existingNote.tags.join(" ");
    if (colorInput) colorInput.value = existingNote.color || "#60a5fa";
    if (pinnedCheckbox) pinnedCheckbox.checked = existingNote.pinned || false;

    if (existingNote.type === "todo") {
      const todoTypeRadio = document.querySelector(
        'input[name="note-type"][value="todo"]',
      );
      if (todoTypeRadio) todoTypeRadio.checked = true;
    }

    // Store note ID for update
    modal.dataset.editId = existingNote.id;
  } else {
    if (modalTitle) modalTitle.textContent = "Create New Note";
    delete modal.dataset.editId;
  }

  updateCharCount();

  modal.showModal();

  if (titleInput) titleInput.focus();
}

/**
 * Close note modal
 */
export function closeNoteModal() {
  const modal = document.getElementById("note-modal");

  if (modal) {
    modal.close();
    delete modal.dataset.editId;
  }
}

/**
 * Save note
 */
export function saveNote() {
  const modal = document.getElementById("note-modal");
  const titleEl = document.getElementById("note-title");
  const contentEl = document.getElementById("note-content");
  const tagsEl = document.getElementById("note-tags");
  const colorEl = document.getElementById("note-color");
  const pinnedEl = document.getElementById("note-pinned");
  const todoTypeEl = document.querySelector(
    'input[name="note-type"][value="todo"]',
  );

  const title = titleEl?.value.trim() || "";
  const content = contentEl?.value.trim() || "";
  const tagsInput = tagsEl?.value.trim() || "";
  const color = colorEl?.value || "#60a5fa";
  const pinned = pinnedEl?.checked || false;
  const type = todoTypeEl?.checked ? "todo" : "normal";

  // Validation
  if (!title) {
    alert("Please enter a note title");
    return;
  }

  if (!content) {
    alert("Please enter note content");
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
  if (!confirm("Are you sure you want to delete this note?")) return;

  appData.smartNotes = appData.smartNotes.filter((n) => n.id !== noteId);
  saveDataCallback();
  renderSmartNotes();
}

/**
 * Update character count
 */
export function updateCharCount() {
  const textarea = document.getElementById("note-content");
  const counter = document.getElementById("note-char-count");

  if (textarea && counter) {
    const length = textarea.value.length;
    counter.textContent = `${length} characters`;
  }
}

/**
 * Setup notes listeners
 */
export function setupNotesListeners() {
  // Create note button
  const createBtn = document.getElementById("btn-add-note");

  if (createBtn) {
    createBtn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      openNoteModal();
    };
  }

  // Close modal buttons
  const closeBtn = document.getElementById("btn-close-note-modal");
  const cancelBtn = document.getElementById("btn-cancel-note");

  if (closeBtn) {
    closeBtn.onclick = function () {
      closeNoteModal();
    };
  }
  if (cancelBtn) {
    cancelBtn.onclick = function () {
      closeNoteModal();
    };
  }

  // Save note button - use onclick
  const saveBtn = document.getElementById("btn-save-note");

  if (saveBtn) {
    saveBtn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      saveNote();
    };
  }

  // Content input change
  const contentInput = document.getElementById("note-content");
  if (contentInput) {
    contentInput.addEventListener("input", updateCharCount);
  }

  // Filter select
  const filterSelect = document.getElementById("notes-filter");
  if (filterSelect) {
    filterSelect.addEventListener("change", (e) => {
      currentFilterType = e.target.value;
      renderSmartNotes();
    });
  }

  // Search input
  const searchInput = document.getElementById("notes-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearchQuery = e.target.value.trim();
      renderSmartNotes();
    });
  }
}
