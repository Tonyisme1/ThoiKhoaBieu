/**
 * ATTENDANCE MODULE
 * Attendance tracking management
 */

import {
  getRealWeekFromDate,
  getDatesForWeekISO,
  getPeriodTime,
} from "../core/core.js";

let appData = null;
let saveDataCallback = null;

export function initAttendance(data, saveCallback) {
  appData = data;
  saveDataCallback = saveCallback;

  setupAttendanceEvents();
  renderAttendance();
}

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

export function renderAttendance() {
  const container = document.getElementById("attendance-course-list");
  const courseFilter = document.getElementById("attendance-course-filter");
  const weekFilter = document.getElementById("attendance-week-filter");

  if (!container || !courseFilter || !weekFilter) return;

  // Populate course filter
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

  let courses = appData.courses;
  if (selectedCourseId !== "all") {
    courses = courses.filter(
      (c) => c.id === selectedCourseId || c.id.toString() === selectedCourseId,
    );
  }

  updateAttendanceStats();

  if (courses.length === 0) {
    container.innerHTML = '<div class="empty-state">No courses available</div>';
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

  const sessionData = getCourseSessions(course, weekFilter);
  const sessions = sessionData.sessions;
  const totalPlanned = sessionData.totalPlanned;

  const stats = calculateCourseAttendanceStats(course.id, sessions);

  let displayText = "";
  if (weekFilter === "current") {
    displayText = `${stats.attended}/${stats.total}`;
  } else {
    displayText = `${stats.attended}/${totalPlanned}`;
  }

  card.innerHTML = `
    <div class="attendance-course-header">
      <div class="attendance-course-info">
        <h4>${course.name}</h4>
        <p>${course.room} - ${course.teacher}</p>
      </div>
      <div class="attendance-course-stats">
        <span class="attendance-stat">${displayText} sessions</span>
        <span class="attendance-rate-badge ${stats.rate >= 80 ? "high" : stats.rate >= 50 ? "medium" : "low"}">
          ${stats.rate}% attended
        </span>
      </div>
    </div>
    <div class="attendance-sessions">
      ${sessions.length > 0 ? sessions.map((session) => createSessionElement(course.id, session)).join("") : '<div class="empty-state">No sessions yet</div>'}
    </div>
  `;

  return card;
}

function getCourseSessions(course, weekFilter) {
  const sessions = [];
  const allSessions = [];
  const now = new Date();
  const currentWeek = getRealWeekFromDate(now);

  let weeksToShow = course.weeks;
  if (weekFilter === "current") {
    weeksToShow = course.weeks.filter((w) => w <= currentWeek);
  }

  const holidayWeeks = new Set();
  appData.holidays.forEach((holiday) => {
    holiday.weeks.forEach((w) => holidayWeeks.add(w));
  });

  course.weeks.forEach((week) => {
    if (!holidayWeeks.has(week)) {
      allSessions.push(week);
    }
  });

  weeksToShow.forEach((week) => {
    if (holidayWeeks.has(week)) return;

    const dates = getDatesForWeekISO(week);
    const sessionDateISO = dates[course.day - 2];

    if (sessionDateISO) {
      const sessionDate = new Date(sessionDateISO + "T00:00:00");
      const endPeriod = course.startPeriod + course.periodCount - 1;
      const endTime = getPeriodTime(endPeriod);

      if (endTime) {
        const [hours, minutes] = endTime
          .replace("h", ":")
          .split(":")
          .map(Number);
        const sessionEndDateTime = new Date(sessionDate);
        sessionEndDateTime.setHours(hours, minutes + 50, 0, 0);

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
      weekFilter === "current" ? sessions.length : allSessions.length,
  };
}

function createSessionElement(courseId, session) {
  const attendanceRecord = appData.attendance[courseId]?.[session.date];
  const status = attendanceRecord?.status || "unmarked";

  const statusLabels = {
    present: "Present",
    absent: "Absent",
    late: "Late",
    unmarked: "Not marked",
  };

  return `
    <div class="attendance-session ${status}">
      <div class="session-date">
        <div class="session-day">${session.displayDate.day}</div>
        <div class="session-full-date">${session.displayDate.full}</div>
      </div>
      <div class="session-status">
        <div class="status-buttons">
          <button class="status-btn ${status === "present" ? "active" : ""}" 
            onclick="window.markAttendance('${courseId}', '${session.date}', 'present')" title="Present">
            <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
          <button class="status-btn ${status === "late" ? "active" : ""}" 
            onclick="window.markAttendance('${courseId}', '${session.date}', 'late')" title="Late">
            <svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </button>
          <button class="status-btn ${status === "absent" ? "active" : ""}" 
            onclick="window.markAttendance('${courseId}', '${session.date}', 'absent')" title="Absent">
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
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

  if (appData.attendance[courseId][date]?.status === status) {
    delete appData.attendance[courseId][date];
  } else {
    appData.attendance[courseId][date] = {
      status: status,
      timestamp: new Date().toISOString(),
    };
  }

  saveDataCallback();
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

  const holidayWeeks = new Set();
  appData.holidays.forEach((holiday) => {
    holiday.weeks.forEach((w) => holidayWeeks.add(w));
  });

  appData.courses.forEach((course) => {
    course.weeks.forEach((week) => {
      if (holidayWeeks.has(week)) return;

      const dates = getDatesForWeekISO(week);
      const sessionDateISO = dates[course.day - 2];

      if (sessionDateISO) {
        const sessionDate = new Date(sessionDateISO + "T00:00:00");
        const endPeriod = course.startPeriod + course.periodCount - 1;
        const endTime = getPeriodTime(endPeriod);

        if (endTime) {
          const [hours, minutes] = endTime
            .replace("h", ":")
            .split(":")
            .map(Number);
          const sessionEndDateTime = new Date(sessionDate);
          sessionEndDateTime.setHours(hours, minutes + 50, 0, 0);

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

  const elTotal = document.getElementById("total-sessions");
  const elAttended = document.getElementById("attended-sessions");
  const elAbsent = document.getElementById("absent-sessions");
  const elRate = document.getElementById("attendance-rate");

  if (elTotal) elTotal.textContent = totalSessions;
  if (elAttended) elAttended.textContent = attendedSessions;
  if (elAbsent) elAbsent.textContent = absentSessions;
  if (elRate) elRate.textContent = rate + "%";
}

export function calculateTotalAttendanceStats() {
  let totalSessions = 0;
  let attendedSessions = 0;

  const now = new Date();

  const holidayWeeks = new Set();
  appData.holidays.forEach((holiday) => {
    holiday.weeks.forEach((w) => holidayWeeks.add(w));
  });

  appData.courses.forEach((course) => {
    course.weeks.forEach((week) => {
      if (holidayWeeks.has(week)) return;

      const dates = getDatesForWeekISO(week);
      const sessionDateISO = dates[course.day - 2];

      if (sessionDateISO) {
        const sessionDate = new Date(sessionDateISO + "T00:00:00");
        const endPeriod = course.startPeriod + course.periodCount - 1;
        const endTime = getPeriodTime(endPeriod);

        if (endTime) {
          const [hours, minutes] = endTime
            .replace("h", ":")
            .split(":")
            .map(Number);
          const sessionEndDateTime = new Date(sessionDate);
          sessionEndDateTime.setHours(hours, minutes + 50, 0, 0);

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

// Expose to window
window.markAttendance = markAttendance;
