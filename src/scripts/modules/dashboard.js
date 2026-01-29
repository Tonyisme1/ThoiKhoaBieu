/**
 * DASHBOARD MODULE
 * Dashboard and analytics management
 */

import {
  getRealWeekFromDate,
  getDatesForWeek,
  getDatesForWeekISO,
  getPeriodTime,
} from "../core/core.js";
import { calculateTotalAttendanceStats } from "./attendance.js";

let appData = null;
const TOTAL_WEEKS_RENDER = 26;

export function initDashboard(data) {
  appData = data;
}

export function getDashboardStats(week) {
  const coursesThisWeek = appData.courses.filter(
    (c) => c.weeks && c.weeks.includes(parseInt(week)) && c.day !== 0,
  );

  const totalCourses = coursesThisWeek.length;
  const totalPeriods = coursesThisWeek.reduce(
    (sum, c) => sum + Number(c.periodCount || 0),
    0,
  );
  const hours = Math.round((totalPeriods * 50) / 60);
  const favoritesCount = appData.favorites ? appData.favorites.length : 0;

  const holidays = appData.holidays || [];
  const holidayWeeks = new Set();
  holidays.forEach((holiday) => {
    holiday.weeks.forEach((w) => holidayWeeks.add(w));
  });

  const now = new Date();
  let upcomingClass = null;
  let minTimeDiff = Infinity;

  appData.courses.forEach((course) => {
    if (course.day === 0) return;

    course.weeks.forEach((weekNum) => {
      if (holidayWeeks.has(weekNum)) return;

      const dates = getDatesForWeekISO(weekNum);
      const sessionDateISO = dates[course.day - 2];

      if (sessionDateISO) {
        const sessionDate = new Date(sessionDateISO + "T00:00:00");
        const startTime = getPeriodTime(course.startPeriod);

        if (startTime) {
          const [hours, minutes] = startTime
            .replace("h", ":")
            .split(":")
            .map(Number);
          const sessionStartDateTime = new Date(sessionDate);
          sessionStartDateTime.setHours(hours, minutes, 0, 0);

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
  let nextMeta = "No upcoming classes";

  if (upcomingClass) {
    const sessionDate = upcomingClass.sessionDate;
    const dayOfWeek = sessionDate.getDay();
    const dayLabel = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][dayOfWeek];
    const day = sessionDate.getDate();
    const month = sessionDate.getMonth() + 1;
    const dateStr = `${day}/${month}`;

    const hoursUntil = Math.floor(minTimeDiff / (1000 * 60 * 60));
    const daysUntil = Math.floor(hoursUntil / 24);

    let timeInfo = "";
    if (daysUntil > 0) {
      timeInfo = `in ${daysUntil} day${daysUntil > 1 ? "s" : ""}`;
    } else if (hoursUntil > 0) {
      timeInfo = `in ${hoursUntil} hour${hoursUntil > 1 ? "s" : ""}`;
    } else {
      const minutesUntil = Math.floor(minTimeDiff / (1000 * 60));
      timeInfo = `in ${minutesUntil} minute${minutesUntil > 1 ? "s" : ""}`;
    }

    nextTitle = upcomingClass.name;
    nextMeta = `${dayLabel} ${dateStr}, Period ${upcomingClass.startPeriod} - ${upcomingClass.room || "?"} • ${timeInfo}`;
  }

  const normalizeDay = (d) => {
    const n = parseInt(d);
    if (isNaN(n)) return 0;
    if (n === 0) return 8;
    if (n >= 2 && n <= 8) return n;
    if (n === 1) return 2;
    return n;
  };

  const loadByDay = Array(7).fill(0);
  const dayIndex = { 2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6 };
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

export function getSemesterStats() {
  const allCourses = appData.courses;
  const weeklyData = [];

  const totalWeeks = TOTAL_WEEKS_RENDER;
  const startWeek = appData.settings.startWeek || 22;

  let totalPeriods = 0;
  allCourses.forEach((course) => {
    if (course.day !== 0 && course.weeks && Array.isArray(course.weeks)) {
      const periodsPerSession = course.periodCount || 0;
      totalPeriods += periodsPerSession * course.weeks.length;
    }
  });

  for (let w = startWeek; w < startWeek + totalWeeks; w++) {
    const weekStats = getDashboardStats(w);
    weeklyData.push({
      week: w,
      courses: weekStats.totalCourses,
      periods: weekStats.totalPeriods,
      hours: weekStats.hours,
    });
  }

  const hours = Math.round(totalPeriods * 1.67);
  const totalCourses = allCourses.length;
  const favoritesCount = allCourses.filter((c) => c.isFavorite).length;
  const attendanceStats = calculateTotalAttendanceStats();

  let totalScheduledSessions = 0;
  allCourses.forEach((course) => {
    if (course.day !== 0 && course.weeks && Array.isArray(course.weeks)) {
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

export function renderDashboard(week) {
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

  if (elLabelCourses) elLabelCourses.textContent = "Courses This Week";
  if (elMetaCourses) elMetaCourses.textContent = "Scheduled this week";
  if (chartTitle) chartTitle.textContent = "Weekly Load";
  if (chartHint) chartHint.textContent = "Periods per day";

  if (elCourses) elCourses.textContent = stats.totalCourses;
  if (elPeriods) elPeriods.textContent = stats.totalPeriods;
  if (elHours) elHours.textContent = `≈ ${stats.hours} hrs`;
  if (elFav) elFav.textContent = stats.favoritesCount;
  if (elNextTitle) elNextTitle.textContent = stats.nextTitle;
  if (elNextMeta) elNextMeta.textContent = stats.nextMeta;

  const cardNextClass = document.getElementById("card-next-class");
  if (cardNextClass) cardNextClass.style.display = "";

  const cardAttendance = document.getElementById("card-attendance");
  const elAttendanceLabel = cardAttendance?.querySelector(".dash-label");
  const elAttendanceMeta = cardAttendance?.querySelector(".dash-meta");

  if (elAttendanceLabel) elAttendanceLabel.textContent = "Attendance";
  if (elAttendanceMeta) elAttendanceMeta.textContent = "Attended / Total";

  if (elAttendance) {
    const attendanceStats = calculateTotalAttendanceStats();
    elAttendance.textContent = `${attendanceStats.attended}/${attendanceStats.total}`;
  }

  const chart = document.getElementById("weekly-load-chart");
  if (chart) {
    chart.innerHTML = "";
    chart.classList.remove("semester-view");
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
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

  const holidayList = document.getElementById("holiday-mini-list");
  if (holidayList) {
    holidayList.innerHTML = "";
    if (!stats.holidays.length) {
      holidayList.innerHTML =
        '<li style="padding:10px; color: var(--color-text-gray);">No holidays</li>';
    } else {
      stats.holidays.forEach((h) => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${h.name}</span><span class="holiday-weeks">Weeks: ${h.weeks.join(", ")}</span>`;
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
  const elAttendance = document.getElementById("stat-attendance");
  const elLabelCourses = document.getElementById("dash-label-courses");
  const elMetaCourses = document.getElementById("dash-meta-courses");
  const chartTitle = document.getElementById("chart-title-load");
  const chartHint = document.getElementById("chart-hint-load");

  if (elLabelCourses) elLabelCourses.textContent = "Total Courses";
  if (elMetaCourses) elMetaCourses.textContent = "All courses this semester";
  if (chartTitle) chartTitle.textContent = "Weekly Distribution";
  if (chartHint) chartHint.textContent = "Periods per week";

  if (elCourses) elCourses.textContent = stats.totalCourses;
  if (elPeriods) elPeriods.textContent = stats.totalPeriods;
  if (elHours) elHours.textContent = `≈ ${stats.hours} hrs`;
  if (elFav) elFav.textContent = stats.favoritesCount;

  const cardNextClass = document.getElementById("card-next-class");
  if (cardNextClass) cardNextClass.style.display = "none";

  const cardAttendance = document.getElementById("card-attendance");
  const elAttendanceLabel = cardAttendance?.querySelector(".dash-label");
  const elAttendanceMeta = cardAttendance?.querySelector(".dash-meta");

  if (elAttendanceLabel) elAttendanceLabel.textContent = "Total Sessions";
  if (elAttendanceMeta)
    elAttendanceMeta.textContent = "Scheduled this semester";
  if (elAttendance) elAttendance.textContent = stats.totalScheduledSessions;

  const chart = document.getElementById("weekly-load-chart");
  if (chart) {
    chart.innerHTML = "";
    chart.classList.add("semester-view");
    const maxVal = Math.max(...stats.weeklyBreakdown.map((w) => w.periods), 1);

    stats.weeklyBreakdown.forEach((weekData) => {
      const item = document.createElement("div");
      item.className = "bar-item";
      item.style.cursor = "pointer";
      item.title = `Week ${weekData.week}: ${weekData.periods} periods`;

      const fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.height = `${(weekData.periods / maxVal) * 100}%`;

      const value = document.createElement("div");
      value.className = "bar-value";
      value.textContent = weekData.periods;

      const label = document.createElement("div");
      label.className = "bar-label";
      label.textContent = `W${weekData.week}`;

      item.appendChild(fill);
      item.appendChild(value);
      item.appendChild(label);

      // Dispatch event to navigate to week
      item.addEventListener("click", () => {
        const event = new CustomEvent("navigate-to-week", {
          detail: { week: weekData.week },
        });
        document.dispatchEvent(event);
      });

      chart.appendChild(item);
    });
  }

  const holidayList = document.getElementById("holiday-mini-list");
  if (holidayList) {
    holidayList.innerHTML = "";
    const allHolidays = appData.holidays || [];
    if (!allHolidays.length) {
      holidayList.innerHTML =
        '<li style="padding:10px; color: var(--color-text-gray);">No holidays</li>';
    } else {
      allHolidays.forEach((h) => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${h.name}</span><span class="holiday-weeks">Weeks: ${h.weeks.join(", ")}</span>`;
        holidayList.appendChild(li);
      });
    }
  }
}
