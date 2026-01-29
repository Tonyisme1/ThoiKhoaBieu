/**
 * MAIN CONTROLLER
 * Äiá»u phá»‘i luá»“ng dá»¯ liá»‡u vĂ  sá»± kiá»‡n.
 */

import {
  getRealWeekFromDate,
  setSystemConfig,
  getDatesForWeek,
  getDatesForWeekISO,
  getPeriodTime,
} from "./core.js";
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
} from "./ui.js";
import { initNotesUI } from "./notes-ui.js";

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
let currentViewWeek = appData.settings.startWeek; // Tuáº§n máº·c Ä‘á»‹nh
const TOTAL_WEEKS_RENDER = 26; // Render tá»« tuáº§n 22 -> 47

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
const notesTextarea = document.getElementById("general-notes-textarea"); // New

// --- 1. INIT (KHá»I Táº O) ---
function init() {
  // Load Data
  const stored = localStorage.getItem("smartTimetableData");
  if (stored) {
    try {
      const parsedData = JSON.parse(stored);
      // Merge: Giá»¯ láº¡i data cÅ© vĂ  thĂªm settings náº¿u cĂ³
      appData = { ...appData, ...parsedData };

      // Patch logic: Náº¿u data cÅ© chÆ°a cĂ³ cĂ¡c key má»›i thĂ¬ thĂªm vĂ o
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
  currentViewWeek = appData.settings.startWeek; // Cáº­p nháº­t tuáº§n hiá»‡n táº¡i theo config

  // Load initial notes
  if (notesTextarea) {
    notesTextarea.value = appData.generalNotes;
  }

  // Render Skeleton
  initGridStructure();
  renderWeekNavigation(TOTAL_WEEKS_RENDER, currentViewWeek);
  populateWeekDropdown(TOTAL_WEEKS_RENDER);

  // Render Data
  renderAllViews();
  renderAssignments();
  renderExams();
  renderAttendance();
  initNotesUI(appData, saveData);

  // Setup Events
  setupEventListeners();

  // Setup tooltip hover behavior Ä‘á»ƒ giá»¯ tooltip khi hover vĂ o nĂ³
  const tooltip = document.getElementById("course-detail-tooltip");
  if (tooltip) {
    tooltip.addEventListener("mouseenter", cancelCloseDetail);
    tooltip.addEventListener("mouseleave", scheduleCloseDetail);
  }
}

/**
 * Gáº¯n sá»± kiá»‡n cho card/báº£ng
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
      if (confirm("Báº¡n cháº¯c cháº¯n muá»‘n xĂ³a mĂ´n nĂ y vÄ©nh viá»…n?")) {
        appData.courses = appData.courses.filter((c) => c.id !== id);
        saveAndRender();
      }
    });
  });
}

/**
 * Render láº¡i toĂ n bá»™ mĂ n hĂ¬nh (Grid + Notes + Holiday Banner)
 */
function renderAllViews() {
  // 1. TĂ¡ch mĂ´n há»c vs Ghi chĂº
  const timedCourses = appData.courses.filter((c) => c.day !== 0);
  const noteCourses = appData.courses.filter((c) => c.day === 0);

  // 2. Render UI
  renderGridHeader(currentViewWeek); // Render header with dates
  renderSchedule(timedCourses, currentViewWeek);
  renderNotes(noteCourses);
  renderNotes(noteCourses, "notes-list-2"); // Render notes for notes tab
  renderCourseListTable(appData.courses);
  // 3. Logic hiá»ƒn thá»‹ thĂ´ng bĂ¡o ngĂ y nghá»‰
  checkAndDisplayHoliday(currentViewWeek);

  // 4. Update breadcrumb
  updateBreadcrumb(currentViewWeek);

  // 5. Gáº¯n sá»± kiá»‡n Click-to-Edit
  attachEditEvents();

  // 6. Update favorite button states
  updateFavoriteButtons();

  // 7. Render dashboard analytics
  renderDashboard(currentViewWeek);

  // 8. Äá»“ng bá»™ dropdown tuáº§n
  updateWeekDropdown(currentViewWeek);
  syncWeekDropdowns();
}
/**
 * Helper: Chuyá»ƒn ngĂ y tá»« VN (26/01/2026) sang Input (2026-01-26)
 */
function convertDateToISO(dateStr) {
  if (!dateStr) return "";
  // Náº¿u Ä‘Ă£ lĂ  dáº¡ng yyyy-mm-dd thĂ¬ giá»¯ nguyĂªn
  if (dateStr.includes("-")) return dateStr;

  // Náº¿u lĂ  dáº¡ng dd/mm/yyyy
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return "";
}
// --- 2. LOGIC NGĂ€Y NGHá»ˆ (HOLIDAY) ---
function checkAndDisplayHoliday(week) {
  if (!appData.holidays) return;
  const activeHolidays = appData.holidays.filter((h) => h.weeks.includes(week));

  if (activeHolidays.length > 0) {
    const names = activeHolidays.map((h) => h.name).join(" & ");
    holidayBanner.textContent = `Lá»‹ch nghá»‰: ${names}`;
    holidayBanner.style.display = "block";
  } else {
    holidayBanner.textContent = "";
    holidayBanner.style.display = "none";
  }
}

function renderHolidayList() {
  const list = document.getElementById("holiday-list");
  list.innerHTML = "";

  if (appData.holidays.length === 0) {
    list.innerHTML =
      '<li style="padding:10px; color:#999;">ChÆ°a cĂ³ dá»¯ liá»‡u.</li>';
    return;
  }

  appData.holidays.forEach((h, index) => {
    const li = document.createElement("li");
    li.className = "holiday-item";
    li.innerHTML = `
            <div><strong>${h.name}</strong> <small>(${h.weeks.length} tuáº§n)</small></div>
            <button class="btn-remove-holiday" data-index="${index}">âŒ</button>
        `;
    list.appendChild(li);
  });

  // Gáº¯n sá»± kiá»‡n xĂ³a
  list.querySelectorAll(".btn-remove-holiday").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.index);
      if (confirm("XĂ³a ngĂ y nghá»‰ nĂ y?")) {
        appData.holidays.splice(idx, 1);
        saveAndRender();
        renderHolidayList();
      }
    });
  });
}

/**
 * Update Breadcrumb Navigation
 */
function updateBreadcrumb(week) {
  const weekNum = week;

  // Dáº£i ngĂ y cá»§a tuáº§n
  const weekDates = getDatesForWeek(week);
  const rangeStr =
    weekDates && weekDates.length
      ? `${weekDates[0]} - ${weekDates[6] || weekDates[weekDates.length - 1]}`
      : "";

  const summaryWeek = document.getElementById("summary-week");
  const summaryRange = document.getElementById("summary-range");

  if (summaryWeek) summaryWeek.textContent = `Tuáº§n ${weekNum}`;
  if (summaryRange) summaryRange.textContent = rangeStr;
}

/** Populate week dropdown */
function populateWeekDropdown(totalWeeks) {
  const dropdowns = [
    document.getElementById("week-dropdown-header"),
    document.getElementById("week-dropdown-2"),
  ];

  const start = appData.settings.startWeek || 1;

  dropdowns.forEach((dropdown) => {
    if (!dropdown) return;
    dropdown.innerHTML = "";

    for (let w = start; w <= start + totalWeeks; w++) {
      const opt = document.createElement("option");
      opt.value = w;
      opt.textContent = `Tuáº§n ${w}`;
      dropdown.appendChild(opt);
    }
  });
}

function updateWeekDropdown(week) {
  // Update all week dropdowns
  const dropdowns = [
    document.getElementById("week-dropdown-header"),
    document.getElementById("week-dropdown-2"),
  ];

  dropdowns.forEach((dropdown) => {
    if (dropdown) dropdown.value = week;
  });
}

/**
 * TĂ­nh toĂ¡n thá»‘ng kĂª dashboard cho tuáº§n hiá»‡n táº¡i
 */
