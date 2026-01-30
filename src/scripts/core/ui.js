/**
 * UI MODULE
 * Responsible for DOM manipulation and UI rendering.
 */

import {
  convertToRealWeek,
  getDatesForWeek,
  getPeriodTime,
  isToday,
  getCurrentWeek,
} from "./core.js";

// DOM Elements cache
const gridBody = document.getElementById("timetable-grid");
const gridHeader = document.querySelector(".grid-header");
const weekDropdownHeader = document.getElementById("week-dropdown-header");
const cardTemplate = document.getElementById("course-card-template");
const notesContainer = document.getElementById("notes-list");
const weekCheckboxContainer = document.getElementById(
  "week-checkbox-container",
);
const weekRangeInput = document.getElementById("week-range");

// --- 1. RENDER GRID HEADER (Day, Date) ---
export function renderGridHeader(weekNumber) {
  if (!gridHeader) return;

  gridHeader.innerHTML = ""; // Clear old header
  const dates = getDatesForWeek(weekNumber);
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // First column (fixed)
  const firstCell = document.createElement("div");
  firstCell.innerHTML = `<span class=""></span> Period`;
  gridHeader.appendChild(firstCell);

  // Render 7 days of the week
  dayNames.forEach((name, index) => {
    const cell = document.createElement("div");
    const isTodayCell = isToday(weekNumber, index);

    cell.innerHTML = `
      <span class="day-name">${name}</span>
      <span class="day-date">${dates[index]}</span>
    `;

    if (isTodayCell) {
      cell.classList.add("is-today");
      cell.innerHTML += `<span class="today-badge">TODAY</span>`;
      console.log(
        `✅ Today found: Week ${weekNumber}, ${name} (index ${index}), Date: ${dates[index]}`,
      );
    }

    gridHeader.appendChild(cell);
  });
}

// --- 1. RENDER GRID STRUCTURE (GRID SKELETON) ---
export function initGridStructure() {
  gridBody.innerHTML = "";

  // A. Render Lunch Break Row
  // CSS Grid: Position at row 7 (after period 6)
  const lunchDiv = document.createElement("div");
  lunchDiv.className = "lunch-break-row";
  lunchDiv.innerHTML = `<span class="lunch-icon">Break</span> LUNCH BREAK <span class="lunch-time">12:05 - 12:35</span>`;
  lunchDiv.style.gridRow = "7 / 8";
  gridBody.appendChild(lunchDiv);

  // B. Render 15 periods (Time markers column)
  for (let i = 1; i <= 15; i++) {
    const slot = document.createElement("div");
    slot.className = "time-slot-marker";
    const time = getPeriodTime(i);
    slot.innerHTML = `
      <span class="period-number">Period ${i}</span>
      <span class="period-time">${time}</span>
    `;

    // Calculate row position: If >= period 7, skip 1 row (lunch break)
    const rowPos = i < 7 ? i : i + 1;

    slot.style.gridRow = `${rowPos} / ${rowPos + 1}`;
    gridBody.appendChild(slot);
  }
}

// --- 2. RENDER TIMELINE (WEEK DROPDOWN) ---
// NOTE: This function is now deprecated - week slider module handles week navigation
export function renderWeekNavigation(totalWeeks, currentSelectedWeek) {
  // Week slider now handles this - see week-slider.js module
  // Keeping function signature for backward compatibility
  return;
}

// Update active state on Dropdown
// NOTE: Week slider now handles this - see week-slider.js module
export function setActiveWeek(weekNumber) {
  // Week slider module handles week state now
  // Keeping function signature for backward compatibility
  return;
}

// --- 3. RENDER SCHEDULE TO GRID ---
export function renderSchedule(courses, selectedWeek) {
  // Remove old course cards (keep grid structure)
  const oldCards = gridBody.querySelectorAll(".course-card");
  oldCards.forEach((card) => card.remove());

  const fragment = document.createDocumentFragment();

  courses.forEach((course) => {
    // Only render if course is scheduled for this week
    if (!course.weeks || !course.weeks.includes(parseInt(selectedWeek))) return;

    const clone = cardTemplate.content.cloneNode(true);
    const card = clone.querySelector(".course-card");

    // Set ID to dataset for Click-to-Edit
    card.dataset.id = course.id;
    card.dataset.courseId = course.id;

    // Detailed tooltip on hover
    const dayLabel =
      course.day === 8
        ? "Sunday"
        : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][course.day - 2];
    const periodLabel = `Period ${course.startPeriod}-${
      course.startPeriod + course.periodCount - 1
    }`;
    const tooltip = document.createElement("div");
    tooltip.className = "course-tooltip";
    tooltip.innerHTML = `
      <div class="tooltip-name">${course.name}</div>
      <div class="tooltip-line">${dayLabel} • ${periodLabel}</div>
      <div class="tooltip-line">Room: ${course.room || "?"}</div>
      ${course.teacher ? `<div class="tooltip-line">Instructor: ${course.teacher}</div>` : ""}
    `;
    card.appendChild(tooltip);

    // Set favorite button data
    const favBtn = card.querySelector(".btn-favorite");
    if (favBtn) {
      favBtn.dataset.courseId = course.id;
    }

    card.querySelector(".course-name").textContent = course.name;

    // Display Room and Instructor
    const roomP = card.querySelector(".course-room");
    let roomText = `Room: ${course.room || "?"}`;
    if (course.teacher) {
      roomText += ` · Instructor: ${course.teacher}`;
    }
    roomP.textContent = roomText;

    // Positioning (Grid Area)
    const colStart = parseInt(course.day);
    let rowStart = parseInt(course.startPeriod);
    let rowEnd = rowStart + parseInt(course.periodCount);

    // Handle lunch break row skip
    if (rowStart >= 7) rowStart += 1;
    if (rowEnd > 7) rowEnd += 1;

    card.style.gridColumn = `${colStart} / ${colStart + 1}`;
    card.style.gridRow = `${rowStart} / ${rowEnd}`;

    // Use custom color for border only, keep background white
    if (course.color) {
      card.style.borderColor = course.color;
      card.style.borderLeftColor = course.color;
    } else {
      const colors = [
        "#ffeaa7",
        "#81ecec",
        "#74b9ff",
        "#a29bfe",
        "#ff7675",
        "#55efc4",
      ];
      const borderColor = colors[Math.floor(course.id) % colors.length];
      card.style.borderColor = borderColor;
      card.style.borderLeftColor = borderColor;
    }

    fragment.appendChild(card);
  });

  gridBody.appendChild(fragment);

  // We add the animation class after appending, to trigger the transition
  // This is a simple way, for staggered effect, a loop with timeout is needed.
  setTimeout(() => {
    const cards = gridBody.querySelectorAll(".course-card");
    cards.forEach((card) => card.classList.add("animate-in"));
  }, 10);
}

