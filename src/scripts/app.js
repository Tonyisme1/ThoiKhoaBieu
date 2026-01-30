/**
 * MAIN CONTROLLER
 * Orchestrates data flow and events across all modules.
 */

import {
  getRealWeekFromDate,
  setSystemConfig,
  getDatesForWeek,
  getDatesForWeekISO,
  getPeriodTime,
} from "./core/core.js";
import {
  initGridStructure,
  renderGridHeader,
  renderWeekNavigation,
  setActiveWeek,
  renderSchedule,
  renderNotes,
  renderWeekSelector,
  getSelectedWeeksFromUI,
  renderCourseListTable,
} from "./core/ui.js";
import { initNotesUI } from "./modules/notes-ui.js";
import { initAssignments, renderAssignments } from "./modules/assignments.js";
import { initExams, renderExams } from "./modules/exams.js";
import { initAttendance, renderAttendance } from "./modules/attendance.js";
import { initDashboard, renderDashboard } from "./modules/dashboard.js";
import {
  initHolidays,
  checkAndDisplayHoliday,
  renderHolidayList,
} from "./modules/holidays.js";
import { initMobileMenu } from "./modules/mobile-menu.js";
import { initWeekSlider, setSelectedWeek } from "./modules/week-slider.js";
import { initHeaderTabs, syncWithTab } from "./modules/header-tabs.js";
import toast from "./modules/toast.js";

// --- STATE ---
let appData = {
  courses: [], // { id, name, day, room, teacher, weeks: [] }
  holidays: [], // { name, weeks: [] }
  favorites: [], // Array of course IDs that are bookmarked
  assignments: [], // { id, courseId, courseName, title, description, deadline, completed, priority, createdAt }
  exams: [], // { id, courseId, courseName, title, date, duration, room, format, notes, completed, createdAt }
  attendance: {}, // { courseId: { 'YYYY-MM-DD': { status: 'present'|'absent'|'late', note: '' } } }
  smartNotes: [], // { id, title, content, type: 'normal'|'todo', tags: [], color, pinned, createdAt, updatedAt }
  settings: {
    startDate: "2026-01-26", // Default
    startWeek: 22, // Default
  },
  theme: "light", // Add theme property
  generalNotes: "", // New property for general notes
};
let currentViewWeek = appData.settings.startWeek; // Default week
const TOTAL_WEEKS_RENDER = 26; // Render from week 22 -> 47