function getDashboardStats(week) {
  const coursesThisWeek = appData.courses.filter(
    (c) => c.weeks && c.weeks.includes(parseInt(week)) && c.day !== 0,
  );

  const totalCourses = coursesThisWeek.length;
  const totalPeriods = coursesThisWeek.reduce(
    (sum, c) => sum + Number(c.periodCount || 0),
    0,
  );
  const hours = Math.round((totalPeriods * 50) / 60); // giáº£ Ä‘á»‹nh 50 phĂºt/tiáº¿t

  const favoritesCount = appData.favorites ? appData.favorites.length : 0;

  // NgĂ y nghá»‰ trong settings
  const holidays = appData.holidays || [];
  const holidayWeeks = new Set();
  holidays.forEach((holiday) => {
    holiday.weeks.forEach((w) => holidayWeeks.add(w));
  });

  // Lá»›p sáº¯p tá»›i - TĂŒM TRONG Táº¤T Cáº¢ CĂC TUáº¦N
  const now = new Date();
  const currentWeek = getRealWeekFromDate(now);

  let upcomingClass = null;
  let minTimeDiff = Infinity;

  appData.courses.forEach((course) => {
    if (course.day === 0) return; // Skip notes

    course.weeks.forEach((weekNum) => {
      // Skip holiday weeks
      if (holidayWeeks.has(weekNum)) return;

      const dates = getDatesForWeekISO(weekNum);
      const sessionDateISO = dates[course.day - 2];

      if (sessionDateISO) {
        const sessionDate = new Date(sessionDateISO + "T00:00:00");

        // TĂ­nh giá» báº¯t Ä‘áº§u buá»•i há»c
        const startTime = getPeriodTime(course.startPeriod);
        if (startTime) {
          const [hours, minutes] = startTime
            .replace("h", ":")
            .split(":")
            .map(Number);
          const sessionStartDateTime = new Date(sessionDate);
          sessionStartDateTime.setHours(hours, minutes, 0, 0);

          // Chá»‰ láº¥y lá»›p chÆ°a báº¯t Ä‘áº§u
          if (sessionStartDateTime > now) {
            const timeDiff = sessionStartDateTime - now;
            if (timeDiff < minTimeDiff) {
              minTimeDiff = timeDiff;
              upcomingClass = {
                ...course,
                sessionDate: sessionStartDateTime,
                sessionDateISO: sessionDateISO,
                weekNum: weekNum,
              };
            }
          }
        }
      }
    });
  });

  let nextTitle = "â€”";
  let nextMeta = "ChÆ°a cĂ³ lá»‹ch";

  if (upcomingClass) {
    const sessionDate = upcomingClass.sessionDate;
    const dayOfWeek = sessionDate.getDay();
    const dayLabel =
      dayOfWeek === 0 ? "Chá»§ Nháº­t" : `Thá»© ${dayOfWeek + 1}`;

    // Format date
    const day = sessionDate.getDate();
    const month = sessionDate.getMonth() + 1;
    const dateStr = `${day}/${month}`;

    // Calculate time until class
    const hoursUntil = Math.floor(minTimeDiff / (1000 * 60 * 60));
    const daysUntil = Math.floor(hoursUntil / 24);

    let timeInfo = "";
    if (daysUntil > 0) {
      timeInfo = `${daysUntil} ngĂ y ná»¯a`;
    } else if (hoursUntil > 0) {
      timeInfo = `${hoursUntil} giá» ná»¯a`;
    } else {
      const minutesUntil = Math.floor(minTimeDiff / (1000 * 60));
      timeInfo = `${minutesUntil} phĂºt ná»¯a`;
    }

    nextTitle = upcomingClass.name;
    nextMeta = `${dayLabel} ${dateStr}, Tiáº¿t ${upcomingClass.startPeriod} - ${upcomingClass.room || "?"} â€¢ ${timeInfo}`;
  }

  // Táº£i tuáº§n theo ngĂ y (Ä‘á»ƒ váº½ bar chart)
  const normalizeDay = (d) => {
    const n = parseInt(d);
    if (isNaN(n)) return 0;
    if (n === 0) return 8;
    if (n >= 2 && n <= 8) return n;
    if (n === 1) return 2;
    return n;
  };

  const loadByDay = Array(7).fill(0);
  const dayIndex = { 2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6 }; // Thá»© 2..CN
  coursesThisWeek.forEach((c) => {
    const idx = dayIndex[normalizeDay(c.day)] ?? 0;
    loadByDay[idx] += Number(c.periodCount || 0);
  });

  return {
    totalCourses,
    totalPeriods,
    hours,
    favoritesCount,
    holidays,
    nextTitle,
    nextMeta,
    loadByDay,
  };
}

/**
 * Render Dashboard & Analytics
 */
/**
 * Get semester-wide statistics aggregating all weeks
 */
function getSemesterStats() {
  const allCourses = appData.courses;
  const weeklyData = [];

  // Sá»­ dá»¥ng constant TOTAL_WEEKS_RENDER vĂ  startWeek tá»« settings
  const totalWeeks = TOTAL_WEEKS_RENDER;
  const startWeek = appData.settings.startWeek || 22;

  // TĂ­nh tá»•ng tiáº¿t theo lá»‹ch thá»±c táº¿ (periodCount Ă— sá»‘ tuáº§n)
  let totalPeriods = 0;
  allCourses.forEach((course) => {
    if (course.day !== 0 && course.weeks && Array.isArray(course.weeks)) {
      // Sá»‘ tiáº¿t má»—i buá»•i Ă— sá»‘ tuáº§n cĂ³ lá»‹ch
      const periodsPerSession = course.periodCount || 0;
      totalPeriods += periodsPerSession * course.weeks.length;
    }
  });

  // Build weekly breakdown data
  for (let w = startWeek; w < startWeek + totalWeeks; w++) {
    const weekStats = getDashboardStats(w);

    // Store per-week data for breakdown
    weeklyData.push({
      week: w,
      courses: weekStats.totalCourses,
      periods: weekStats.totalPeriods,
      hours: weekStats.hours,
    });
  }

  const hours = Math.round(totalPeriods * 1.67);
  // Äáº¿m táº¥t cáº£ mĂ´n trong danh sĂ¡ch (khĂ´ng phĂ¢n biá»‡t tuáº§n)
  const totalCourses = allCourses.length;
  const favoritesCount = allCourses.filter((c) => c.isFavorite).length;
  const attendanceStats = calculateTotalAttendanceStats();

  // TĂ­nh tá»•ng buá»•i há»c theo lá»‹ch (khĂ´ng pháº£i buá»•i Ä‘Ă£ Ä‘iá»ƒm danh)
  let totalScheduledSessions = 0;
  allCourses.forEach((course) => {
    // Chá»‰ Ä‘áº¿m mĂ´n cĂ³ thá»i gian (khĂ´ng pháº£i ghi chĂº)
    if (course.day !== 0 && course.weeks && Array.isArray(course.weeks)) {
      // Má»—i mĂ´n cĂ³ 1 buá»•i/tuáº§n, nhĂ¢n vá»›i sá»‘ tuáº§n cĂ³ lá»‹ch
      totalScheduledSessions += course.weeks.length;
    }
  });

  return {
    totalCourses,
    totalPeriods,
    hours,
    favoritesCount,
    attendanceStats,
    totalScheduledSessions,
    weeklyBreakdown: weeklyData,
  };
}

function renderDashboard(week) {
  const viewSelect = document.getElementById("dashboard-view-select");
  const isSemesterView = viewSelect && viewSelect.value === "semester";

  if (isSemesterView) {
    renderSemesterDashboard();
  } else {
    renderWeekDashboard(week);
  }
}

