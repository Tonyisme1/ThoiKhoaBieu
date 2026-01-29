/**
 * ASSIGNMENTS MODULE
 * Assignment and deadline management
 */

let appData = null;
let saveDataCallback = null;

export function initAssignments(data, saveCallback) {
  appData = data;
  saveDataCallback = saveCallback;

  setupAssignmentEvents();
  renderAssignments();
}

function setupAssignmentEvents() {
  const btnAddAssignment = document.getElementById("btn-add-assignment");
  const assignmentModal = document.getElementById("assignment-modal");
  const btnSaveAssignment = document.getElementById("btn-save-assignment");
  const assignmentFilter = document.getElementById("assignment-filter");
  const assignmentSort = document.getElementById("assignment-sort");

  if (btnAddAssignment) {
    btnAddAssignment.addEventListener("click", () => {
      openAssignmentModal();
    });
  }

  if (btnSaveAssignment) {
    btnSaveAssignment.addEventListener("click", () => {
      saveAssignment();
      assignmentModal.close();
      renderAssignments();
    });
  }

  if (assignmentFilter) {
    assignmentFilter.addEventListener("change", renderAssignments);
  }
  if (assignmentSort) {
    assignmentSort.addEventListener("change", renderAssignments);
  }
}

function openAssignmentModal(assignmentId = null) {
  const modal = document.getElementById("assignment-modal");
  const modalTitle = document.getElementById("assignment-modal-title");
  const courseSelect = document.getElementById("assignment-course");
  const titleInput = document.getElementById("assignment-title");
  const descInput = document.getElementById("assignment-description");
  const deadlineInput = document.getElementById("assignment-deadline");
  const prioritySelect = document.getElementById("assignment-priority");

  courseSelect.innerHTML = '<option value="">-- Select Course --</option>';
  appData.courses.forEach((course) => {
    const option = document.createElement("option");
    option.value = course.id;
    option.textContent = course.name;
    courseSelect.appendChild(option);
  });

  if (assignmentId) {
    const assignment = appData.assignments.find((a) => a.id === assignmentId);
    if (assignment) {
      modalTitle.textContent = "Edit Assignment";
      courseSelect.value = assignment.courseId;
      titleInput.value = assignment.title;
      descInput.value = assignment.description || "";
      deadlineInput.value = assignment.deadline;
      prioritySelect.value = assignment.priority;
      modal.dataset.editId = assignmentId;
    }
  } else {
    modalTitle.textContent = "Add New Assignment";
    titleInput.value = "";
    descInput.value = "";
    deadlineInput.value = "";
    prioritySelect.value = "medium";
    delete modal.dataset.editId;
  }

  modal.showModal();
}

function saveAssignment() {
  const modal = document.getElementById("assignment-modal");
  const courseId = document.getElementById("assignment-course").value;
  const title = document.getElementById("assignment-title").value.trim();
  const description = document
    .getElementById("assignment-description")
    .value.trim();
  const deadline = document.getElementById("assignment-deadline").value;
  const priority = document.getElementById("assignment-priority").value;

  if (!courseId || !title || !deadline) {
    alert("Please fill in all required fields!");
    return;
  }

  const course = appData.courses.find((c) => c.id === courseId);
  const courseName = course ? course.name : "Unknown";
  const editId = modal.dataset.editId;

  if (editId) {
    const assignment = appData.assignments.find((a) => a.id === editId);
    if (assignment) {
      assignment.courseId = courseId;
      assignment.courseName = courseName;
      assignment.title = title;
      assignment.description = description;
      assignment.deadline = deadline;
      assignment.priority = priority;
    }
  } else {
    const newAssignment = {
      id: Date.now().toString(),
      courseId,
      courseName,
      title,
      description,
      deadline,
      completed: false,
      priority,
      createdAt: new Date().toISOString(),
    };
    appData.assignments.push(newAssignment);
  }

  saveDataCallback();
}

function deleteAssignment(id) {
  if (confirm("Are you sure you want to delete this assignment?")) {
    appData.assignments = appData.assignments.filter((a) => a.id !== id);
    saveDataCallback();
    renderAssignments();
  }
}

function toggleAssignmentComplete(id) {
  const assignment = appData.assignments.find((a) => a.id === id);
  if (assignment) {
    assignment.completed = !assignment.completed;
    saveDataCallback();
    renderAssignments();
  }
}