// --- DOM ELEMENTS ---
const inputSidebar = document.getElementById("input-sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const holidayModal = document.getElementById("holiday-modal");
const settingsModal = document.getElementById("settings-modal");
const holidayBanner = document.getElementById("holiday-banner");
const editIdInput = document.getElementById("edit-course-id");
const modalTitle = document.getElementById("modal-title");
const btnSave = document.getElementById("btn-save");
const btnDelete = document.getElementById("btn-delete");
const btnSaveSettings = document.getElementById("btn-save-settings");
const notesTextarea = document.getElementById("general-notes-textarea");

// --- 1. INIT (INITIALIZATION) ---
function init() {
  // Load Data
  const stored = localStorage.getItem("smartTimetableData");
  if (stored) {
    try {
      const parsedData = JSON.parse(stored);
      // Merge: Keep old data and add settings if available
      appData = { ...appData, ...parsedData };

      // Patch logic: If old data doesn't have new keys, add them
      if (!appData.holidays) appData.holidays = [];
      if (!appData.assignments) appData.assignments = [];
      if (!appData.exams) appData.exams = [];
      if (!appData.attendance) appData.attendance = {};
      if (!appData.smartNotes) appData.smartNotes = [];
      if (!appData.settings) {
        appData.settings = { startDate: "2026-01-26", startWeek: 22 };
      }
      if (!appData.generalNotes) appData.generalNotes = "";
      if (!appData.theme) appData.theme = "light";
    } catch (e) {
      console.error("Error parsing stored data, using default:", e);
      appData = {
        courses: [],
        holidays: [],
        assignments: [],
        exams: [],
        attendance: {},
        settings: { startDate: "2026-01-26", startWeek: 22 },
        theme: "light",
        generalNotes: "",
      };
    }
  }

  // Apply initial theme
  document.documentElement.setAttribute("data-theme", appData.theme);

  // Apply initial settings
  setSystemConfig(appData.settings.startDate, appData.settings.startWeek);
  currentViewWeek = appData.settings.startWeek; // Update current week from config

  // Load initial notes
  if (notesTextarea) {
    notesTextarea.value = appData.generalNotes;
  }

  // Render Skeleton
  initGridStructure();
  renderWeekNavigation(TOTAL_WEEKS_RENDER, currentViewWeek);

  // Initialize modules first (before rendering)
  initAssignments(appData, saveData);
  initExams(appData, saveData);
  initAttendance(appData, saveData);
  initNotesUI(appData, saveData);
  initDashboard(appData);
  initHolidays(appData, saveData);

  // Initialize mobile menu
  initMobileMenu();

  // Initialize header tabs for desktop
  initHeaderTabs((tabName) => {
    switchToTab(tabName);
  });

  // Initialize week slider
  initWeekSlider(TOTAL_WEEKS_RENDER, currentViewWeek, (weekNum) => {
    currentViewWeek = weekNum;
    renderAllViews();
  });

  // Render Data
  renderAllViews();

  // Setup Events
  setupEventListeners();

  // Setup tooltip hover behavior to keep tooltip when hovering on it
  const tooltip = document.getElementById("course-detail-tooltip");
  if (tooltip) {
    tooltip.addEventListener("mouseenter", cancelCloseDetail);
    tooltip.addEventListener("mouseleave", scheduleCloseDetail);
  }
}

/**
 * Attach events for card/table
 */
let detailModalTimeout = null;

function scheduleCloseDetail() {
  if (detailModalTimeout) clearTimeout(detailModalTimeout);
  detailModalTimeout = setTimeout(() => {
    closeCourseDetails();
    detailModalTimeout = null;
  }, 300);
}

function cancelCloseDetail() {
  if (detailModalTimeout) {
    clearTimeout(detailModalTimeout);
    detailModalTimeout = null;
  }
}

function attachEditEvents() {
  // 0. Favorite toggle
  document.querySelectorAll(".btn-favorite").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const courseId = parseInt(btn.dataset.courseId);
      toggleFavorite(courseId);
    });
  });

  // 1. Hover card/note -> show detail tooltip
  document.querySelectorAll(".course-card, .note-card").forEach((card) => {
    card.addEventListener("mouseenter", () => {
      cancelCloseDetail();
      const id = parseFloat(card.dataset.id);
      const course = appData.courses.find((c) => c.id === id);
      if (course) showCourseDetails(course, card);
    });
    card.addEventListener("mouseleave", () => {
      scheduleCloseDetail();
    });
  });

  // 2. Edit in table
  document.querySelectorAll(".btn-edit-row").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = parseFloat(btn.dataset.id);
      const course = appData.courses.find((c) => c.id === id);
      if (course) openSidebarToEdit(course);
    });
  });

  // 3. Delete in table
  document.querySelectorAll(".btn-delete-row").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = parseFloat(btn.dataset.id);
      const course = appData.courses.find((c) => c.id === id);
      if (
        confirm(
          `Delete "${course?.name || "this course"}"?\nThis action cannot be undone.`,
        )
      ) {
        appData.courses = appData.courses.filter((c) => c.id !== id);
        saveAndRender();
        toast.success("Deleted", "Course removed successfully");
      }
    });
  });
}

/**
 * Render entire screen (Grid + Notes + Holiday Banner)
 */
function renderAllViews() {
  // 1. Separate courses vs Notes
  const timedCourses = appData.courses.filter((c) => c.day !== 0);
  const noteCourses = appData.courses.filter((c) => c.day === 0);

  // 2. Render UI
  renderGridHeader(currentViewWeek); // Render header with dates
  renderSchedule(timedCourses, currentViewWeek);
  renderNotes(noteCourses);
  renderNotes(noteCourses, "notes-list-2"); // Render notes for notes tab
  renderCourseListTable(appData.courses);

  // 3. Display holiday notification logic
  checkAndDisplayHoliday(currentViewWeek);

  // 4. Attach Click-to-Edit events
  attachEditEvents();

  // 5. Update favorite button states
  updateFavoriteButtons();

  // 6. Render dashboard analytics
  renderDashboard(currentViewWeek);

  // 7. Sync week dropdowns
  syncWeekDropdowns();
}

/**
 * Helper: Convert date from VN (26/01/2026) to Input (2026-01-26)
 */