function renderWeekDashboard(week) {
  const stats = getDashboardStats(week);

  const elCourses = document.getElementById("stat-courses");
  const elPeriods = document.getElementById("stat-periods");
  const elHours = document.getElementById("stat-hours");
  const elFav = document.getElementById("stat-favorites");
  const elNextTitle = document.getElementById("stat-next-title");
  const elNextMeta = document.getElementById("stat-next-meta");
  const elAttendance = document.getElementById("stat-attendance");
  const elLabelCourses = document.getElementById("dash-label-courses");
  const elMetaCourses = document.getElementById("dash-meta-courses");
  const chartTitle = document.getElementById("chart-title-load");
  const chartHint = document.getElementById("chart-hint-load");

  if (elLabelCourses) elLabelCourses.textContent = "MĂ´n trong tuáº§n";
  if (elMetaCourses)
    elMetaCourses.textContent = "Táº¥t cáº£ mĂ´n cĂ³ lá»‹ch tuáº§n nĂ y";
  if (chartTitle) chartTitle.textContent = "Biá»ƒu Ä‘á»“ táº£i tuáº§n";
  if (chartHint) chartHint.textContent = "Sá»‘ tiáº¿t theo ngĂ y";

  if (elCourses) elCourses.textContent = stats.totalCourses;
  if (elPeriods) elPeriods.textContent = stats.totalPeriods;
  if (elHours) elHours.textContent = `â‰ˆ ${stats.hours} giá»`;
  if (elFav) elFav.textContent = stats.favoritesCount;
  if (elNextTitle) elNextTitle.textContent = stats.nextTitle;
  if (elNextMeta) elNextMeta.textContent = stats.nextMeta;

  // Hiá»ƒn thá»‹ láº¡i card "Lá»›p sáº¯p tá»›i" trong cháº¿ Ä‘á»™ tuáº§n
  const cardNextClass = document.getElementById("card-next-class");
  if (cardNextClass) cardNextClass.style.display = "";

  // KhĂ´i phá»¥c label attendance cho cháº¿ Ä‘á»™ tuáº§n
  const cardAttendance = document.getElementById("card-attendance");
  const elAttendanceLabel = cardAttendance?.querySelector(".dash-label");
  const elAttendanceMeta = cardAttendance?.querySelector(".dash-meta");

  if (elAttendanceLabel) elAttendanceLabel.textContent = "Äiá»ƒm danh";
  if (elAttendanceMeta)
    elAttendanceMeta.textContent = "ÄĂ£ Ä‘i / Tá»•ng buá»•i";

  // Attendance stats
  if (elAttendance) {
    const attendanceStats = calculateTotalAttendanceStats();
    elAttendance.textContent = `${attendanceStats.attended}/${attendanceStats.total}`;
  }

  // Render bar chart
  const chart = document.getElementById("weekly-load-chart");
  if (chart) {
    chart.innerHTML = "";
    chart.classList.remove("semester-view");
    const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    const maxVal = Math.max(...stats.loadByDay, 1);
    stats.loadByDay.forEach((val, idx) => {
      const item = document.createElement("div");
      item.className = "bar-item";

      const fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.height = `${(val / maxVal) * 100}%`;

      const value = document.createElement("div");
      value.className = "bar-value";
      value.textContent = val;

      const label = document.createElement("div");
      label.className = "bar-label";
      label.textContent = days[idx];

      item.appendChild(fill);
      item.appendChild(value);
      item.appendChild(label);
      chart.appendChild(item);
    });
  }

  // Render holiday mini list
  const holidayList = document.getElementById("holiday-mini-list");
  if (holidayList) {
    holidayList.innerHTML = "";
    if (!stats.holidays.length) {
      holidayList.innerHTML =
        '<li style="padding:10px; color: var(--color-text-gray);">KhĂ´ng cĂ³ lá»‹ch nghá»‰</li>';
    } else {
      stats.holidays.forEach((h) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <span>${h.name}</span>
          <span class="holiday-weeks">Tuáº§n: ${h.weeks.join(", ")}</span>
        `;
        holidayList.appendChild(li);
      });
    }
  }
}

function renderSemesterDashboard() {
  const stats = getSemesterStats();

  const elCourses = document.getElementById("stat-courses");
  const elPeriods = document.getElementById("stat-periods");
  const elHours = document.getElementById("stat-hours");
  const elFav = document.getElementById("stat-favorites");
  const elNextTitle = document.getElementById("stat-next-title");
  const elNextMeta = document.getElementById("stat-next-meta");
  const elAttendance = document.getElementById("stat-attendance");
  const elLabelCourses = document.getElementById("dash-label-courses");
  const elMetaCourses = document.getElementById("dash-meta-courses");
  const chartTitle = document.getElementById("chart-title-load");
  const chartHint = document.getElementById("chart-hint-load");

  if (elLabelCourses) elLabelCourses.textContent = "Tá»•ng mĂ´n há»c";
  if (elMetaCourses)
    elMetaCourses.textContent = "Táº¥t cáº£ mĂ´n trong danh sĂ¡ch";
  if (chartTitle) chartTitle.textContent = "PhĂ¢n bá»• theo tuáº§n";
  if (chartHint) chartHint.textContent = "Sá»‘ tiáº¿t má»—i tuáº§n";

  if (elCourses) elCourses.textContent = stats.totalCourses;
  if (elPeriods) elPeriods.textContent = stats.totalPeriods;
  if (elHours) elHours.textContent = `â‰ˆ ${stats.hours} giá»`;
  if (elFav) elFav.textContent = stats.favoritesCount;

  // áº¨n card "Lá»›p sáº¯p tá»›i" trong cháº¿ Ä‘á»™ toĂ n há»c ká»³
  const cardNextClass = document.getElementById("card-next-class");
  if (cardNextClass) cardNextClass.style.display = "none";

  // Hiá»ƒn thá»‹ tá»•ng buá»•i há»c theo lá»‹ch thay vĂ¬ buá»•i Ä‘Ă£ Ä‘iá»ƒm danh
  const cardAttendance = document.getElementById("card-attendance");
  const elAttendanceLabel = cardAttendance?.querySelector(".dash-label");
  const elAttendanceMeta = cardAttendance?.querySelector(".dash-meta");

  if (elAttendanceLabel) elAttendanceLabel.textContent = "Tá»•ng buá»•i há»c";
  if (elAttendanceMeta)
    elAttendanceMeta.textContent = "Theo lá»‹ch toĂ n há»c ká»³";
  if (elAttendance) {
    elAttendance.textContent = stats.totalScheduledSessions;
  }

  // Render weekly breakdown chart
  const chart = document.getElementById("weekly-load-chart");
  if (chart) {
    chart.innerHTML = "";
    chart.classList.add("semester-view");
    const maxVal = Math.max(...stats.weeklyBreakdown.map((w) => w.periods), 1);
    const startWeek = appData.settings.weekOffsetReal || 1;

    stats.weeklyBreakdown.forEach((weekData, index) => {
      const item = document.createElement("div");
      item.className = "bar-item";
      item.style.cursor = "pointer";
      item.title = `Tuáº§n ${weekData.week}: ${weekData.periods} tiáº¿t`;

      const fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.height = `${(weekData.periods / maxVal) * 100}%`;

      const value = document.createElement("div");
      value.className = "bar-value";
      value.textContent = weekData.periods;

      const label = document.createElement("div");
      label.className = "bar-label";
      // Hiá»ƒn thá»‹ sá»‘ tuáº§n thá»±c luĂ´n
      label.textContent = `T${weekData.week}`;

      item.appendChild(fill);
      item.appendChild(value);
      item.appendChild(label);

      // Click to navigate to that week
      item.addEventListener("click", () => {
        currentViewWeek = weekData.week;
        setActiveWeek(currentViewWeek);
        const viewSelect = document.getElementById("dashboard-view-select");
        if (viewSelect) viewSelect.value = "week";
        saveAndRender();
      });

      chart.appendChild(item);
    });
  }

  // Show all holidays grouped
  const holidayList = document.getElementById("holiday-mini-list");
  if (holidayList) {
    holidayList.innerHTML = "";
    const allHolidays = appData.holidays || [];
    if (!allHolidays.length) {
      holidayList.innerHTML =
        '<li style="padding:10px; color: var(--color-text-gray);">KhĂ´ng cĂ³ lá»‹ch nghá»‰</li>';
    } else {
      allHolidays.forEach((h) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <span>${h.name}</span>
          <span class="holiday-weeks">Tuáº§n: ${h.weeks.join(", ")}</span>
        `;
        holidayList.appendChild(li);
      });
    }
  }
}

/**
 * Render Mini Calendar for given month/year
 */
