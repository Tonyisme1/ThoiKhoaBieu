/**
 * EXAMS MODULE
 * Exam schedule management
 */

let appData = null;
let saveDataCallback = null;

export function initExams(data, saveCallback) {
  appData = data;
  saveDataCallback = saveCallback;

  setupExamEvents();
  renderExams();
}

function setupExamEvents() {
  const btnAddExam = document.getElementById("btn-add-exam");
  const examModal = document.getElementById("exam-modal");
  const btnSaveExam = document.getElementById("btn-save-exam");
  const examFilter = document.getElementById("exam-filter");
  const examSort = document.getElementById("exam-sort");

  if (btnAddExam) {
    btnAddExam.addEventListener("click", () => openExamModal());
  }

  if (btnSaveExam) {
    btnSaveExam.addEventListener("click", () => {
      saveExam();
      examModal.close();
      renderExams();
    });
  }

  if (examFilter) {
    examFilter.addEventListener("change", renderExams);
  }
  if (examSort) {
    examSort.addEventListener("change", renderExams);
  }
}

function openExamModal(examId = null) {
  const modal = document.getElementById("exam-modal");
  const modalTitle = document.getElementById("exam-modal-title");
  const courseSelect = document.getElementById("exam-course");
  const titleInput = document.getElementById("exam-title");
  const dateInput = document.getElementById("exam-date");
  const durationInput = document.getElementById("exam-duration");
  const roomInput = document.getElementById("exam-room");
  const formatSelect = document.getElementById("exam-format");
  const notesInput = document.getElementById("exam-notes");

  courseSelect.innerHTML = '<option value="">-- Select Course --</option>';
  appData.courses.forEach((course) => {
    const option = document.createElement("option");
    option.value = course.id;
    option.textContent = course.name;
    courseSelect.appendChild(option);
  });

  if (examId) {
    const exam = appData.exams.find((e) => e.id === examId);
    if (exam) {
      modalTitle.textContent = "Edit Exam";
      courseSelect.value = exam.courseId;
      titleInput.value = exam.title;
      dateInput.value = exam.date;
      durationInput.value = exam.duration;
      roomInput.value = exam.room || "";
      formatSelect.value = exam.format;
      notesInput.value = exam.notes || "";
      modal.dataset.editId = examId;
    }
  } else {
    modalTitle.textContent = "Add New Exam";
    titleInput.value = "";
    dateInput.value = "";
    durationInput.value = "90";
    roomInput.value = "";
    formatSelect.value = "written";
    notesInput.value = "";
    delete modal.dataset.editId;
  }

  modal.showModal();
}

function saveExam() {
  const modal = document.getElementById("exam-modal");
  const courseId = document.getElementById("exam-course").value;
  const title = document.getElementById("exam-title").value.trim();
  const date = document.getElementById("exam-date").value;
  const duration = parseInt(document.getElementById("exam-duration").value);
  const room = document.getElementById("exam-room").value.trim();
  const format = document.getElementById("exam-format").value;
  const notes = document.getElementById("exam-notes").value.trim();

  if (!courseId || !title || !date) {
    alert("Please fill in all required fields!");
    return;
  }

  const course = appData.courses.find((c) => c.id === courseId);
  const courseName = course ? course.name : "Unknown";
  const editId = modal.dataset.editId;

  if (editId) {
    const exam = appData.exams.find((e) => e.id === editId);
    if (exam) {
      exam.courseId = courseId;
      exam.courseName = courseName;
      exam.title = title;
      exam.date = date;
      exam.duration = duration;
      exam.room = room;
      exam.format = format;
      exam.notes = notes;
    }
  } else {
    const newExam = {
      id: Date.now().toString(),
      courseId,
      courseName,
      title,
      date,
      duration,
      room,
      format,
      notes,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    appData.exams.push(newExam);
  }

  saveDataCallback();
}

function deleteExam(id) {
  if (confirm("Are you sure you want to delete this exam?")) {
    appData.exams = appData.exams.filter((e) => e.id !== id);
    saveDataCallback();
    renderExams();
  }
}

function toggleExamComplete(id) {
  const exam = appData.exams.find((e) => e.id === id);
  if (exam) {
    exam.completed = !exam.completed;
    saveDataCallback();
    renderExams();
  }
}

export function renderExams() {
  const container = document.getElementById("exams-list");
  const filterValue = document.getElementById("exam-filter")?.value || "all";
  const sortValue = document.getElementById("exam-sort")?.value || "date";

  if (!container) return;

  let filtered = [...appData.exams];
  const now = new Date();

  if (filterValue === "upcoming") {
    filtered = filtered.filter((e) => !e.completed && new Date(e.date) >= now);
  } else if (filterValue === "completed") {
    filtered = filtered.filter((e) => e.completed);
  }

  if (sortValue === "date") {
    filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
  } else if (sortValue === "course") {
    filtered.sort((a, b) => a.courseName.localeCompare(b.courseName));
  }

  updateExamStats();

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">No exams scheduled</div>';
    return;
  }

  container.innerHTML = "";
  filtered.forEach((exam) => {
    const card = createExamCard(exam);
    container.appendChild(card);
  });
}