function convertDateToISO(dateStr) {
  if (!dateStr) return "";
  // If already in ISO format
  if (dateStr.includes("-")) return dateStr;
  // Convert from dd/mm/yyyy to yyyy-mm-dd
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

/**
 * Search through courses and display results
 */
function performSearch(query) {
  const searchResults = document.getElementById("search-results");
  if (!searchResults) return;

  // Filter courses based on query
  const results = appData.courses.filter((course) => {
    const searchableText =
      `${course.name} ${course.teacher} ${course.room}`.toLowerCase();
    return searchableText.includes(query);
  });

  if (results.length === 0) {
    searchResults.innerHTML = `<div class="search-result-item" style="cursor: default;">No results found</div>`;
    searchResults.style.display = "block";
    return;
  }

  searchResults.innerHTML = results
    .slice(0, 8)
    .map(
      (course) => `
    <div class="search-result-item" data-course-id="${course.id}">
      <div>
        <div class="search-result-name">${course.name}</div>
        <div class="search-result-meta">Instructor: ${course.teacher} | Room: ${course.room}</div>
      </div>
      <div class="search-result-badge">Week ${course.weeks[0] || "?"}</div>
    </div>
  `,
    )
    .join("");

  // Add click handlers to navigate to course
  searchResults.querySelectorAll(".search-result-item").forEach((item) => {
    item.addEventListener("click", () => {
      const courseId = item.dataset.courseId;
      const course = appData.courses.find((c) => c.id == courseId);
      if (course && course.weeks && course.weeks.length > 0) {
        currentViewWeek = course.weeks[0];
        setActiveWeek(currentViewWeek);
        renderAllViews();
        searchResults.style.display = "none";
        document.getElementById("search-input").value = "";
        // Scroll to course in the timetable
        setTimeout(() => {
          const courseCard = document.querySelector(
            `[data-course-id="${courseId}"]`,
          );
          if (courseCard)
            courseCard.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
      }
    });
  });

  searchResults.style.display = "block";
}

/**
 * Toggle course as favorite/bookmark
 */
function toggleFavorite(courseId) {
  const idx = appData.favorites.indexOf(courseId);
  if (idx > -1) {
    appData.favorites.splice(idx, 1);
  } else {
    appData.favorites.push(courseId);
  }
  saveData();
  updateFavoriteButtons();
}

/**
 * Update favorite button states
 */
function updateFavoriteButtons() {
  document.querySelectorAll(".btn-favorite").forEach((btn) => {
    const courseId = parseInt(btn.dataset.courseId);
    if (appData.favorites.includes(courseId)) {
      btn.classList.add("active");
      btn.textContent = "★";
    } else {
      btn.classList.remove("active");
      btn.textContent = "☆";
    }
  });
}

function openSidebar() {
  inputSidebar.classList.add("is-open");
  sidebarOverlay.classList.add("is-open");
}

function closeSidebar() {
  inputSidebar.classList.remove("is-open");
  sidebarOverlay.classList.remove("is-open");
}

function openSidebarToAdd() {
  inputSidebar.querySelector("form").reset();
  editIdInput.value = "";
  modalTitle.textContent = "Add New Course";
  btnSave.textContent = "Save Course";
  btnDelete.style.display = "none";

  // Render empty week selector
  renderWeekSelector([]);
  openSidebar();
}

function openSidebarToEdit(course) {
  // 1. Fill in basic information
  document.getElementById("subject-name").value = course.name;
  document.getElementById("day-select").value = course.day;
  document.getElementById("room-name").value = course.room || "";
  document.getElementById("teacher-name").value = course.teacher || "";
  document.getElementById("start-period").value = course.startPeriod || 1;
  document.getElementById("period-count").value = course.periodCount || 3;
  document.getElementById("week-range").value = course.weekString || "";
  document.getElementById("course-color").value = course.color || "#3b82f6";

  // Load notes if available
  const notesInput = document.getElementById("course-notes");
  if (notesInput) notesInput.value = course.notes || "";

  // 2. Handle dates
  const startDateInput = document.getElementById("start-date-picker");
  const endDateInput = document.getElementById("end-date-picker");

  if (startDateInput && endDateInput) {
    startDateInput.value = "";
    endDateInput.value = "";
    if (course.startDate) {
      startDateInput.value = convertDateToISO(course.startDate);
    }
    if (course.endDate) {
      endDateInput.value = convertDateToISO(course.endDate);
    }
  }

  // 3. Setup Edit Mode
  editIdInput.value = course.id;
  modalTitle.textContent = "Edit Course";
  btnSave.textContent = "Update";
  btnDelete.style.display = "block";

  // 4. Render week selector
  renderWeekSelector(course.weeks);

  openSidebar();
}

function showCourseDetails(course, targetElement) {
  if (!course) return;
  const tooltip = document.getElementById("course-detail-tooltip");
  if (!tooltip) return;

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayLabel =
    course.day === 0
      ? "Flexible / Note"
      : course.day === 8
        ? "Sunday"
        : dayNames[course.day - 2] || `Day ${course.day}`;
  const periodLabel =
    course.day === 0
      ? ""
      : `Period ${course.startPeriod}-${
          course.startPeriod + course.periodCount - 1
        }`;
  const room = course.room || "?";
  const teacher = course.teacher || "?";
  const weeks =
    course.weekString ||
    (course.weeks && course.weeks.length ? course.weeks.join(", ") : "None");

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText("detail-name", course.name || "-");
  setText("detail-day", dayLabel);
  setText("detail-period", periodLabel || "-");
  setText("detail-room", room);
  setText("detail-teacher", teacher);
  setText("detail-weeks", weeks);

  // Display notes if available - convert links to clickable
  const notesRow = document.getElementById("detail-notes-row");
  const notesEl = document.getElementById("detail-notes");
  if (course.notes && course.notes.trim()) {
    if (notesEl) {
      // Convert URLs to clickable links
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const notesWithLinks = course.notes.replace(
        urlRegex,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
      );
      notesEl.innerHTML = notesWithLinks;
    }
    if (notesRow) notesRow.style.display = "flex";
  } else {
    if (notesRow) notesRow.style.display = "none";
  }

  // Position tooltip near the target element
  if (targetElement) {
    const rect = targetElement.getBoundingClientRect();
    const tooltipWidth = 280;
    const tooltipHeight = 200;

    let left = rect.right + 10;
    let top = rect.top;

    // Check if tooltip goes off-screen to the right
    if (left + tooltipWidth > window.innerWidth) {
      left = rect.left - tooltipWidth - 10;
    }

    // Check if tooltip goes off-screen to the left
    if (left < 10) {
      left = rect.left;
      top = rect.bottom + 10;
    }

    // Check if tooltip goes off-screen at bottom
    if (top + tooltipHeight > window.innerHeight) {
      top = window.innerHeight - tooltipHeight - 10;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  tooltip.classList.remove("hidden");
  setTimeout(() => tooltip.classList.add("visible"), 10);
}

function closeCourseDetails() {
  const tooltip = document.getElementById("course-detail-tooltip");
  if (tooltip) {
    tooltip.classList.remove("visible");
    setTimeout(() => tooltip.classList.add("hidden"), 200);
  }
}

function saveAndRender() {
  try {
    localStorage.setItem("smartTimetableData", JSON.stringify(appData));
    renderAllViews();
  } catch (error) {
    console.error("Error saving data:", error);
    toast.error("Save Failed", "Could not save data. Storage might be full.");
  }
}

function saveData() {
  try {
    localStorage.setItem("smartTimetableData", JSON.stringify(appData));
    return true;
  } catch (error) {
    console.error("Error saving data:", error);
    toast.error("Save Failed", "Could not save data. Storage might be full.");
    return false;
  }
}

// --- TAB SWITCHING FUNCTION (GLOBAL) ---
function switchToTab(targetTab) {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  const sidebarBtns = document.querySelectorAll(".sidebar-btn");
  const headerTabBtns = document.querySelectorAll(".header-tab");

  // Remove active class from all tabs and contents
  tabBtns.forEach((b) => b.classList.remove("active"));
  sidebarBtns.forEach((b) => b.classList.remove("active"));
  headerTabBtns.forEach((b) => b.classList.remove("active"));
  tabContents.forEach((c) => c.classList.remove("active"));

  // Add active class to target tab
  const targetBtn = document.querySelector(`.tab-btn[data-tab="${targetTab}"]`);
  if (targetBtn) {
    targetBtn.classList.add("active");
  }

  const targetSidebarBtn = document.querySelector(
    `.sidebar-btn[data-tab="${targetTab}"]`,
  );
  if (targetSidebarBtn) {
    targetSidebarBtn.classList.add("active");
  }

  // Sync header tabs (desktop)
  const targetHeaderTab = document.querySelector(
    `.header-tab[data-tab="${targetTab}"]`,
  );
  if (targetHeaderTab) {
    targetHeaderTab.classList.add("active");
  }

  const targetContent = document.getElementById(`tab-${targetTab}`);
  if (targetContent) {
    targetContent.classList.add("active");
  }

  // Sync week sliders when switching between dashboard and timetable
  if (targetTab === "timetable" || targetTab === "dashboard") {
    setSelectedWeek(currentViewWeek);
  }

  // Load settings tab data
  if (targetTab === "settings") {
    loadSettingsTab();
  }

  // Update mobile menu active state
  const mobileMenuItems = document.querySelectorAll(
    ".mobile-menu-item[data-tab]",
  );
  mobileMenuItems.forEach((item) => {
    if (item.dataset.tab === targetTab) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
}

// --- 2. EVENT LISTENERS (EVENT HANDLING) ---
function setupEventListeners() {
  // DASHBOARD VIEW SELECT
  const dashboardViewSelect = document.getElementById("dashboard-view-select");
  if (dashboardViewSelect) {
    dashboardViewSelect.addEventListener("change", () => {
      renderDashboard(currentViewWeek);
    });
  }

  // WEEK DROPDOWN - Header
  const weekDropdownHeader = document.getElementById("week-dropdown-header");
  if (weekDropdownHeader) {
    weekDropdownHeader.addEventListener("change", (e) => {
      const w = parseInt(e.target.value);
      if (!isNaN(w)) {
        currentViewWeek = w;
        setActiveWeek(w);
        renderAllViews();
      }
    });
  }

  // Mini calendar removed - feature not in use

  // QUICK SEARCH FUNCTIONALITY
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");

  if (searchInput && searchResults) {
    let searchTimeout;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim().toLowerCase();

      if (query.length < 1) {
        searchResults.style.display = "none";
        return;
      }

      searchTimeout = setTimeout(() => {
        performSearch(query);
      }, 200);
    });

    // Close search results when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-bar-container")) {
        searchResults.style.display = "none";
      }
    });
  }

  // THEME TOGGLE
  const themeToggleButton = document.getElementById("btn-theme-toggle");
  if (themeToggleButton) {
    themeToggleButton.addEventListener("click", (event) => {
      // Check for View Transitions API support
      if (!document.startViewTransition) {
        const newTheme = appData.theme === "light" ? "dark" : "light";
        appData.theme = newTheme;
        document.documentElement.setAttribute("data-theme", newTheme);
        saveData();
        return;
      }

      // Get click coordinates
      const x = event.clientX;
      const y = event.clientY;

      // Set CSS custom properties for the animation origin
      document.documentElement.style.setProperty("--x", x + "px");
      document.documentElement.style.setProperty("--y", y + "px");

      const transition = document.startViewTransition(() => {
        const isDark =
          document.documentElement.getAttribute("data-theme") === "dark";
        const newTheme = isDark ? "light" : "dark";
        appData.theme = newTheme;
        document.documentElement.setAttribute("data-theme", newTheme);
        saveData();
      });
    });
  }

  // A. TIMELINE NAVIGATION - Week slider handles this now
  // The week slider module handles navigation via initWeekSlider callback
  // Arrow buttons in week slider are for sliding visible weeks, not changing selected week

  // B. SIDEBAR ACTIONS
  const btnOpenInput = document.getElementById("btn-open-input");
  if (btnOpenInput) {
    btnOpenInput.addEventListener("click", openSidebarToAdd);
  }

  // B2. ADD COURSE BUTTON (in courses tab)
  const btnAddCourse = document.getElementById("btn-add-course");
  if (btnAddCourse) {
    btnAddCourse.addEventListener("click", openSidebarToAdd);
  }

  const btnCancelSidebar = document.getElementById("btn-cancel-sidebar");
  if (btnCancelSidebar) {
    btnCancelSidebar.addEventListener("click", closeSidebar);
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", closeSidebar);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && inputSidebar.classList.contains("is-open")) {
      closeSidebar();
    }
  });

  // Select All Button (In Sidebar)
  const btnToggleAll = document.getElementById("btn-toggle-all");
  if (btnToggleAll) {
    btnToggleAll.addEventListener("click", () => {
      const boxes = document.querySelectorAll(".week-checkbox");
      const isAllSelected = Array.from(boxes).every((b) =>
        b.classList.contains("selected"),
      );
      boxes.forEach((b) => {
        if (isAllSelected) {
          b.classList.remove("selected");
        } else {
          b.classList.add("selected");
        }
      });
      getSelectedWeeksFromUI(); // Update input display
    });
  }

  // Select Even/Odd Weeks Button
  const btnSelectEven = document.getElementById("btn-select-even");
  if (btnSelectEven) {
    btnSelectEven.addEventListener("click", () => {
      document.querySelectorAll(".week-checkbox").forEach((box) => {
        const week = parseInt(box.dataset.week);
        if (week % 2 === 0) {
          box.classList.add("selected");
        } else {
          box.classList.remove("selected");
        }
      });
      getSelectedWeeksFromUI();
    });
  }

  const btnSelectOdd = document.getElementById("btn-select-odd");
  if (btnSelectOdd) {
    btnSelectOdd.addEventListener("click", () => {
      document.querySelectorAll(".week-checkbox").forEach((box) => {
        const week = parseInt(box.dataset.week);
        if (week % 2 !== 0) {
          box.classList.add("selected");
        } else {
          box.classList.remove("selected");
        }
      });
      getSelectedWeeksFromUI();
    });
  }

  // SAVE BUTTON
  btnSave.addEventListener("click", (e) => {
    e.preventDefault();

    // --- VALIDATION LOGIC ---
    const name = document.getElementById("subject-name").value.trim();
    if (!name) {
      alert("Course name cannot be empty!");
      return;
    }

    const weeks = getSelectedWeeksFromUI();
    const day = parseInt(document.getElementById("day-select").value);
    if (day !== 0 && weeks.length === 0) {
      alert("Please select at least one week for this course!");
      return;
    }

    const editId = editIdInput.value;
    const formCourse = {
      id: editId ? parseFloat(editId) : Date.now(),
      name: name,
      day: day,
      room: document.getElementById("room-name").value || "Online",
      teacher: document.getElementById("teacher-name").value.trim(),
      startPeriod: parseInt(document.getElementById("start-period").value),
      periodCount: parseInt(document.getElementById("period-count").value),
      weeks: weeks,
      weekString: weeks.join(", "),
      color: document.getElementById("course-color").value,
      startDate: document.getElementById("start-date-picker").value,
      endDate: document.getElementById("end-date-picker").value,
      notes: document.getElementById("course-notes")?.value.trim() || "",
    };

    // Collision Detection
    const isCollision = (courseA, courseB) => {
      // Different courses, same day, not a note
      if (
        courseA.id !== courseB.id &&
        courseA.day === courseB.day &&
        courseA.day !== 0
      ) {
        const weeksA = new Set(courseA.weeks);
        const weeksB = new Set(courseB.weeks);
        const weekIntersection = [...weeksA].filter((w) => weeksB.has(w));

        if (weekIntersection.length > 0) {
          const startA = courseA.startPeriod;
          const endA = startA + courseA.periodCount;
          const startB = courseB.startPeriod;
          const endB = startB + courseB.periodCount;

          // Check for period overlap
          if (startA < endB && endA > startB) {
            return true; // Collision detected
          }
        }
      }
      return false;
    };

    for (const existingCourse of appData.courses) {
      if (isCollision(formCourse, existingCourse)) {
        alert(
          `Schedule conflict!\n\n"${formCourse.name}" conflicts with "${existingCourse.name}" at the same time and day.`,
        );
        return;
      }
    }

    // --- SAVE LOGIC ---
    if (editId) {
      const idx = appData.courses.findIndex((c) => c.id == editId);
      if (idx !== -1) appData.courses[idx] = formCourse;
    } else {
      appData.courses.push(formCourse);
    }

    saveAndRender();
    closeSidebar();
  });

  // DELETE BUTTON
  btnDelete.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete this course?")) {
      appData.courses = appData.courses.filter(
        (c) => c.id != editIdInput.value,
      );
      saveAndRender();
      closeSidebar();
    }
  });

  // C. DATE PICKER AUTO-SELECT (In Sidebar)
  const dStart = document.getElementById("start-date-picker");
  const dEnd = document.getElementById("end-date-picker");

  const autoSelectWeeks = () => {
    if (dStart.value && dEnd.value) {
      const sWeek = getRealWeekFromDate(dStart.value);
      const eWeek = getRealWeekFromDate(dEnd.value);

      if (sWeek && eWeek) {
        // Auto-tick checkboxes in Modal
        const boxes = document.querySelectorAll(".week-checkbox");
        boxes.forEach((box) => {
          const w = parseInt(box.dataset.week);
          if (w >= sWeek && w <= eWeek) box.classList.add("selected");
          else box.classList.remove("selected");
        });
        getSelectedWeeksFromUI(); // Update text
      }
    }
  };
  if (dStart && dEnd) {
    dStart.addEventListener("change", autoSelectWeeks);
    dEnd.addEventListener("change", autoSelectWeeks);
  }

  // D. GENERAL NOTES
  const btnSaveNotes = document.getElementById("btn-save-notes");
  if (btnSaveNotes && notesTextarea) {
    btnSaveNotes.addEventListener("click", () => {
      appData.generalNotes = notesTextarea.value;
      saveData();
      alert("Notes saved successfully!");
    });
  }

  // E. HOLIDAY CONFIG & GENERAL SETTINGS
  const btnConfig = document.getElementById("btn-config");
  if (btnConfig) {
    btnConfig.addEventListener("click", () => {
      renderHolidayList();
      holidayModal.showModal();
    });
  }

  // Open Settings Modal
  const btnSettings = document.getElementById("btn-settings");
  if (btnSettings) {
    btnSettings.addEventListener("click", () => {
      document.getElementById("setting-start-date").value =
        appData.settings.startDate;
      document.getElementById("setting-start-week").value =
        appData.settings.startWeek;
      settingsModal.showModal();
    });
  }

  // Save Settings
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener("click", () => {
      const newStartDate = document.getElementById("setting-start-date").value;
      const newStartWeek = parseInt(
        document.getElementById("setting-start-week").value,
      );

      if (newStartDate && newStartWeek) {
        appData.settings.startDate = newStartDate;
        appData.settings.startWeek = newStartWeek;
        setSystemConfig(newStartDate, newStartWeek); // Apply new config
        currentViewWeek = newStartWeek; // Reset view to start week
        saveAndRender(); // Save and re-render
        settingsModal.close();
        alert("System configuration saved!");
      } else {
        alert("Please enter both start date and week!");
      }
    });
  }

  const btnAddHoliday = document.getElementById("btn-add-holiday");
  if (btnAddHoliday) {
    btnAddHoliday.addEventListener("click", () => {
      const name = document.getElementById("holiday-name").value;
      const s = document.getElementById("holiday-start").value;
      const e = document.getElementById("holiday-end").value;

      const sWeek = getRealWeekFromDate(s);
      const eWeek = getRealWeekFromDate(e);

      if (name && sWeek && eWeek) {
        const weeks = [];
        for (let i = sWeek; i <= eWeek; i++) weeks.push(i);

        appData.holidays.push({ name, weeks });
        saveAndRender();
        renderHolidayList();

        // Reset form
        document.getElementById("holiday-name").value = "";
      } else {
        alert("Invalid date (Outside semester range)!");
      }
    });
  }

  // G. EXPORT / IMPORT
  const btnExport = document.getElementById("btn-export");
  if (btnExport) {
    btnExport.addEventListener("click", () => {
      const json = JSON.stringify(appData, null, 2);
      navigator.clipboard
        .writeText(json)
        .then(() => alert("Data copied to clipboard!"));
    });
  }

  const importModal = document.getElementById("import-modal");
  const importArea = document.getElementById("import-area");
  const btnConfirmImport = document.getElementById("btn-confirm-import");
  const btnCancelImport = document.getElementById("btn-cancel-import");

  const btnImport = document.getElementById("btn-import");
  if (btnImport && importModal) {
    btnImport.addEventListener("click", () => {
      importArea.value = ""; // Clear textarea on open
      importModal.showModal();
    });
  }

  if (btnCancelImport && importModal) {
    btnCancelImport.addEventListener("click", () => importModal.close());
  }

  if (btnConfirmImport && importModal) {
    btnConfirmImport.addEventListener("click", () => {
      const raw = importArea.value;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);

          if (!parsed) {
            throw new Error("Empty or invalid JSON.");
          }

          // Case A (Old format): JSON is an Array
          if (Array.isArray(parsed)) {
            appData.courses = parsed;
            alert("Import successful! (Course data loaded)");
          }
          // Case B (New format): JSON is an Object
          else if (typeof parsed === "object" && parsed.courses) {
            // Update all, ensure keys are not missing
            appData = {
              settings: { startDate: "2026-01-26", startWeek: 22 },
              holidays: [],
              generalNotes: "",
              ...parsed,
            };
            alert("Import successful! (All data loaded)");
          } else {
            throw new Error("JSON format not supported.");
          }

          setSystemConfig(
            appData.settings.startDate,
            appData.settings.startWeek,
          );
          currentViewWeek = appData.settings.startWeek;
          saveAndRender();
          importModal.close();
        } catch (e) {
          alert(`JSON format error!\n\nDetails: ${e.message}`);
        }
      } else {
        alert("Please paste data into the text area.");
      }
    });
  }

  // TAB NAVIGATION
  // Desktop tab navigation (old horizontal tabs - if still exists)
  const tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.dataset.tab;
      switchToTab(targetTab);
    });
  });

  // Desktop header tabs navigation
  const headerTabBtns = document.querySelectorAll(".header-tab");
  headerTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.dataset.tab;
      switchToTab(targetTab);
    });
  });

  // Desktop sidebar navigation
  const sidebarBtns = document.querySelectorAll(".sidebar-btn");
  sidebarBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.dataset.tab;
      switchToTab(targetTab);
    });
  });

  // Listen for mobile menu tab switches
  document.addEventListener("mobile-tab-switch", (e) => {
    const { tabId } = e.detail;
    switchToTab(tabId);
  });

  // Sync week dropdown 2 with main dropdown
  const weekDropdown2 = document.getElementById("week-dropdown-2");
  if (weekDropdown2) {
    weekDropdown2.addEventListener("change", (e) => {
      const w = parseInt(e.target.value);
      if (!isNaN(w)) {
        currentViewWeek = w;
        setActiveWeek(w);
        renderAllViews();
      }
    });
  }

  // SETTINGS TAB EVENT LISTENERS
  setupSettingsListeners();
}

