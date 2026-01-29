/**
 * MAIN CONTROLLER
 * Điều phối luồng dữ liệu và sự kiện.
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
let currentViewWeek = appData.settings.startWeek; // Tuần mặc định
const TOTAL_WEEKS_RENDER = 26; // Render từ tuần 22 -> 47

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

// --- 1. INIT (KHỞI TẠO) ---
function init() {
  // Load Data
  const stored = localStorage.getItem("smartTimetableData");
  if (stored) {
    try {
      const parsedData = JSON.parse(stored);
      // Merge: Giữ lại data cũ và thêm settings nếu có
      appData = { ...appData, ...parsedData };

      // Patch logic: Nếu data cũ chưa có các key mới thì thêm vào
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
  currentViewWeek = appData.settings.startWeek; // Cập nhật tuần hiện tại theo config

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
  renderSmartNotes();

  // Setup Events
  setupEventListeners();
  setupNotesListeners();

  // Setup tooltip hover behavior để giữ tooltip khi hover vào nó
  const tooltip = document.getElementById("course-detail-tooltip");
  if (tooltip) {
    tooltip.addEventListener("mouseenter", cancelCloseDetail);
    tooltip.addEventListener("mouseleave", scheduleCloseDetail);
  }
}

/**
 * Gắn sự kiện cho card/bảng
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
      if (confirm("Bạn chắc chắn muốn xóa môn này vĩnh viễn?")) {
        appData.courses = appData.courses.filter((c) => c.id !== id);
        saveAndRender();
      }
    });
  });
}

/**
 * Render lại toàn bộ màn hình (Grid + Notes + Holiday Banner)
 */
function renderAllViews() {
  // 1. Tách môn học vs Ghi chú
  const timedCourses = appData.courses.filter((c) => c.day !== 0);
  const noteCourses = appData.courses.filter((c) => c.day === 0);

  // 2. Render UI
  renderGridHeader(currentViewWeek); // Render header with dates
  renderSchedule(timedCourses, currentViewWeek);
  renderNotes(noteCourses);
  renderNotes(noteCourses, "notes-list-2"); // Render notes for notes tab
  renderCourseListTable(appData.courses);
  // 3. Logic hiển thị thông báo ngày nghỉ
  checkAndDisplayHoliday(currentViewWeek);

  // 4. Update breadcrumb
  updateBreadcrumb(currentViewWeek);

  // 5. Gắn sự kiện Click-to-Edit
  attachEditEvents();

  // 6. Update favorite button states
  updateFavoriteButtons();

  // 7. Render dashboard analytics
  renderDashboard(currentViewWeek);

  // 8. Đồng bộ dropdown tuần
  updateWeekDropdown(currentViewWeek);
  syncWeekDropdowns();
}
/**
 * Helper: Chuyển ngày từ VN (26/01/2026) sang Input (2026-01-26)
 */