function createExamCard(exam) {
  const card = document.createElement("div");
  card.className = "exam-card";
  if (exam.completed) card.classList.add("completed");

  const examDate = new Date(exam.date);
  const now = new Date();
  const diffTime = examDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let dateClass = "";
  let dateText = "";

  if (exam.completed) {
    dateClass = "exam-completed";
    dateText = "Completed";
  } else if (diffDays < 0) {
    dateClass = "exam-passed";
    dateText = `Passed ${Math.abs(diffDays)} days ago`;
  } else if (diffDays === 0) {
    dateClass = "exam-today";
    dateText = "Today";
  } else if (diffDays === 1) {
    dateClass = "exam-tomorrow";
    dateText = "Tomorrow";
  } else if (diffDays <= 3) {
    dateClass = "exam-urgent";
    dateText = `${diffDays} days left`;
  } else if (diffDays <= 7) {
    dateClass = "exam-soon";
    dateText = `${diffDays} days left`;
  } else {
    dateClass = "exam-normal";
    dateText = `${diffDays} days left`;
  }

  const formatLabels = {
    written: "Written",
    test: "Multiple Choice",
    online: "Online",
    practical: "Practical",
    other: "Other",
  };

  card.innerHTML = `
    <div class="exam-header">
      <div class="exam-checkbox">
        <input type="checkbox" ${exam.completed ? "checked" : ""} 
          onchange="window.toggleExamComplete('${exam.id}')"/>
      </div>
      <div class="exam-info">
        <div class="exam-title">${exam.title}</div>
        <div class="exam-course">${exam.courseName}</div>
      </div>
      <div class="exam-badges">
        <span class="format-badge format-${exam.format}">${formatLabels[exam.format]}</span>
        <span class="exam-date-badge ${dateClass}">${dateText}</span>
      </div>
    </div>
    <div class="exam-details">
      <div class="exam-detail-item">
        <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span>${formatExamDate(examDate)}</span>
      </div>
      <div class="exam-detail-item">
        <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span>${exam.duration} minutes</span>
      </div>
      ${
        exam.room
          ? `
      <div class="exam-detail-item">
        <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span>Room ${exam.room}</span>
      </div>`
          : ""
      }
    </div>
    ${exam.notes ? `<div class="exam-notes">${exam.notes}</div>` : ""}
    <div class="exam-footer">
      <div class="exam-actions">
        <button class="btn-icon" onclick="window.openExamModal('${exam.id}')" title="Edit">
          <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-icon" onclick="window.deleteExam('${exam.id}')" title="Delete">
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

function formatExamDate(date) {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekday = weekdays[date.getDay()];
  return `${weekday}, ${day}/${month}/${year} - ${hours}:${minutes}`;
}

function updateExamStats() {
  const total = appData.exams.length;
  const completed = appData.exams.filter((e) => e.completed).length;
  const now = new Date();
  const upcoming = appData.exams.filter(
    (e) => !e.completed && new Date(e.date) >= now,
  ).length;

  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const thisWeek = appData.exams.filter((e) => {
    const examDate = new Date(e.date);
    return !e.completed && examDate >= startOfWeek && examDate < endOfWeek;
  }).length;

  const elTotal = document.getElementById("total-exams");
  const elUpcoming = document.getElementById("upcoming-exams");
  const elThisWeek = document.getElementById("this-week-exams");
  const elCompleted = document.getElementById("completed-exams");

  if (elTotal) elTotal.textContent = total;
  if (elUpcoming) elUpcoming.textContent = upcoming;
  if (elThisWeek) elThisWeek.textContent = thisWeek;
  if (elCompleted) elCompleted.textContent = completed;
}

// Expose to window
window.openExamModal = openExamModal;
window.deleteExam = deleteExam;
window.toggleExamComplete = toggleExamComplete;