function syncWeekDropdowns() {
  // Sync week sliders
  setSelectedWeek(currentViewWeek);
}

// SETTINGS TAB FUNCTIONS
function loadSettingsTab() {
  // Load semester settings
  const startDateInput = document.getElementById("semester-start-date");
  const startWeekInput = document.getElementById("semester-start-week");

  if (startDateInput) startDateInput.value = appData.settings.startDate;
  if (startWeekInput) startWeekInput.value = appData.settings.startWeek;

  // Load holidays
  renderHolidayListSettings();

  // Load theme
  const currentTheme = appData.theme || "light";
  const themeRadios = document.querySelectorAll('input[name="theme"]');
  themeRadios.forEach((radio) => {
    if (radio.value === currentTheme) {
      radio.checked = true;
    }
  });
}

function renderHolidayListSettings() {
  const container = document.getElementById("holiday-list-settings");
  if (!container) return;

  container.innerHTML = "";

  if (!appData.holidays || appData.holidays.length === 0) {
    container.innerHTML =
      '<p style="color: var(--color-text-gray); padding: 12px; text-align: center;">No holidays configured</p>';
    return;
  }

  appData.holidays.forEach((holiday, index) => {
    const item = document.createElement("div");
    item.className = "holiday-item";
    item.innerHTML = `
      <span class="holiday-item-name">${holiday.name}</span>
      <span class="holiday-item-weeks">Week: ${holiday.weeks.join(", ")}</span>
      <button class="btn-delete-holiday" data-index="${index}">×</button>
    `;
    container.appendChild(item);
  });

  // Attach delete handlers
  container.querySelectorAll(".btn-delete-holiday").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index);
      if (confirm("Delete this holiday?")) {
        appData.holidays.splice(index, 1);
        saveAndRender();
        renderHolidayListSettings();
      }
    });
  });
}