// --- 4. RENDER NOTES & FREE COURSES (Day = 0) ---
export function renderNotes(notes, containerId = "notes-list") {
  const notesContainer = document.getElementById(containerId);
  if (!notesContainer) return;
  notesContainer.innerHTML = "";

  notes.forEach((note) => {
    const div = document.createElement("div");
    div.className = "note-card";
    div.dataset.id = note.id; // Set ID for Click-to-Edit
    div.innerHTML = `
            <h4>${note.name}</h4>
            <p><b>Week:</b> ${note.weekString || "Flexible"}</p>
            <p><b>Room/Note:</b> ${note.room || "None"}</p>
        `;
    notesContainer.appendChild(div);
  });
}

// --- 5. RENDER WEEK SELECTOR (CHECKBOXES IN MODAL) ---
export function renderWeekSelector(activeWeeks = []) {
  if (!weekCheckboxContainer) return;
  weekCheckboxContainer.innerHTML = "";

  // Config: Render from week 22 to 47
  const START_WEEK = 22;
  const END_WEEK = 47;

  for (let w = START_WEEK; w <= END_WEEK; w++) {
    const div = document.createElement("div");
    div.className = "week-checkbox";
    div.textContent = w;
    div.dataset.week = w;

    // If editing and this week is in data -> Active
    if (activeWeeks.includes(w)) {
      div.classList.add("selected");
    }

    // Click event to select/deselect
    div.addEventListener("click", () => {
      div.classList.toggle("selected");
      updateWeekInputDisplay(); // Update text input below
    });

    weekCheckboxContainer.appendChild(div);
  }

  // Update text on first render
  updateWeekInputDisplay();
}

/**
 * Helper: Get selected weeks from UI and update Input Text
 */
function updateWeekInputDisplay() {
  const selectedDivs = weekCheckboxContainer.querySelectorAll(
    ".week-checkbox.selected",
  );

  // Convert NodeList -> Array of numbers
  const weeks = Array.from(selectedDivs).map((div) =>
    parseInt(div.dataset.week),
  );

  // Display in input (read-only)
  if (weeks.length > 0) {
    weekRangeInput.value = weeks.join(", ");
  } else {
    weekRangeInput.value = "";
  }

  return weeks;
}

// Export function to get data for App Controller
export function getSelectedWeeksFromUI() {
  return updateWeekInputDisplay();
}
// --- 6. RENDER COURSE LIST TABLE (TABLE VIEW) ---
export function renderCourseListTable(coursesToRender) {
  const tbody = document.getElementById("course-list-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  // Sort courses: By Day (2->8) then by Start Period
  const sortedCourses = [...coursesToRender].sort((a, b) => {
    if (a.day === b.day) return a.startPeriod - b.startPeriod;
    // Move free courses (day=0) to end, others sorted by day
    if (a.day === 0) return 1;
    if (b.day === 0) return -1;
    return a.day - b.day;
  });

  if (sortedCourses.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="padding:20px; color:#999;">No courses found.</td></tr>';
    return;
  }

  sortedCourses.forEach((course, index) => {
    const tr = document.createElement("tr");

    // Handle Day/Period display
    let scheduleText = "";
    if (course.day === 0) {
      scheduleText =
        '<span style="color:#e74c3c; font-weight:bold;">Flexible / Note</span>';
    } else {
      const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const dayName = course.day === 8 ? "Sunday" : dayNames[course.day - 2];
      scheduleText = `${dayName} <br> <small>(Period ${course.startPeriod} - ${course.startPeriod + course.periodCount - 1})</small>`;
    }

    tr.innerHTML = `
            <td>${index + 1}</td>
            <td class="col-name">${course.name}</td>
            <td>${scheduleText}</td>
            <td>${course.room}</td>
            <td>${course.teacher || ""}</td>
            <td><small>${course.weekString || "N/A"}</small></td>
            <td>
              <button class="action-btn btn-edit-row" data-id="${course.id}" title="Edit">Edit</button>
              <button class="action-btn btn-delete-row" data-id="${course.id}" title="Delete">Delete</button>
            </td>
        `;

    tbody.appendChild(tr);
  });
}