function renderCalendar(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const calendarGrid = document.getElementById("calendar-grid");
  const monthYear = document.getElementById("calendar-month-year");

  if (!calendarGrid) return;

  calendarGrid.innerHTML = "";
  monthYear.textContent = `ThĂ¡ng ${month + 1}, ${year}`;

  let currentDate = new Date(startDate);
  const today = new Date();

  for (let i = 0; i < 42; i++) {
    const dayCell = document.createElement("div");
    dayCell.className = "calendar-day";
    dayCell.textContent = currentDate.getDate();

    const isOtherMonth = currentDate.getMonth() !== month;
    const isToday = currentDate.toDateString() === today.toDateString();
    const isSelected = currentDate.getDay() === 1; // Monday

    if (isOtherMonth) {
      dayCell.classList.add("other-month");
    }
    if (isToday) {
      dayCell.classList.add("today");
    }
    if (!isOtherMonth) {
      dayCell.style.cursor = "pointer";
      dayCell.addEventListener("click", () => {
        navigateToWeek(currentDate);
        closeCalendar();
      });
    }

    calendarGrid.appendChild(dayCell);
    currentDate.setDate(currentDate.getDate() + 1);
  }
}

/**
 * Navigate to week containing the given date
 */
function navigateToWeek(date) {
  const weekNum = getRealWeekFromDate(appData.settings.startDate, 22);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  let week = Math.ceil(
    ((date - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7,
  );
  if (week < 1) week = 1;

  currentViewWeek = week;
  setActiveWeek(currentViewWeek);
  saveAndRender();
}

/**
 * Toggle Calendar Visibility
 */
function toggleCalendar() {
  const calendar = document.getElementById("mini-calendar");
  const btn = document.getElementById("btn-toggle-calendar");
  const isVisible = calendar.style.display !== "none";

  if (isVisible) {
    closeCalendar();
  } else {
    openCalendar();
  }
}

function openCalendar() {
  const calendar = document.getElementById("mini-calendar");
  const btn = document.getElementById("btn-toggle-calendar");
  calendar.style.display = "block";
  btn.classList.add("active");
  renderCalendar(new Date());
}

function closeCalendar() {
  const calendar = document.getElementById("mini-calendar");
  const btn = document.getElementById("btn-toggle-calendar");
  calendar.style.display = "none";
  btn.classList.remove("active");
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
    searchResults.innerHTML = `<div class="search-result-item" style="cursor: default;">KhĂ´ng tĂ¬m tháº¥y káº¿t quáº£</div>`;
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
        <div class="search-result-meta">GV: ${course.teacher} | PhĂ²ng: ${course.room}</div>
      </div>
      <div class="search-result-badge">Tuáº§n ${course.weeks[0] || "?"}</div>
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
      btn.textContent = "â˜…";
    } else {
      btn.classList.remove("active");
      btn.textContent = "â˜†";
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
  modalTitle.textContent = "ThĂªm MĂ´n Há»c Má»›i";
  btnSave.textContent = "LÆ°u MĂ´n Há»c";
  btnDelete.style.display = "none";

  // Render báº£ng chá»n tuáº§n trá»‘ng
  renderWeekSelector([]);
  openSidebar();
}

function openSidebarToEdit(course) {
  // 1. Äiá»n cĂ¡c thĂ´ng tin cÆ¡ báº£n
  document.getElementById("subject-name").value = course.name;
  document.getElementById("day-select").value = course.day;
  document.getElementById("room-name").value = course.room || "";
  document.getElementById("teacher-name").value = course.teacher || "";
  document.getElementById("start-period").value = course.startPeriod || 1;
  document.getElementById("period-count").value = course.periodCount || 3;
  document.getElementById("week-range").value = course.weekString || "";
  document.getElementById("course-color").value = course.color || "#3b82f6"; // Load color

  // Load notes náº¿u cĂ³
  const notesTextarea = document.getElementById("course-notes");
  if (notesTextarea) notesTextarea.value = course.notes || "";

  // 2. Xá»¬ LĂ NGĂ€Y THĂNG
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
  modalTitle.textContent = "Sá»­a MĂ´n Há»c";
  btnSave.textContent = "Cáº­p Nháº­t";
  btnDelete.style.display = "block";

  // 4. Render báº£ng tuáº§n
  renderWeekSelector(course.weeks);

  openSidebar();
}

function showCourseDetails(course, targetElement) {
  if (!course) return;
  const tooltip = document.getElementById("course-detail-tooltip");
  if (!tooltip) return;

  const dayLabel =
    course.day === 0
      ? "Tá»± do / Ghi chĂº"
      : course.day === 8
        ? "Chá»§ Nháº­t"
        : `Thá»© ${course.day}`;
  const periodLabel =
    course.day === 0
      ? ""
      : `Tiáº¿t ${course.startPeriod}-${
          course.startPeriod + course.periodCount - 1
        }`;
  const room = course.room || "?";
  const teacher = course.teacher || "?";
  const weeks =
    course.weekString ||
    (course.weeks && course.weeks.length
      ? course.weeks.join(", ")
      : "KhĂ´ng cĂ³");

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

  // Hiá»ƒn thá»‹ notes náº¿u cĂ³ - chuyá»ƒn links thĂ nh clickable
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
    const tooltipHeight = 200; // estimated

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
  localStorage.setItem("smartTimetableData", JSON.stringify(appData));
  renderAllViews();
}

function saveData() {
  localStorage.setItem("smartTimetableData", JSON.stringify(appData));
}

// --- 4. EVENT LISTENERS (Xá»¬ LĂ Sá»° KIá»†N) ---
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

  // MINI CALENDAR EVENTS
  const btnToggleCalendar = document.getElementById("btn-toggle-calendar");
  const btnPrevMonth = document.getElementById("btn-prev-month");
  const btnNextMonth = document.getElementById("btn-next-month");

  if (btnToggleCalendar) {
    btnToggleCalendar.addEventListener("click", toggleCalendar);
  }

  if (btnPrevMonth) {
    btnPrevMonth.addEventListener("click", () => {
      const monthYear = document.getElementById("calendar-month-year");
      const currentText = monthYear.textContent;
      const match = currentText.match(/ThĂ¡ng (\d+), (\d+)/);
      if (match) {
        let month = parseInt(match[1]) - 1;
        let year = parseInt(match[2]);
        if (month < 1) {
          month = 12;
          year--;
        }
        const newDate = new Date(year, month - 1);
        renderCalendar(newDate);
      }
    });
  }

  if (btnNextMonth) {
    btnNextMonth.addEventListener("click", () => {
      const monthYear = document.getElementById("calendar-month-year");
      const currentText = monthYear.textContent;
      const match = currentText.match(/ThĂ¡ng (\d+), (\d+)/);
      if (match) {
        let month = parseInt(match[1]) + 1;
        let year = parseInt(match[2]);
        if (month > 12) {
          month = 1;
          year++;
        }
        const newDate = new Date(year, month - 1);
        renderCalendar(newDate);
      }
    });
  }

  // Close calendar when clicking outside
  document.addEventListener("click", (e) => {
    const calendar = document.getElementById("mini-calendar");
    const btn = document.getElementById("btn-toggle-calendar");
    if (
      calendar &&
      btn &&
      !calendar.contains(e.target) &&
      !btn.contains(e.target)
    ) {
      if (calendar.style.display === "block") {
        closeCalendar();
      }
    }
  });

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

  // A. TIMELINE NAVIGATION
  const weekList = document.getElementById("week-list");
  if (weekList) {
    weekList.addEventListener("click", (e) => {
      if (e.target.classList.contains("week-chip")) {
        const w = parseInt(e.target.dataset.week);
        currentViewWeek = w;
        setActiveWeek(w);
        renderAllViews();
      }
    });
  }

  const btnPrevWeek = document.getElementById("btn-prev-week");
  if (btnPrevWeek) {
    btnPrevWeek.addEventListener("click", () => {
      if (currentViewWeek > 22) {
        currentViewWeek--;
        setActiveWeek(currentViewWeek);
        renderAllViews();
      }
    });
  }

  const btnNextWeek = document.getElementById("btn-next-week");
  if (btnNextWeek) {
    btnNextWeek.addEventListener("click", () => {
      if (currentViewWeek < 22 + TOTAL_WEEKS_RENDER) {
        currentViewWeek++;
        setActiveWeek(currentViewWeek);
        renderAllViews();
      }
    });
  }

  // Timetable tab week navigation
  const btnPrevWeek2 = document.getElementById("btn-prev-week-2");
  if (btnPrevWeek2) {
    btnPrevWeek2.addEventListener("click", () => {
      if (currentViewWeek > 22) {
        currentViewWeek--;
        setActiveWeek(currentViewWeek);
        renderAllViews();
      }
    });
  }

  const btnNextWeek2 = document.getElementById("btn-next-week-2");
  if (btnNextWeek2) {
    btnNextWeek2.addEventListener("click", () => {
      if (currentViewWeek < 22 + TOTAL_WEEKS_RENDER) {
        currentViewWeek++;
        setActiveWeek(currentViewWeek);
        renderAllViews();
      }
    });
  }

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

  // NĂºt Chá»n Táº¥t Cáº£ (Trong Sidebar)
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

  // NĂºt Chá»n Tuáº§n Cháºµn/Láº»
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

  // NĂºt SAVE
  btnSave.addEventListener("click", (e) => {
    e.preventDefault();

    // --- VALIDATION LOGIC ---
    const name = document.getElementById("subject-name").value.trim();
    if (!name) {
      alert("TĂªn mĂ´n há»c khĂ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng!");
      return;
    }

    const weeks = getSelectedWeeksFromUI();
    const day = parseInt(document.getElementById("day-select").value);
    if (day !== 0 && weeks.length === 0) {
      alert("Vui lĂ²ng chá»n Ă­t nháº¥t má»™t tuáº§n há»c cho mĂ´n nĂ y!");
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
      color: document.getElementById("course-color").value, // Save color
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
          `Lá»‹ch bá»‹ trĂ¹ng!\n\nMĂ´n "${formCourse.name}" trĂ¹ng lá»‹ch vá»›i mĂ´n "${existingCourse.name}" vĂ o cĂ¹ng thá»i gian, cĂ¹ng ngĂ y.`,
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

  // NĂºt DELETE
  btnDelete.addEventListener("click", () => {
    if (confirm("Cháº¯c cháº¯n xĂ³a mĂ´n nĂ y?")) {
      appData.courses = appData.courses.filter(
        (c) => c.id != editIdInput.value,
      );
      saveAndRender();
      closeSidebar();
    }
  });

  // C. DATE PICKER AUTO-SELECT (Trong Sidebar)
  const dStart = document.getElementById("start-date-picker");
  const dEnd = document.getElementById("end-date-picker");

  const autoSelectWeeks = () => {
    if (dStart.value && dEnd.value) {
      const sWeek = getRealWeekFromDate(dStart.value);
      const eWeek = getRealWeekFromDate(dEnd.value);

      if (sWeek && eWeek) {
        // Tá»± Ä‘á»™ng tick cĂ¡c checkbox trong Modal
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
      alert("âœ… Ghi chĂº Ä‘Ă£ Ä‘Æ°á»£c lÆ°u!");
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

  // Má»Ÿ Settings Modal
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

  // LÆ°u Settings
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener("click", () => {
      const newStartDate = document.getElementById("setting-start-date").value;
      const newStartWeek = parseInt(
        document.getElementById("setting-start-week").value,
      );

      if (newStartDate && newStartWeek) {
        appData.settings.startDate = newStartDate;
        appData.settings.startWeek = newStartWeek;
        setSystemConfig(newStartDate, newStartWeek); // Ăp dá»¥ng cáº¥u hĂ¬nh má»›i
        currentViewWeek = newStartWeek; // Äáº·t láº¡i tuáº§n hiá»ƒn thá»‹ vá» tuáº§n báº¯t Ä‘áº§u
        saveAndRender(); // LÆ°u vĂ  render láº¡i toĂ n bá»™
        settingsModal.close();
        alert("Cáº¥u hĂ¬nh há»‡ thá»‘ng Ä‘Ă£ Ä‘Æ°á»£c lÆ°u!");
      } else {
        alert("Vui lĂ²ng nháº­p Ä‘áº§y Ä‘á»§ ngĂ y vĂ  tuáº§n báº¯t Ä‘áº§u!");
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
        alert("ThĂ´ng tin ngĂ y khĂ´ng há»£p lá»‡ (NgoĂ i há»c ká»³)!");
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
        .then(() => alert("ÄĂ£ copy dá»¯ liá»‡u vĂ o Clipboard!"));
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
            throw new Error("JSON rá»—ng hoáº·c khĂ´ng há»£p lá»‡.");
          }

          // Case A (Format cÅ©): JSON lĂ  má»™t Máº£ng
          if (Array.isArray(parsed)) {
            appData.courses = parsed;
            alert(
              "Import thĂ nh cĂ´ng! (Dá»¯ liá»‡u mĂ´n há»c Ä‘Ă£ Ä‘Æ°á»£c náº¡p)",
            );
          }
          // Case B (Format má»›i): JSON lĂ  má»™t Object
          else if (typeof parsed === "object" && parsed.courses) {
            // Cáº­p nháº­t toĂ n bá»™, Ä‘áº£m báº£o cĂ¡c key khĂ´ng thiáº¿u
            appData = {
              settings: { startDate: "2026-01-26", startWeek: 22 },
              holidays: [],
              generalNotes: "",
              ...parsed,
            };
            alert(
              "Import thĂ nh cĂ´ng! (ToĂ n bá»™ dá»¯ liá»‡u Ä‘Ă£ Ä‘Æ°á»£c náº¡p)",
            );
          } else {
            throw new Error("Äá»‹nh dáº¡ng JSON khĂ´ng Ä‘Æ°á»£c há»— trá»£.");
          }

          setSystemConfig(
            appData.settings.startDate,
            appData.settings.startWeek,
          );
          currentViewWeek = appData.settings.startWeek;
          saveAndRender();
          importModal.close();
        } catch (e) {
          alert(`Lá»—i format JSON!\n\nChi tiáº¿t: ${e.message}`);
        }
      } else {
        alert("Vui lĂ²ng dĂ¡n dá»¯ liá»‡u vĂ o Ă´ trá»‘ng.");
      }
    });
  }

  // TAB NAVIGATION
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.dataset.tab;

      // Remove active class from all tabs and contents
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      // Add active class to clicked tab and corresponding content
      btn.classList.add("active");
      const targetContent = document.getElementById(`tab-${targetTab}`);
      if (targetContent) {
        targetContent.classList.add("active");
      }

      // Sync week dropdowns
      if (targetTab === "timetable") {
        syncWeekDropdowns();
      }

      // Load settings tab data
      if (targetTab === "settings") {
        loadSettingsTab();
      }
    });
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
  const weekDropdownHeader = document.getElementById("week-dropdown-header");
  const weekDropdown2 = document.getElementById("week-dropdown-2");

  if (weekDropdownHeader && weekDropdown2) {
    // Sync second dropdown with header dropdown
    weekDropdown2.innerHTML = weekDropdownHeader.innerHTML;
    weekDropdown2.value = weekDropdownHeader.value;
  }
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
      '<p style="color: var(--color-text-gray); padding: 12px; text-align: center;">ChÆ°a cĂ³ lá»‹ch nghá»‰</p>';
    return;
  }

  appData.holidays.forEach((holiday, index) => {
    const item = document.createElement("div");
    item.className = "holiday-item";
    item.innerHTML = `
      <span class="holiday-item-name">${holiday.name}</span>
      <span class="holiday-item-weeks">Tuáº§n: ${holiday.weeks.join(", ")}</span>
      <button class="btn-delete-holiday" data-index="${index}">Ă—</button>
    `;
    container.appendChild(item);
  });

  // Attach delete handlers
  container.querySelectorAll(".btn-delete-holiday").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index);
      if (confirm("XĂ³a ngĂ y nghá»‰ nĂ y?")) {
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
        alert("CĂ i Ä‘áº·t ká»³ há»c Ä‘Ă£ Ä‘Æ°á»£c lÆ°u!");
      } else {
        alert("Vui lĂ²ng nháº­p Ä‘áº§y Ä‘á»§ thĂ´ng tin!");
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
          "Báº N CHáº®C CHáº®N MUá»N XĂ“A TOĂ€N Bá»˜ Dá»® LIá»†U?\n\nHĂ nh Ä‘á»™ng nĂ y KHĂ”NG THá»‚ HOĂ€N TĂC!",
        )
      ) {
        if (confirm("XĂ¡c nháº­n láº§n cuá»‘i: XĂ“A Táº¤T Cáº¢ dá»¯ liá»‡u?")) {
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

  // --- ASSIGNMENT EVENTS ---
  setupAssignmentEvents();

  // --- EXAM EVENTS ---
  setupExamEvents();

  // --- ATTENDANCE EVENTS ---
  setupAttendanceEvents();
}

// --- ASSIGNMENT FUNCTIONS ---
function setupAssignmentEvents() {
  const btnAddAssignment = document.getElementById("btn-add-assignment");
  const assignmentModal = document.getElementById("assignment-modal");
  const btnSaveAssignment = document.getElementById("btn-save-assignment");
  const assignmentFilter = document.getElementById("assignment-filter");
  const assignmentSort = document.getElementById("assignment-sort");

  // Open modal to add new assignment
  if (btnAddAssignment) {
    btnAddAssignment.addEventListener("click", () => {
      openAssignmentModal();
    });
  }

  // Save assignment
  if (btnSaveAssignment) {
    btnSaveAssignment.addEventListener("click", () => {
      saveAssignment();
      assignmentModal.close();
      renderAssignments();
    });
  }

  // Filter and sort
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

  // Populate course dropdown
  courseSelect.innerHTML = '<option value="">-- Chá»n mĂ´n há»c --</option>';
  appData.courses.forEach((course) => {
    const option = document.createElement("option");
    option.value = course.id;
    option.textContent = course.name;
    courseSelect.appendChild(option);
  });

  // If editing existing assignment
  if (assignmentId) {
    const assignment = appData.assignments.find((a) => a.id === assignmentId);
    if (assignment) {
      modalTitle.textContent = "Chá»‰nh Sá»­a BĂ i Táº­p";
      courseSelect.value = assignment.courseId;
      titleInput.value = assignment.title;
      descInput.value = assignment.description || "";
      deadlineInput.value = assignment.deadline;
      prioritySelect.value = assignment.priority;
      modal.dataset.editId = assignmentId;
    }
  } else {
    modalTitle.textContent = "ThĂªm BĂ i Táº­p Má»›i";
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
    alert("Vui lĂ²ng Ä‘iá»n Ä‘áº§y Ä‘á»§ thĂ´ng tin bĂ i táº­p!");
    return;
  }

  const course = appData.courses.find((c) => c.id === courseId);
  const courseName = course ? course.name : "Unknown";

  const editId = modal.dataset.editId;

  if (editId) {
    // Update existing assignment
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
    // Create new assignment
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

  saveData();
}

function deleteAssignment(id) {
  if (confirm("Báº¡n cĂ³ cháº¯c muá»‘n xĂ³a bĂ i táº­p nĂ y?")) {
    appData.assignments = appData.assignments.filter((a) => a.id !== id);
    saveData();
    renderAssignments();
  }
}

function toggleAssignmentComplete(id) {
  const assignment = appData.assignments.find((a) => a.id === id);
  if (assignment) {
    assignment.completed = !assignment.completed;
    saveData();
    renderAssignments();
  }
}

function renderAssignments() {
  const container = document.getElementById("assignments-list");
  const filterValue = document.getElementById("assignment-filter").value;
  const sortValue = document.getElementById("assignment-sort").value;

  if (!container) return;

  // Filter assignments
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

  // Sort assignments
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

  // Update stats
  updateAssignmentStats();

  // Render assignments
  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="empty-state">ChÆ°a cĂ³ bĂ i táº­p nĂ o</div>';
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
  if (assignment.completed) {
    card.classList.add("completed");
  }

  const deadline = new Date(assignment.deadline);
  const now = new Date();
  const diffTime = deadline - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let deadlineClass = "";
  let deadlineText = "";

  if (assignment.completed) {
    deadlineClass = "deadline-completed";
    deadlineText = "HoĂ n thĂ nh";
  } else if (diffDays < 0) {
    deadlineClass = "deadline-overdue";
    deadlineText = `QuĂ¡ háº¡n ${Math.abs(diffDays)} ngĂ y`;
  } else if (diffDays === 0) {
    deadlineClass = "deadline-today";
    deadlineText = "HĂ´m nay";
  } else if (diffDays === 1) {
    deadlineClass = "deadline-tomorrow";
    deadlineText = "NgĂ y mai";
  } else if (diffDays <= 3) {
    deadlineClass = "deadline-urgent";
    deadlineText = `CĂ²n ${diffDays} ngĂ y`;
  } else if (diffDays <= 7) {
    deadlineClass = "deadline-soon";
    deadlineText = `CĂ²n ${diffDays} ngĂ y`;
  } else {
    deadlineClass = "deadline-normal";
    deadlineText = `CĂ²n ${diffDays} ngĂ y`;
  }

  const priorityLabels = {
    high: "Cao",
    medium: "Trung bĂ¬nh",
    low: "Tháº¥p",
  };

  card.innerHTML = `
    <div class="assignment-header">
      <div class="assignment-checkbox">
        <input 
          type="checkbox" 
          ${assignment.completed ? "checked" : ""} 
          onchange="window.toggleAssignmentComplete('${assignment.id}')"
        />
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
      <div class="assignment-deadline-full">
        Háº¡n ná»™p: ${formatDeadline(deadline)}
      </div>
      <div class="assignment-actions">
        <button class="btn-icon" onclick="window.openAssignmentModal('${assignment.id}')" title="Chá»‰nh sá»­a">
          <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-icon" onclick="window.deleteAssignment('${assignment.id}')" title="XĂ³a">
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

  document.getElementById("total-assignments").textContent = total;
  document.getElementById("active-assignments").textContent = active;
  document.getElementById("completed-assignments").textContent = completed;
  document.getElementById("overdue-assignments").textContent = overdue;
}

// Expose functions to window for onclick handlers
window.openAssignmentModal = openAssignmentModal;
window.deleteAssignment = deleteAssignment;
window.toggleAssignmentComplete = toggleAssignmentComplete;

// --- EXAM FUNCTIONS ---
function setupExamEvents() {
  const btnAddExam = document.getElementById("btn-add-exam");
  const examModal = document.getElementById("exam-modal");
  const btnSaveExam = document.getElementById("btn-save-exam");
  const examFilter = document.getElementById("exam-filter");
  const examSort = document.getElementById("exam-sort");

  // Open modal to add new exam
  if (btnAddExam) {
    btnAddExam.addEventListener("click", () => {
      openExamModal();
    });
  }

  // Save exam
  if (btnSaveExam) {
    btnSaveExam.addEventListener("click", () => {
      saveExam();
      examModal.close();
      renderExams();
    });
  }

  // Filter and sort
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

  // Populate course dropdown
  courseSelect.innerHTML = '<option value="">-- Chá»n mĂ´n há»c --</option>';
  appData.courses.forEach((course) => {
    const option = document.createElement("option");
    option.value = course.id;
    option.textContent = course.name;
    courseSelect.appendChild(option);
  });

  // If editing existing exam
  if (examId) {
    const exam = appData.exams.find((e) => e.id === examId);
    if (exam) {
      modalTitle.textContent = "Chá»‰nh Sá»­a Lá»‹ch Thi";
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
    modalTitle.textContent = "ThĂªm Lá»‹ch Thi Má»›i";
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
    alert("Vui lĂ²ng Ä‘iá»n Ä‘áº§y Ä‘á»§ thĂ´ng tin lá»‹ch thi!");
    return;
  }

  const course = appData.courses.find((c) => c.id === courseId);
  const courseName = course ? course.name : "Unknown";

  const editId = modal.dataset.editId;

  if (editId) {
    // Update existing exam
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
    // Create new exam
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

  saveData();
}

function deleteExam(id) {
  if (confirm("Báº¡n cĂ³ cháº¯c muá»‘n xĂ³a lá»‹ch thi nĂ y?")) {
    appData.exams = appData.exams.filter((e) => e.id !== id);
    saveData();
    renderExams();
  }
}

function toggleExamComplete(id) {
  const exam = appData.exams.find((e) => e.id === id);
  if (exam) {
    exam.completed = !exam.completed;
    saveData();
    renderExams();
  }
}

function renderExams() {
  const container = document.getElementById("exams-list");
  const filterValue = document.getElementById("exam-filter").value;
  const sortValue = document.getElementById("exam-sort").value;

  if (!container) return;

  // Filter exams
  let filtered = [...appData.exams];
  const now = new Date();

  if (filterValue === "upcoming") {
    filtered = filtered.filter((e) => !e.completed && new Date(e.date) >= now);
  } else if (filterValue === "completed") {
    filtered = filtered.filter((e) => e.completed);
  }

  // Sort exams
  if (sortValue === "date") {
    filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
  } else if (sortValue === "course") {
    filtered.sort((a, b) => a.courseName.localeCompare(b.courseName));
  }

  // Update stats
  updateExamStats();

  // Render exams
  if (filtered.length === 0) {
    container.innerHTML =
      '<div class="empty-state">ChÆ°a cĂ³ lá»‹ch thi nĂ o</div>';
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
  if (exam.completed) {
    card.classList.add("completed");
  }

  const examDate = new Date(exam.date);
  const now = new Date();
  const diffTime = examDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let dateClass = "";
  let dateText = "";

  if (exam.completed) {
    dateClass = "exam-completed";
    dateText = "ÄĂ£ thi";
  } else if (diffDays < 0) {
    dateClass = "exam-passed";
    dateText = `ÄĂ£ qua ${Math.abs(diffDays)} ngĂ y`;
  } else if (diffDays === 0) {
    dateClass = "exam-today";
    dateText = "HĂ´m nay";
  } else if (diffDays === 1) {
    dateClass = "exam-tomorrow";
    dateText = "NgĂ y mai";
  } else if (diffDays <= 3) {
    dateClass = "exam-urgent";
    dateText = `CĂ²n ${diffDays} ngĂ y`;
  } else if (diffDays <= 7) {
    dateClass = "exam-soon";
    dateText = `CĂ²n ${diffDays} ngĂ y`;
  } else {
    dateClass = "exam-normal";
    dateText = `CĂ²n ${diffDays} ngĂ y`;
  }

  const formatLabels = {
    written: "Tá»± luáº­n",
    test: "Tráº¯c nghiá»‡m",
    online: "Trá»±c tuyáº¿n",
    practical: "Thá»±c hĂ nh",
    other: "KhĂ¡c",
  };

  card.innerHTML = `
    <div class="exam-header">
      <div class="exam-checkbox">
        <input 
          type="checkbox" 
          ${exam.completed ? "checked" : ""} 
          onchange="window.toggleExamComplete('${exam.id}')"
        />
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
        <span>${exam.duration} phĂºt</span>
      </div>
      ${
        exam.room
          ? `
      <div class="exam-detail-item">
        <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span>PhĂ²ng ${exam.room}</span>
      </div>
      `
          : ""
      }
    </div>
    ${exam.notes ? `<div class="exam-notes">${exam.notes}</div>` : ""}
    <div class="exam-footer">
      <div class="exam-actions">
        <button class="btn-icon" onclick="window.openExamModal('${exam.id}')" title="Chá»‰nh sá»­a">
          <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-icon" onclick="window.deleteExam('${exam.id}')" title="XĂ³a">
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
  const weekdays = [
    "CN",
    "Thá»© 2",
    "Thá»© 3",
    "Thá»© 4",
    "Thá»© 5",
    "Thá»© 6",
    "Thá»© 7",
  ];
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

  // Calculate this week exams
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const thisWeek = appData.exams.filter((e) => {
    const examDate = new Date(e.date);
    return !e.completed && examDate >= startOfWeek && examDate < endOfWeek;
  }).length;

  document.getElementById("total-exams").textContent = total;
  document.getElementById("upcoming-exams").textContent = upcoming;
  document.getElementById("this-week-exams").textContent = thisWeek;
  document.getElementById("completed-exams").textContent = completed;
}

// Expose functions to window for onclick handlers
window.openExamModal = openExamModal;
window.deleteExam = deleteExam;
window.toggleExamComplete = toggleExamComplete;

// --- ATTENDANCE FUNCTIONS ---
function setupAttendanceEvents() {
  const courseFilter = document.getElementById("attendance-course-filter");
  const weekFilter = document.getElementById("attendance-week-filter");

  if (courseFilter) {
    courseFilter.addEventListener("change", renderAttendance);
  }
  if (weekFilter) {
    weekFilter.addEventListener("change", renderAttendance);
  }
}

function renderAttendance() {
  const container = document.getElementById("attendance-course-list");
  const courseFilter = document.getElementById("attendance-course-filter");
  const weekFilter = document.getElementById("attendance-week-filter");

  if (!container || !courseFilter || !weekFilter) return;

  // Populate course filter if empty
  if (courseFilter.options.length === 1) {
    appData.courses.forEach((course) => {
      const option = document.createElement("option");
      option.value = course.id;
      option.textContent = course.name;
      courseFilter.appendChild(option);
    });
  }

  const selectedCourseId = courseFilter.value;
  const selectedWeek = weekFilter.value;

  // Filter courses
  let courses = appData.courses;
  if (selectedCourseId !== "all") {
    courses = courses.filter(
      (c) => c.id === selectedCourseId || c.id.toString() === selectedCourseId,
    );
  }

  // Update stats
  updateAttendanceStats();

  // Render courses
  if (courses.length === 0) {
    container.innerHTML =
      '<div class="empty-state">ChÆ°a cĂ³ mĂ´n há»c nĂ o</div>';
    return;
  }

  container.innerHTML = "";
  courses.forEach((course) => {
    const card = createAttendanceCourseCard(course, selectedWeek);
    container.appendChild(card);
  });
}

function createAttendanceCourseCard(course, weekFilter) {
  const card = document.createElement("div");
  card.className = "attendance-course-card";

  // Get course sessions based on week filter
  const sessionData = getCourseSessions(course, weekFilter);
  const sessions = sessionData.sessions;
  const totalPlanned = sessionData.totalPlanned;

  // Calculate attendance stats for this course
  const stats = calculateCourseAttendanceStats(course.id, sessions);

  // Hiá»ƒn thá»‹ khĂ¡c nhau theo filter
  let displayText = "";
  if (weekFilter === "current") {
    // Tuáº§n hiá»‡n táº¡i: 0/0 hoáº·c 1/1
    displayText = `${stats.attended}/${stats.total}`;
  } else {
    // Táº¥t cáº£ tuáº§n: 1/15
    displayText = `${stats.attended}/${totalPlanned}`;
  }

  card.innerHTML = `
    <div class="attendance-course-header">
      <div class="attendance-course-info">
        <h4>${course.name}</h4>
        <p>${course.room} - ${course.teacher}</p>
      </div>
      <div class="attendance-course-stats">
        <span class="attendance-stat">${displayText} buá»•i</span>
        <span class="attendance-rate-badge ${stats.rate >= 80 ? "high" : stats.rate >= 50 ? "medium" : "low"}">
          Äi ${stats.rate}%
        </span>
      </div>
    </div>
    <div class="attendance-sessions">
      ${sessions.length > 0 ? sessions.map((session) => createSessionElement(course.id, session)).join("") : '<div class="empty-state">ChÆ°a cĂ³ buá»•i há»c nĂ o</div>'}
    </div>
  `;

  return card;
}

function getCourseSessions(course, weekFilter) {
  const sessions = [];
  const allSessions = []; // Tá»•ng sá»‘ buá»•i dá»± kiáº¿n
  const now = new Date();
  const currentWeek = getRealWeekFromDate(now);

  // Determine which weeks to show
  let weeksToShow = course.weeks;
  if (weekFilter === "current") {
    // Show only sessions from current week and earlier
    weeksToShow = course.weeks.filter((w) => w <= currentWeek);
  }

  // Check which weeks are holidays
  const holidayWeeks = new Set();
  appData.holidays.forEach((holiday) => {
    holiday.weeks.forEach((w) => holidayWeeks.add(w));
  });

  // TĂ­nh tá»•ng buá»•i dá»± kiáº¿n (khĂ´ng ká»ƒ lá»…)
  course.weeks.forEach((week) => {
    if (!holidayWeeks.has(week)) {
      allSessions.push(week);
    }
  });

  // For each week, create session dates
  weeksToShow.forEach((week) => {
    // Skip if this week is a holiday
    if (holidayWeeks.has(week)) {
      return;
    }

    const dates = getDatesForWeekISO(week);
    const sessionDateISO = dates[course.day - 2]; // day: 2=Monday, 3=Tuesday, etc.

    if (sessionDateISO) {
      // Parse ISO date chĂ­nh xĂ¡c (YYYY-MM-DD)
      const sessionDate = new Date(sessionDateISO + "T00:00:00");

      // TĂ­nh giá» káº¿t thĂºc buá»•i há»c (tiáº¿t cuá»‘i + 50 phĂºt)
      const endPeriod = course.startPeriod + course.periodCount - 1;
      const endTime = getPeriodTime(endPeriod);

      if (endTime) {
        // Parse giá» káº¿t thĂºc (format: "07h00")
        const [hours, minutes] = endTime
          .replace("h", ":")
          .split(":")
          .map(Number);
        const sessionEndDateTime = new Date(sessionDate);
        sessionEndDateTime.setHours(hours, minutes + 50, 0, 0); // +50 phĂºt cho tiáº¿t há»c

        // Chá»‰ hiá»ƒn thá»‹ cĂ¡c buá»•i ÄĂƒ Káº¾T THĂC
        if (now >= sessionEndDateTime) {
          sessions.push({
            date: sessionDateISO,
            week: week,
            displayDate: formatSessionDate(sessionDate),
          });
        }
      }
    }
  });

  return {
    sessions: sessions.sort((a, b) => new Date(b.date) - new Date(a.date)),
    totalPlanned:
      weekFilter === "current" ? sessions.length : allSessions.length, // Náº¿u tuáº§n hiá»‡n táº¡i thĂ¬ chá»‰ tĂ­nh buá»•i Ä‘Ă£ qua
  };
}

function createSessionElement(courseId, session) {
  const attendanceRecord = appData.attendance[courseId]?.[session.date];
  const status = attendanceRecord?.status || "unmarked";

  const statusLabels = {
    present: "ÄĂ£ Ä‘i",
    absent: "Váº¯ng",
    late: "Äi muá»™n",
    unmarked: "ChÆ°a Ä‘Ă¡nh dáº¥u",
  };

  return `
    <div class="attendance-session ${status}">
      <div class="session-date">
        <div class="session-day">${session.displayDate.day}</div>
        <div class="session-full-date">${session.displayDate.full}</div>
      </div>
      <div class="session-status">
        <div class="status-buttons">
          <button 
            class="status-btn ${status === "present" ? "active" : ""}" 
            onclick="window.markAttendance('${courseId}', '${session.date}', 'present')"
            title="ÄĂ£ Ä‘i"
          >
            <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
          <button 
            class="status-btn ${status === "late" ? "active" : ""}" 
            onclick="window.markAttendance('${courseId}', '${session.date}', 'late')"
            title="Äi muá»™n"
          >
            <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </button>
          <button 
            class="status-btn ${status === "absent" ? "active" : ""}" 
            onclick="window.markAttendance('${courseId}', '${session.date}', 'absent')"
            title="Váº¯ng"
          >
            <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="status-label">${statusLabels[status]}</div>
      </div>
    </div>
  `;
}

function formatSessionDate(date) {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const weekdays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const weekday = weekdays[date.getDay()];

  return {
    day: weekday,
    full: `${day}/${month}/${year}`,
  };
}

function markAttendance(courseId, date, status) {
  if (!appData.attendance[courseId]) {
    appData.attendance[courseId] = {};
  }

  // Toggle: if clicking same status, unmark it
  if (appData.attendance[courseId][date]?.status === status) {
    delete appData.attendance[courseId][date];
  } else {
    appData.attendance[courseId][date] = {
      status: status,
      timestamp: new Date().toISOString(),
    };
  }

  saveData();
  renderAttendance();
}

function calculateCourseAttendanceStats(courseId, sessions) {
  const total = sessions.length;
  let attended = 0;

  sessions.forEach((session) => {
    const record = appData.attendance[courseId]?.[session.date];
    if (record?.status === "present" || record?.status === "late") {
      attended++;
    }
  });

  const rate = total > 0 ? Math.round((attended / total) * 100) : 0;

  return { total, attended, rate };
}

function updateAttendanceStats() {
  let totalSessions = 0;
  let attendedSessions = 0;
  let absentSessions = 0;

  const now = new Date();

  // Check which weeks are holidays
  const holidayWeeks = new Set();
  appData.holidays.forEach((holiday) => {
    holiday.weeks.forEach((w) => holidayWeeks.add(w));
  });

  appData.courses.forEach((course) => {
    course.weeks.forEach((week) => {
      // Skip holiday weeks
      if (holidayWeeks.has(week)) {
        return;
      }

      const dates = getDatesForWeekISO(week);
      const sessionDateISO = dates[course.day - 2];

      if (sessionDateISO) {
        const sessionDate = new Date(sessionDateISO + "T00:00:00");

        // TĂ­nh giá» káº¿t thĂºc buá»•i há»c (tiáº¿t cuá»‘i + 50 phĂºt)
        const endPeriod = course.startPeriod + course.periodCount - 1;
        const endTime = getPeriodTime(endPeriod);

        if (endTime) {
          // Parse giá» káº¿t thĂºc (format: "07h00")
          const [hours, minutes] = endTime
            .replace("h", ":")
            .split(":")
            .map(Number);
          const sessionEndDateTime = new Date(sessionDate);
          sessionEndDateTime.setHours(hours, minutes + 50, 0, 0); // +50 phĂºt cho tiáº¿t há»c

          // Chá»‰ tĂ­nh buá»•i há»c Ä‘Ă£ káº¿t thĂºc
          if (now >= sessionEndDateTime) {
            totalSessions++;

            const record = appData.attendance[course.id]?.[sessionDateISO];
            if (record?.status === "present" || record?.status === "late") {
              attendedSessions++;
            } else if (record?.status === "absent") {
              absentSessions++;
            }
          }
        }
      }
    });
  });

  const rate =
    totalSessions > 0
      ? Math.round((attendedSessions / totalSessions) * 100)
      : 0;

  document.getElementById("total-sessions").textContent = totalSessions;
  document.getElementById("attended-sessions").textContent = attendedSessions;
  document.getElementById("absent-sessions").textContent = absentSessions;
  document.getElementById("attendance-rate").textContent = rate + "%";
}

// Expose functions to window
window.markAttendance = markAttendance;

function calculateTotalAttendanceStats() {
  let totalSessions = 0;
  let attendedSessions = 0;

  const now = new Date();

  // Check which weeks are holidays
  const holidayWeeks = new Set();
  appData.holidays.forEach((holiday) => {
    holiday.weeks.forEach((w) => holidayWeeks.add(w));
  });

  appData.courses.forEach((course) => {
    course.weeks.forEach((week) => {
      // Skip holiday weeks
      if (holidayWeeks.has(week)) {
        return;
      }

      const dates = getDatesForWeekISO(week);
      const sessionDateISO = dates[course.day - 2];

      if (sessionDateISO) {
        const sessionDate = new Date(sessionDateISO + "T00:00:00");

        // TĂ­nh giá» káº¿t thĂºc buá»•i há»c (tiáº¿t cuá»‘i + 50 phĂºt)
        const endPeriod = course.startPeriod + course.periodCount - 1;
        const endTime = getPeriodTime(endPeriod);

        if (endTime) {
          // Parse giá» káº¿t thĂºc (format: "07h00")
          const [hours, minutes] = endTime
            .replace("h", ":")
            .split(":")
            .map(Number);
          const sessionEndDateTime = new Date(sessionDate);
          sessionEndDateTime.setHours(hours, minutes + 50, 0, 0); // +50 phĂºt cho tiáº¿t há»c

          // Chá»‰ tĂ­nh buá»•i há»c Ä‘Ă£ káº¿t thĂºc
          if (now >= sessionEndDateTime) {
            totalSessions++;

            const record = appData.attendance[course.id]?.[sessionDateISO];
            if (record?.status === "present" || record?.status === "late") {
              attendedSessions++;
            }
          }
        }
      }
    });
  });

  return { total: totalSessions, attended: attendedSessions };
}

document.addEventListener("DOMContentLoaded", init);