export function renderAssignments() {
  const container = document.getElementById("assignments-list");
  const filterValue =
    document.getElementById("assignment-filter")?.value || "all";
  const sortValue =
    document.getElementById("assignment-sort")?.value || "deadline";

  if (!container) return;

  let filtered = [...appData.assignments];
  const now = new Date();

  if (filterValue === "active") {
    filtered = filtered.filter((a) => !a.completed);
  } else if (filterValue === "completed") {
    filtered = filtered.filter((a) => a.completed);
  } else if (filterValue === "overdue") {
    filtered = filtered.filter(
      (a) => !a.completed && new Date(a.deadline) < now,
    );
  }

  if (sortValue === "deadline") {
    filtered.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  } else if (sortValue === "course") {
    filtered.sort((a, b) => a.courseName.localeCompare(b.courseName));
  } else if (sortValue === "priority") {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    filtered.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );
  }

  updateAssignmentStats();

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">No assignments yet</div>';
    return;
  }

  container.innerHTML = "";
  filtered.forEach((assignment) => {
    const card = createAssignmentCard(assignment);
    container.appendChild(card);
  });
}

function createAssignmentCard(assignment) {
  const card = document.createElement("div");
  card.className = "assignment-card";
  if (assignment.completed) card.classList.add("completed");

  const deadline = new Date(assignment.deadline);
  const now = new Date();
  const diffTime = deadline - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let deadlineClass = "";
  let deadlineText = "";

  if (assignment.completed) {
    deadlineClass = "deadline-completed";
    deadlineText = "Completed";
  } else if (diffDays < 0) {
    deadlineClass = "deadline-overdue";
    deadlineText = `Overdue ${Math.abs(diffDays)} days`;
  } else if (diffDays === 0) {
    deadlineClass = "deadline-today";
    deadlineText = "Today";
  } else if (diffDays === 1) {
    deadlineClass = "deadline-tomorrow";
    deadlineText = "Tomorrow";
  } else if (diffDays <= 3) {
    deadlineClass = "deadline-urgent";
    deadlineText = `${diffDays} days left`;
  } else if (diffDays <= 7) {
    deadlineClass = "deadline-soon";
    deadlineText = `${diffDays} days left`;
  } else {
    deadlineClass = "deadline-normal";
    deadlineText = `${diffDays} days left`;
  }

  const priorityLabels = { high: "High", medium: "Medium", low: "Low" };

  card.innerHTML = `
    <div class="assignment-header">
      <div class="assignment-checkbox">
        <input type="checkbox" ${assignment.completed ? "checked" : ""} 
          onchange="window.toggleAssignmentComplete('${assignment.id}')"/>
      </div>
      <div class="assignment-info">
        <div class="assignment-title">${assignment.title}</div>
        <div class="assignment-course">${assignment.courseName}</div>
      </div>
      <div class="assignment-badges">
        <span class="priority-badge priority-${assignment.priority}">${priorityLabels[assignment.priority]}</span>
        <span class="deadline-badge ${deadlineClass}">${deadlineText}</span>
      </div>
    </div>
    ${assignment.description ? `<div class="assignment-description">${assignment.description}</div>` : ""}
    <div class="assignment-footer">
      <div class="assignment-deadline-full">Due: ${formatDeadline(deadline)}</div>
      <div class="assignment-actions">
        <button class="btn-icon" onclick="window.openAssignmentModal('${assignment.id}')" title="Edit">
          <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-icon" onclick="window.deleteAssignment('${assignment.id}')" title="Delete">
          <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `;

  return card;
}

function formatDeadline(date) {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function updateAssignmentStats() {
  const total = appData.assignments.length;
  const completed = appData.assignments.filter((a) => a.completed).length;
  const active = total - completed;
  const now = new Date();
  const overdue = appData.assignments.filter(
    (a) => !a.completed && new Date(a.deadline) < now,
  ).length;

  const elTotal = document.getElementById("total-assignments");
  const elActive = document.getElementById("active-assignments");
  const elCompleted = document.getElementById("completed-assignments");
  const elOverdue = document.getElementById("overdue-assignments");

  if (elTotal) elTotal.textContent = total;
  if (elActive) elActive.textContent = active;
  if (elCompleted) elCompleted.textContent = completed;
  if (elOverdue) elOverdue.textContent = overdue;
}

// Expose to window
window.openAssignmentModal = openAssignmentModal;
window.deleteAssignment = deleteAssignment;
window.toggleAssignmentComplete = toggleAssignmentComplete;