function setupSettingsListeners() {
  // Save semester settings
  const btnSaveSemester = document.getElementById("btn-save-semester");
  if (btnSaveSemester) {
    btnSaveSemester.addEventListener("click", () => {
      const startDate = document.getElementById("semester-start-date").value;
      const startWeek = parseInt(
        document.getElementById("semester-start-week").value,
      );

      if (startDate && startWeek) {
        appData.settings.startDate = startDate;
        appData.settings.startWeek = startWeek;
        setSystemConfig(startDate, startWeek);
        currentViewWeek = startWeek;
        saveAndRender();
        alert("Semester settings saved!");
      } else {
        alert("Please fill in all information!");
      }
    });
  }

  // Add holiday button
  const btnConfigHoliday = document.getElementById("btn-config-holiday");
  if (btnConfigHoliday) {
    btnConfigHoliday.addEventListener("click", () => {
      renderHolidayList();
      holidayModal.showModal();
    });
  }

  // Export button
  const btnExportSettings = document.getElementById("btn-export-settings");
  if (btnExportSettings) {
    btnExportSettings.addEventListener("click", () => {
      const dataStr = JSON.stringify(appData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `timetable-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Import button
  const btnImportSettings = document.getElementById("btn-import-settings");
  const importModalSettings = document.getElementById("import-modal");
  if (btnImportSettings && importModalSettings) {
    btnImportSettings.addEventListener("click", () => {
      const importArea = document.getElementById("import-area");
      if (importArea) importArea.value = "";
      importModalSettings.showModal();
    });
  }

  // Clear data button
  const btnClearData = document.getElementById("btn-clear-data");
  if (btnClearData) {
    btnClearData.addEventListener("click", () => {
      if (
        confirm(
          "ARE YOU SURE YOU WANT TO DELETE ALL DATA?\n\nThis action CANNOT be undone!",
        )
      ) {
        if (confirm("Final confirmation: DELETE ALL data?")) {
          localStorage.removeItem("smartTimetableData");
          location.reload();
        }
      }
    });
  }

  // Theme radio buttons
  const themeRadios = document.querySelectorAll('input[name="theme"]');
  themeRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const newTheme = e.target.value;
      appData.theme = newTheme;
      document.documentElement.setAttribute("data-theme", newTheme);
      saveData();
    });
  });
}

document.addEventListener("DOMContentLoaded", init);