function convertDateToISO(dateStr) {
  if (!dateStr) return "";
  // Nếu đã là dạng yyyy-mm-dd thì giữ nguyên
  if (dateStr.includes("-")) return dateStr;

  // Nếu là dạng dd/mm/yyyy
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return "";
}
// --- 2. LOGIC NGÀY NGHỈ (HOLIDAY) ---
function checkAndDisplayHoliday(week) {
  if (!appData.holidays) return;
  const activeHolidays = appData.holidays.filter((h) => h.weeks.includes(week));

  if (activeHolidays.length > 0) {
    const names = activeHolidays.map((h) => h.name).join(" & ");
    holidayBanner.textContent = `Lịch nghỉ: ${names}`;
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
      '<li style="padding:10px; color:#999;">Chưa có dữ liệu.</li>';
    return;
  }

  appData.holidays.forEach((h, index) => {
    const li = document.createElement("li");
    li.className = "holiday-item";
    li.innerHTML = `
            <div><strong>${h.name}</strong> <small>(${h.weeks.length} tuần)</small></div>
            <button class="btn-remove-holiday" data-index="${index}">❌</button>
        `;
    list.appendChild(li);
  });

  // Gắn sự kiện xóa
  list.querySelectorAll(".btn-remove-holiday").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.index);
      if (confirm("Xóa ngày nghỉ này?")) {
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

  // Dải ngày của tuần
  const weekDates = getDatesForWeek(week);
  const rangeStr =
    weekDates && weekDates.length
      ? `${weekDates[0]} - ${weekDates[6] || weekDates[weekDates.length - 1]}`
      : "";

  const summaryWeek = document.getElementById("summary-week");
  const summaryRange = document.getElementById("summary-range");

  if (summaryWeek) summaryWeek.textContent = `Tuần ${weekNum}`;
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
      opt.textContent = `Tuần ${w}`;
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
 * Tính toán thống kê dashboard cho tuần hiện tại
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
  const hours = Math.round((totalPeriods * 50) / 60); // giả định 50 phút/tiết

  const favoritesCount = appData.favorites ? appData.favorites.length : 0;

  // Ngày nghỉ trong settings
  const holidays = appData.holidays || [];
  const holidayWeeks = new Set();
  holidays.forEach((holiday) => {
    holiday.weeks.forEach((w) => holidayWeeks.add(w));
  });

  // Lớp sắp tới - TÌM TRONG TẤT CẢ CÁC TUẦN
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

        // Tính giờ bắt đầu buổi học
        const startTime = getPeriodTime(course.startPeriod);
        if (startTime) {
          const [hours, minutes] = startTime
            .replace("h", ":")
            .split(":")
            .map(Number);
          const sessionStartDateTime = new Date(sessionDate);
          sessionStartDateTime.setHours(hours, minutes, 0, 0);

          // Chỉ lấy lớp chưa bắt đầu
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

  let nextTitle = "—";
  let nextMeta = "Chưa có lịch";

  if (upcomingClass) {
    const sessionDate = upcomingClass.sessionDate;
    const dayOfWeek = sessionDate.getDay();
    const dayLabel = dayOfWeek === 0 ? "Chủ Nhật" : `Thứ ${dayOfWeek + 1}`;

    // Format date
    const day = sessionDate.getDate();
    const month = sessionDate.getMonth() + 1;
    const dateStr = `${day}/${month}`;

    // Calculate time until class
    const hoursUntil = Math.floor(minTimeDiff / (1000 * 60 * 60));
    const daysUntil = Math.floor(hoursUntil / 24);

    let timeInfo = "";
    if (daysUntil > 0) {
      timeInfo = `${daysUntil} ngày nữa`;
    } else if (hoursUntil > 0) {
      timeInfo = `${hoursUntil} giờ nữa`;
    } else {
      const minutesUntil = Math.floor(minTimeDiff / (1000 * 60));
      timeInfo = `${minutesUntil} phút nữa`;
    }

    nextTitle = upcomingClass.name;
    nextMeta = `${dayLabel} ${dateStr}, Tiết ${upcomingClass.startPeriod} - ${upcomingClass.room || "?"} • ${timeInfo}`;
  }

  // Tải tuần theo ngày (để vẽ bar chart)
  const normalizeDay = (d) => {
    const n = parseInt(d);
    if (isNaN(n)) return 0;
    if (n === 0) return 8;
    if (n >= 2 && n <= 8) return n;
    if (n === 1) return 2;
    return n;
  };

  const loadByDay = Array(7).fill(0);
  const dayIndex = { 2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6 }; // Thứ 2..CN
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

  // Sử dụng constant TOTAL_WEEKS_RENDER và startWeek từ settings
  const totalWeeks = TOTAL_WEEKS_RENDER;
  const startWeek = appData.settings.startWeek || 22;

  // Tính tổng tiết theo lịch thực tế (periodCount × số tuần)
  let totalPeriods = 0;
  allCourses.forEach((course) => {
    if (course.day !== 0 && course.weeks && Array.isArray(course.weeks)) {
      // Số tiết mỗi buổi × số tuần có lịch
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
  // Đếm tất cả môn trong danh sách (không phân biệt tuần)
  const totalCourses = allCourses.length;
  const favoritesCount = allCourses.filter((c) => c.isFavorite).length;
  const attendanceStats = calculateTotalAttendanceStats();

  // Tính tổng buổi học theo lịch (không phải buổi đã điểm danh)
  let totalScheduledSessions = 0;
  allCourses.forEach((course) => {
    // Chỉ đếm môn có thời gian (không phải ghi chú)
    if (course.day !== 0 && course.weeks && Array.isArray(course.weeks)) {
      // Mỗi môn có 1 buổi/tuần, nhân với số tuần có lịch
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

  if (elLabelCourses) elLabelCourses.textContent = "Môn trong tuần";
  if (elMetaCourses) elMetaCourses.textContent = "Tất cả môn có lịch tuần này";
  if (chartTitle) chartTitle.textContent = "Biểu đồ tải tuần";
  if (chartHint) chartHint.textContent = "Số tiết theo ngày";

  if (elCourses) elCourses.textContent = stats.totalCourses;
  if (elPeriods) elPeriods.textContent = stats.totalPeriods;
  if (elHours) elHours.textContent = `≈ ${stats.hours} giờ`;
  if (elFav) elFav.textContent = stats.favoritesCount;
  if (elNextTitle) elNextTitle.textContent = stats.nextTitle;
  if (elNextMeta) elNextMeta.textContent = stats.nextMeta;

  // Hiển thị lại card "Lớp sắp tới" trong chế độ tuần
  const cardNextClass = document.getElementById("card-next-class");
  if (cardNextClass) cardNextClass.style.display = "";

  // Khôi phục label attendance cho chế độ tuần
  const cardAttendance = document.getElementById("card-attendance");
  const elAttendanceLabel = cardAttendance?.querySelector(".dash-label");
  const elAttendanceMeta = cardAttendance?.querySelector(".dash-meta");

  if (elAttendanceLabel) elAttendanceLabel.textContent = "Điểm danh";
  if (elAttendanceMeta) elAttendanceMeta.textContent = "Đã đi / Tổng buổi";

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
        '<li style="padding:10px; color: var(--color-text-gray);">Không có lịch nghỉ</li>';
    } else {
      stats.holidays.forEach((h) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <span>${h.name}</span>
          <span class="holiday-weeks">Tuần: ${h.weeks.join(", ")}</span>
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

  if (elLabelCourses) elLabelCourses.textContent = "Tổng môn học";
  if (elMetaCourses) elMetaCourses.textContent = "Tất cả môn trong danh sách";
  if (chartTitle) chartTitle.textContent = "Phân bổ theo tuần";
  if (chartHint) chartHint.textContent = "Số tiết mỗi tuần";

  if (elCourses) elCourses.textContent = stats.totalCourses;
  if (elPeriods) elPeriods.textContent = stats.totalPeriods;
  if (elHours) elHours.textContent = `≈ ${stats.hours} giờ`;
  if (elFav) elFav.textContent = stats.favoritesCount;

  // Ẩn card "Lớp sắp tới" trong chế độ toàn học kỳ
  const cardNextClass = document.getElementById("card-next-class");
  if (cardNextClass) cardNextClass.style.display = "none";

  // Hiển thị tổng buổi học theo lịch thay vì buổi đã điểm danh
  const cardAttendance = document.getElementById("card-attendance");
  const elAttendanceLabel = cardAttendance?.querySelector(".dash-label");
  const elAttendanceMeta = cardAttendance?.querySelector(".dash-meta");

  if (elAttendanceLabel) elAttendanceLabel.textContent = "Tổng buổi học";
  if (elAttendanceMeta) elAttendanceMeta.textContent = "Theo lịch toàn học kỳ";
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
      item.title = `Tuần ${weekData.week}: ${weekData.periods} tiết`;

      const fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.height = `${(weekData.periods / maxVal) * 100}%`;

      const value = document.createElement("div");
      value.className = "bar-value";
      value.textContent = weekData.periods;

      const label = document.createElement("div");
      label.className = "bar-label";
      // Hiển thị số tuần thực luôn
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
        '<li style="padding:10px; color: var(--color-text-gray);">Không có lịch nghỉ</li>';
    } else {
      allHolidays.forEach((h) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <span>${h.name}</span>
          <span class="holiday-weeks">Tuần: ${h.weeks.join(", ")}</span>
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
  monthYear.textContent = `Tháng ${month + 1}, ${year}`;

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
    searchResults.innerHTML = `<div class="search-result-item" style="cursor: default;">Không tìm thấy kết quả</div>`;
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
        <div class="search-result-meta">GV: ${course.teacher} | Phòng: ${course.room}</div>
      </div>
      <div class="search-result-badge">Tuần ${course.weeks[0] || "?"}</div>
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
  modalTitle.textContent = "Thêm Môn Học Mới";
  btnSave.textContent = "Lưu Môn Học";
  btnDelete.style.display = "none";

  // Render bảng chọn tuần trống
  renderWeekSelector([]);
  openSidebar();
}

function openSidebarToEdit(course) {
  // 1. Điền các thông tin cơ bản
  document.getElementById("subject-name").value = course.name;
  document.getElementById("day-select").value = course.day;
  document.getElementById("room-name").value = course.room || "";
  document.getElementById("teacher-name").value = course.teacher || "";
  document.getElementById("start-period").value = course.startPeriod || 1;
  document.getElementById("period-count").value = course.periodCount || 3;
  document.getElementById("week-range").value = course.weekString || "";
  document.getElementById("course-color").value = course.color || "#3b82f6"; // Load color

  // Load notes nếu có
  const notesTextarea = document.getElementById("course-notes");
  if (notesTextarea) notesTextarea.value = course.notes || "";

  // 2. XỬ LÝ NGÀY THÁNG
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
  modalTitle.textContent = "Sửa Môn Học";
  btnSave.textContent = "Cập Nhật";
  btnDelete.style.display = "block";

  // 4. Render bảng tuần
  renderWeekSelector(course.weeks);

  openSidebar();
}

function showCourseDetails(course, targetElement) {
  if (!course) return;
  const tooltip = document.getElementById("course-detail-tooltip");
  if (!tooltip) return;

  const dayLabel =
    course.day === 0
      ? "Tự do / Ghi chú"
      : course.day === 8
        ? "Chủ Nhật"
        : `Thứ ${course.day}`;
  const periodLabel =
    course.day === 0
      ? ""
      : `Tiết ${course.startPeriod}-${
          course.startPeriod + course.periodCount - 1
        }`;
  const room = course.room || "?";
  const teacher = course.teacher || "?";
  const weeks =
    course.weekString ||
    (course.weeks && course.weeks.length
      ? course.weeks.join(", ")
      : "Không có");

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

  // Hiển thị notes nếu có - chuyển links thành clickable
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

// --- 4. EVENT LISTENERS (XỬ LÝ SỰ KIỆN) ---
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
      const match = currentText.match(/Tháng (\d+), (\d+)/);
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
      const match = currentText.match(/Tháng (\d+), (\d+)/);
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

  // Nút Chọn Tất Cả (Trong Sidebar)
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

  // Nút Chọn Tuần Chẵn/Lẻ
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

  // Nút SAVE
  btnSave.addEventListener("click", (e) => {
    e.preventDefault();

    // --- VALIDATION LOGIC ---
    const name = document.getElementById("subject-name").value.trim();
    if (!name) {
      alert("Tên môn học không được để trống!");
      return;
    }

    const weeks = getSelectedWeeksFromUI();
    const day = parseInt(document.getElementById("day-select").value);
    if (day !== 0 && weeks.length === 0) {
      alert("Vui lòng chọn ít nhất một tuần học cho môn này!");
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
          `Lịch bị trùng!\n\nMôn "${formCourse.name}" trùng lịch với môn "${existingCourse.name}" vào cùng thời gian, cùng ngày.`,
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

  // Nút DELETE
  btnDelete.addEventListener("click", () => {
    if (confirm("Chắc chắn xóa môn này?")) {
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
        // Tự động tick các checkbox trong Modal
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
      alert("✅ Ghi chú đã được lưu!");
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

  // Mở Settings Modal
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

  // Lưu Settings
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener("click", () => {
      const newStartDate = document.getElementById("setting-start-date").value;
      const newStartWeek = parseInt(
        document.getElementById("setting-start-week").value,
      );

      if (newStartDate && newStartWeek) {
        appData.settings.startDate = newStartDate;
        appData.settings.startWeek = newStartWeek;
        setSystemConfig(newStartDate, newStartWeek); // Áp dụng cấu hình mới
        currentViewWeek = newStartWeek; // Đặt lại tuần hiển thị về tuần bắt đầu
        saveAndRender(); // Lưu và render lại toàn bộ
        settingsModal.close();
        alert("Cấu hình hệ thống đã được lưu!");
      } else {
        alert("Vui lòng nhập đầy đủ ngày và tuần bắt đầu!");
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
        alert("Thông tin ngày không hợp lệ (Ngoài học kỳ)!");
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
        .then(() => alert("Đã copy dữ liệu vào Clipboard!"));
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
            throw new Error("JSON rỗng hoặc không hợp lệ.");
          }

          // Case A (Format cũ): JSON là một Mảng
          if (Array.isArray(parsed)) {
            appData.courses = parsed;
            alert("Import thành công! (Dữ liệu môn học đã được nạp)");
          }
          // Case B (Format mới): JSON là một Object
          else if (typeof parsed === "object" && parsed.courses) {
            // Cập nhật toàn bộ, đảm bảo các key không thiếu
            appData = {
              settings: { startDate: "2026-01-26", startWeek: 22 },
              holidays: [],
              generalNotes: "",
              ...parsed,
            };
            alert("Import thành công! (Toàn bộ dữ liệu đã được nạp)");
          } else {
            throw new Error("Định dạng JSON không được hỗ trợ.");
          }

          setSystemConfig(
            appData.settings.startDate,
            appData.settings.startWeek,
          );
          currentViewWeek = appData.settings.startWeek;
          saveAndRender();
          importModal.close();
        } catch (e) {
          alert(`Lỗi format JSON!\n\nChi tiết: ${e.message}`);
        }
      } else {
        alert("Vui lòng dán dữ liệu vào ô trống.");
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
      '<p style="color: var(--color-text-gray); padding: 12px; text-align: center;">Chưa có lịch nghỉ</p>';
    return;
  }

  appData.holidays.forEach((holiday, index) => {
    const item = document.createElement("div");
    item.className = "holiday-item";
    item.innerHTML = `
      <span class="holiday-item-name">${holiday.name}</span>
      <span class="holiday-item-weeks">Tuần: ${holiday.weeks.join(", ")}</span>
      <button class="btn-delete-holiday" data-index="${index}">×</button>
    `;
    container.appendChild(item);
  });

  // Attach delete handlers
  container.querySelectorAll(".btn-delete-holiday").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt(e.target.dataset.index);
      if (confirm("Xóa ngày nghỉ này?")) {
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
        alert("Cài đặt kỳ học đã được lưu!");
      } else {
        alert("Vui lòng nhập đầy đủ thông tin!");
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
          "BẠN CHẮC CHẮN MUỐN XÓA TOÀN BỘ DỮ LIỆU?\n\nHành động này KHÔNG THỂ HOÀN TÁC!",
        )
      ) {
        if (confirm("Xác nhận lần cuối: XÓA TẤT CẢ dữ liệu?")) {
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
  courseSelect.innerHTML = '<option value="">-- Chọn môn học --</option>';
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
      modalTitle.textContent = "Chỉnh Sửa Bài Tập";
      courseSelect.value = assignment.courseId;
      titleInput.value = assignment.title;
      descInput.value = assignment.description || "";
      deadlineInput.value = assignment.deadline;
      prioritySelect.value = assignment.priority;
      modal.dataset.editId = assignmentId;
    }
  } else {
    modalTitle.textContent = "Thêm Bài Tập Mới";
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
    alert("Vui lòng điền đầy đủ thông tin bài tập!");
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
  if (confirm("Bạn có chắc muốn xóa bài tập này?")) {
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
    container.innerHTML = '<div class="empty-state">Chưa có bài tập nào</div>';
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
    deadlineText = "Hoàn thành";
  } else if (diffDays < 0) {
    deadlineClass = "deadline-overdue";
    deadlineText = `Quá hạn ${Math.abs(diffDays)} ngày`;
  } else if (diffDays === 0) {
    deadlineClass = "deadline-today";
    deadlineText = "Hôm nay";
  } else if (diffDays === 1) {
    deadlineClass = "deadline-tomorrow";
    deadlineText = "Ngày mai";
  } else if (diffDays <= 3) {
    deadlineClass = "deadline-urgent";
    deadlineText = `Còn ${diffDays} ngày`;
  } else if (diffDays <= 7) {
    deadlineClass = "deadline-soon";
    deadlineText = `Còn ${diffDays} ngày`;
  } else {
    deadlineClass = "deadline-normal";
    deadlineText = `Còn ${diffDays} ngày`;
  }

  const priorityLabels = {
    high: "Cao",
    medium: "Trung bình",
    low: "Thấp",
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
        Hạn nộp: ${formatDeadline(deadline)}
      </div>
      <div class="assignment-actions">
        <button class="btn-icon" onclick="window.openAssignmentModal('${assignment.id}')" title="Chỉnh sửa">
          <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-icon" onclick="window.deleteAssignment('${assignment.id}')" title="Xóa">
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
  courseSelect.innerHTML = '<option value="">-- Chọn môn học --</option>';
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
      modalTitle.textContent = "Chỉnh Sửa Lịch Thi";
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
    modalTitle.textContent = "Thêm Lịch Thi Mới";
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
    alert("Vui lòng điền đầy đủ thông tin lịch thi!");
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
  if (confirm("Bạn có chắc muốn xóa lịch thi này?")) {
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
    container.innerHTML = '<div class="empty-state">Chưa có lịch thi nào</div>';
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
    dateText = "Đã thi";
  } else if (diffDays < 0) {
    dateClass = "exam-passed";
    dateText = `Đã qua ${Math.abs(diffDays)} ngày`;
  } else if (diffDays === 0) {
    dateClass = "exam-today";
    dateText = "Hôm nay";
  } else if (diffDays === 1) {
    dateClass = "exam-tomorrow";
    dateText = "Ngày mai";
  } else if (diffDays <= 3) {
    dateClass = "exam-urgent";
    dateText = `Còn ${diffDays} ngày`;
  } else if (diffDays <= 7) {
    dateClass = "exam-soon";
    dateText = `Còn ${diffDays} ngày`;
  } else {
    dateClass = "exam-normal";
    dateText = `Còn ${diffDays} ngày`;
  }

  const formatLabels = {
    written: "Tự luận",
    test: "Trắc nghiệm",
    online: "Trực tuyến",
    practical: "Thực hành",
    other: "Khác",
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
        <span>${exam.duration} phút</span>
      </div>
      ${
        exam.room
          ? `
      <div class="exam-detail-item">
        <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span>Phòng ${exam.room}</span>
      </div>
      `
          : ""
      }
    </div>
    ${exam.notes ? `<div class="exam-notes">${exam.notes}</div>` : ""}
    <div class="exam-footer">
      <div class="exam-actions">
        <button class="btn-icon" onclick="window.openExamModal('${exam.id}')" title="Chỉnh sửa">
          <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-icon" onclick="window.deleteExam('${exam.id}')" title="Xóa">
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
  const weekdays = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
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
    container.innerHTML = '<div class="empty-state">Chưa có môn học nào</div>';
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

  // Hiển thị khác nhau theo filter
  let displayText = "";
  if (weekFilter === "current") {
    // Tuần hiện tại: 0/0 hoặc 1/1
    displayText = `${stats.attended}/${stats.total}`;
  } else {
    // Tất cả tuần: 1/15
    displayText = `${stats.attended}/${totalPlanned}`;
  }

  card.innerHTML = `
    <div class="attendance-course-header">
      <div class="attendance-course-info">
        <h4>${course.name}</h4>
        <p>${course.room} - ${course.teacher}</p>
      </div>
      <div class="attendance-course-stats">
        <span class="attendance-stat">${displayText} buổi</span>
        <span class="attendance-rate-badge ${stats.rate >= 80 ? "high" : stats.rate >= 50 ? "medium" : "low"}">
          Đi ${stats.rate}%
        </span>
      </div>
    </div>
    <div class="attendance-sessions">
      ${sessions.length > 0 ? sessions.map((session) => createSessionElement(course.id, session)).join("") : '<div class="empty-state">Chưa có buổi học nào</div>'}
    </div>
  `;

  return card;
}

function getCourseSessions(course, weekFilter) {
  const sessions = [];
  const allSessions = []; // Tổng số buổi dự kiến
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

  // Tính tổng buổi dự kiến (không kể lễ)
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
      // Parse ISO date chính xác (YYYY-MM-DD)
      const sessionDate = new Date(sessionDateISO + "T00:00:00");

      // Tính giờ kết thúc buổi học (tiết cuối + 50 phút)
      const endPeriod = course.startPeriod + course.periodCount - 1;
      const endTime = getPeriodTime(endPeriod);

      if (endTime) {
        // Parse giờ kết thúc (format: "07h00")
        const [hours, minutes] = endTime
          .replace("h", ":")
          .split(":")
          .map(Number);
        const sessionEndDateTime = new Date(sessionDate);
        sessionEndDateTime.setHours(hours, minutes + 50, 0, 0); // +50 phút cho tiết học

        // Chỉ hiển thị các buổi ĐÃ KẾT THÚC
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
      weekFilter === "current" ? sessions.length : allSessions.length, // Nếu tuần hiện tại thì chỉ tính buổi đã qua
  };
}

function createSessionElement(courseId, session) {
  const attendanceRecord = appData.attendance[courseId]?.[session.date];
  const status = attendanceRecord?.status || "unmarked";

  const statusLabels = {
    present: "Đã đi",
    absent: "Vắng",
    late: "Đi muộn",
    unmarked: "Chưa đánh dấu",
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
            title="Đã đi"
          >
            <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
          <button 
            class="status-btn ${status === "late" ? "active" : ""}" 
            onclick="window.markAttendance('${courseId}', '${session.date}', 'late')"
            title="Đi muộn"
          >
            <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </button>
          <button 
            class="status-btn ${status === "absent" ? "active" : ""}" 
            onclick="window.markAttendance('${courseId}', '${session.date}', 'absent')"
            title="Vắng"
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

        // Tính giờ kết thúc buổi học (tiết cuối + 50 phút)
        const endPeriod = course.startPeriod + course.periodCount - 1;
        const endTime = getPeriodTime(endPeriod);

        if (endTime) {
          // Parse giờ kết thúc (format: "07h00")
          const [hours, minutes] = endTime
            .replace("h", ":")
            .split(":")
            .map(Number);
          const sessionEndDateTime = new Date(sessionDate);
          sessionEndDateTime.setHours(hours, minutes + 50, 0, 0); // +50 phút cho tiết học

          // Chỉ tính buổi học đã kết thúc
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

        // Tính giờ kết thúc buổi học (tiết cuối + 50 phút)
        const endPeriod = course.startPeriod + course.periodCount - 1;
        const endTime = getPeriodTime(endPeriod);

        if (endTime) {
          // Parse giờ kết thúc (format: "07h00")
          const [hours, minutes] = endTime
            .replace("h", ":")
            .split(":")
            .map(Number);
          const sessionEndDateTime = new Date(sessionDate);
          sessionEndDateTime.setHours(hours, minutes + 50, 0, 0); // +50 phút cho tiết học

          // Chỉ tính buổi học đã kết thúc
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

// ========================================
// SMART NOTES SYSTEM
// ========================================

/**
 * Render markdown to HTML
 */
function renderMarkdown(text) {
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

  // Todo checkboxes
  html = html.replace(
    /\[x\]\s(.+)/gi,
    '<div class="todo-item completed"><input type="checkbox" class="todo-checkbox" checked disabled> <span>$1</span></div>',
  );
  html = html.replace(
    /\[ \]\s(.+)/g,
    '<div class="todo-item"><input type="checkbox" class="todo-checkbox" disabled> <span>$1</span></div>',
  );

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
function parseTags(tagString) {
  if (!tagString) return [];
  return tagString
    .split(/\s+/)
    .filter((t) => t.startsWith("#"))
    .map((t) => t.toLowerCase());
}

/**
 * Calculate todo progress
 */
function calculateTodoProgress(content) {
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
 * Render smart notes grid
 */
function renderSmartNotes(filterType = "all", searchQuery = "") {
  const container = document.getElementById("smart-notes-list");
  const emptyState = document.getElementById("notes-empty-state");

  if (!container) return;

  let notes = [...appData.smartNotes];

  // Apply filter
  if (filterType === "pinned") {
    notes = notes.filter((n) => n.pinned);
  } else if (filterType === "todos") {
    notes = notes.filter((n) => n.type === "todo");
  } else if (filterType === "normal") {
    notes = notes.filter((n) => n.type === "normal");
  }

  // Apply search
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    notes = notes.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query) ||
        n.tags.some((t) => t.includes(query)),
    );
  }

  // Sort: pinned first, then by updatedAt
  notes.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  // Render
  container.innerHTML = "";

  if (notes.length === 0) {
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  notes.forEach((note) => {
    const card = createNoteCard(note);
    container.appendChild(card);
  });

  updateNotesStats();
}

/**
 * Create note card element
 */
function createNoteCard(note) {
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
  editBtn.title = "Chỉnh sửa";
  editBtn.onclick = (e) => {
    e.stopPropagation();
    openNoteModal(note);
  };

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "note-action-btn";
  deleteBtn.textContent = "🗑️";
  deleteBtn.title = "Xóa";
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    deleteNote(note.id);
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
  card.appendChild(content);

  // Footer
  const footer = document.createElement("div");
  footer.className = "note-footer";

  const meta = document.createElement("div");
  meta.className = "note-meta";

  const typeBadge = document.createElement("span");
  typeBadge.className = "note-type-badge";
  typeBadge.innerHTML =
    note.type === "todo" ? "<span>✓</span> Todo" : "<span>📄</span> Ghi chú";
  meta.appendChild(typeBadge);

  const timestamp = document.createElement("span");
  timestamp.textContent = formatNoteDate(note.updatedAt);
  meta.appendChild(timestamp);

  footer.appendChild(meta);
  card.appendChild(footer);

  // Click to expand/view
  card.onclick = () => {
    openNoteModal(note);
  };

  return card;
}

/**
 * Format note date
 */
function formatNoteDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;

  return date.toLocaleDateString("vi-VN");
}

/**
 * Update notes stats
 */
function updateNotesStats() {
  const totalEl = document.getElementById("total-notes-count");
  const pinnedEl = document.getElementById("pinned-notes-count");
  const todoEl = document.getElementById("todo-notes-count");
  const completedEl = document.getElementById("completed-todos-count");

  if (totalEl) totalEl.textContent = appData.smartNotes.length;
  if (pinnedEl)
    pinnedEl.textContent = appData.smartNotes.filter((n) => n.pinned).length;
  if (todoEl)
    todoEl.textContent = appData.smartNotes.filter(
      (n) => n.type === "todo",
    ).length;

  // Calculate completed todos
  let totalCompleted = 0;
  appData.smartNotes
    .filter((n) => n.type === "todo")
    .forEach((n) => {
      const progress = calculateTodoProgress(n.content);
      if (progress.percentage === 100) totalCompleted++;
    });

  if (completedEl) completedEl.textContent = totalCompleted;
}

/**
 * Open note modal for create/edit
 */
function openNoteModal(note = null) {
  const modal = document.getElementById("note-modal");
  const title = document.getElementById("note-modal-title");
  const form = modal.querySelector("form");

  if (!modal) return;

  // Reset form
  form.reset();
  document.getElementById("note-preview").style.display = "none";
  document.getElementById("note-content").style.display = "block";

  if (note) {
    // Edit mode
    title.textContent = "✏️ Chỉnh Sửa Ghi Chú";
    document.getElementById("note-id").value = note.id;
    document.getElementById("note-title").value = note.title;
    document.getElementById("note-tags").value = note.tags.join(" ");
    document.getElementById("note-color").value = note.color || "#60a5fa";
    document.getElementById("note-content").value = note.content;
    document.getElementById("note-pinned").checked = note.pinned;

    const typeRadio = document.querySelector(
      `input[name="note-type"][value="${note.type}"]`,
    );
    if (typeRadio) typeRadio.checked = true;
  } else {
    // Create mode
    title.textContent = "📝 Tạo Ghi Chú Mới";
    document.getElementById("note-id").value = "";
    document.getElementById("note-color").value = "#60a5fa";
  }

  updateCharCount();
  modal.showModal();
}

/**
 * Close note modal
 */
function closeNoteModal() {
  const modal = document.getElementById("note-modal");
  if (modal) modal.close();
}

/**
 * Save note
 */
function saveNote(e) {
  e.preventDefault();

  const id = document.getElementById("note-id").value;
  const title = document.getElementById("note-title").value.trim();
  const tagsInput = document.getElementById("note-tags").value.trim();
  const color = document.getElementById("note-color").value;
  const content = document.getElementById("note-content").value.trim();
  const pinned = document.getElementById("note-pinned").checked;
  const type = document.querySelector('input[name="note-type"]:checked').value;

  if (!title || !content) {
    alert("Vui lòng nhập tiêu đề và nội dung!");
    return;
  }

  const tags = parseTags(tagsInput);
  const now = new Date().toISOString();

  if (id) {
    // Update existing note
    const index = appData.smartNotes.findIndex((n) => n.id == id);
    if (index !== -1) {
      appData.smartNotes[index] = {
        ...appData.smartNotes[index],
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
      id: Date.now(),
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

  saveData();
  renderSmartNotes();
  closeNoteModal();
}

/**
 * Delete note
 */
function deleteNote(id) {
  if (!confirm("Bạn có chắc muốn xóa ghi chú này?")) return;

  appData.smartNotes = appData.smartNotes.filter((n) => n.id != id);
  saveData();
  renderSmartNotes();
}

/**
 * Toggle preview mode
 */
function togglePreview() {
  const editor = document.getElementById("note-content");
  const preview = document.getElementById("note-preview");
  const btn = document.getElementById("btn-toggle-preview");

  if (!editor || !preview) return;

  if (preview.style.display === "none") {
    // Show preview
    preview.innerHTML = renderMarkdown(editor.value);
    preview.style.display = "block";
    editor.style.display = "none";
    btn.classList.add("active");
  } else {
    // Show editor
    preview.style.display = "none";
    editor.style.display = "block";
    btn.classList.remove("active");
  }
}

/**
 * Insert markdown formatting
 */
function insertMarkdown(before, after = "") {
  const editor = document.getElementById("note-content");
  if (!editor) return;

  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const text = editor.value;
  const selectedText = text.substring(start, end);

  const newText =
    text.substring(0, start) +
    before +
    selectedText +
    after +
    text.substring(end);

  editor.value = newText;
  editor.focus();
  editor.selectionStart = start + before.length;
  editor.selectionEnd = start + before.length + selectedText.length;

  updateCharCount();
}

/**
 * Update character count
 */
function updateCharCount() {
  const editor = document.getElementById("note-content");
  const counter = document.getElementById("note-char-count");
  if (editor && counter) {
    counter.textContent = `${editor.value.length} ký tự`;
  }
}

/**
 * Setup notes event listeners
 */
function setupNotesListeners() {
  // Add note button
  const btnAddNote = document.getElementById("btn-add-note");
  if (btnAddNote) {
    btnAddNote.addEventListener("click", () => openNoteModal());
  }

  // Close modal buttons
  const btnCloseModal = document.getElementById("btn-close-note-modal");
  const btnCancelNote = document.getElementById("btn-cancel-note");

  if (btnCloseModal) {
    btnCloseModal.addEventListener("click", closeNoteModal);
  }
  if (btnCancelNote) {
    btnCancelNote.addEventListener("click", closeNoteModal);
  }

  // Save note
  const noteForm = document.querySelector("#note-modal form");
  if (noteForm) {
    noteForm.addEventListener("submit", saveNote);
  }

  // Search
  const searchInput = document.getElementById("notes-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const filterSelect = document.getElementById("notes-filter");
      const filterType = filterSelect ? filterSelect.value : "all";
      renderSmartNotes(filterType, e.target.value);
    });
  }

  // Filter
  const filterSelect = document.getElementById("notes-filter");
  if (filterSelect) {
    filterSelect.addEventListener("change", (e) => {
      const searchInput = document.getElementById("notes-search");
      const searchQuery = searchInput ? searchInput.value : "";
      renderSmartNotes(e.target.value, searchQuery);
    });
  }

  // Editor toolbar
  const btnBold = document.getElementById("btn-format-bold");
  const btnItalic = document.getElementById("btn-format-italic");
  const btnStrike = document.getElementById("btn-format-strike");
  const btnLink = document.getElementById("btn-insert-link");
  const btnCheckbox = document.getElementById("btn-insert-checkbox");
  const btnPreview = document.getElementById("btn-toggle-preview");

  if (btnBold)
    btnBold.addEventListener("click", () => insertMarkdown("**", "**"));
  if (btnItalic)
    btnItalic.addEventListener("click", () => insertMarkdown("*", "*"));
  if (btnStrike)
    btnStrike.addEventListener("click", () => insertMarkdown("~~", "~~"));
  if (btnLink)
    btnLink.addEventListener("click", () => {
      const url = prompt("Nhập URL:");
      if (url) insertMarkdown(`[`, `](${url})`);
    });
  if (btnCheckbox)
    btnCheckbox.addEventListener("click", () => insertMarkdown("[ ] "));
  if (btnPreview) btnPreview.addEventListener("click", togglePreview);

  // Color presets
  document.querySelectorAll(".color-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      const color = btn.dataset.color;
      const colorInput = document.getElementById("note-color");
      if (colorInput) colorInput.value = color;
    });
  });

  // Character count
  const noteContent = document.getElementById("note-content");
  if (noteContent) {
    noteContent.addEventListener("input", updateCharCount);
  }

  // Keyboard shortcuts
  if (noteContent) {
    noteContent.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "b") {
          e.preventDefault();
          insertMarkdown("**", "**");
        } else if (e.key === "i") {
          e.preventDefault();
          insertMarkdown("*", "*");
        }
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
