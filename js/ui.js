/**
 * UI MODULE
 * Chịu trách nhiệm thao tác DOM và Render giao diện.
 */

import { convertToRealWeek, getDatesForWeek } from "./core.js";

// DOM Elements cache
const gridBody = document.getElementById("timetable-grid");
const gridHeader = document.querySelector(".grid-header");
const weekListContainer = document.getElementById("week-list");
const cardTemplate = document.getElementById("course-card-template");
const notesContainer = document.getElementById("notes-list");
const weekCheckboxContainer = document.getElementById(
  "week-checkbox-container",
);
const weekRangeInput = document.getElementById("week-range");

// --- 1. RENDER GRID HEADER (Thứ, Ngày) ---
export function renderGridHeader(weekNumber) {
  if (!gridHeader) return;

  gridHeader.innerHTML = ""; // Xóa header cũ
  const dates = getDatesForWeek(weekNumber);
  const dayNames = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];

  // Cột đầu tiên (cố định)
  const firstCell = document.createElement("div");
  firstCell.innerHTML = `Tiết / Thứ`;
  gridHeader.appendChild(firstCell);

  // Render 7 ngày trong tuần
  dayNames.forEach((name, index) => {
    const cell = document.createElement("div");
    cell.innerHTML = `${name} (${dates[index]})`;
    gridHeader.appendChild(cell);
  });
}

// --- 1. RENDER CẤU TRÚC LƯỚI (GRID SKELETON) ---
export function initGridStructure() {
  gridBody.innerHTML = "";

  // A. Render Dòng Nghỉ Trưa (The Lunch Break)
  // CSS Grid: Đặt ở dòng 7 (sau tiết 6)
  const lunchDiv = document.createElement("div");
  lunchDiv.className = "lunch-break-row";
  lunchDiv.textContent = "--- NGHỈ TRƯA (12:05 - 12:35) ---";
  lunchDiv.style.gridRow = "7 / 8";
  gridBody.appendChild(lunchDiv);

  // B. Render 15 tiết học (Cột mốc thời gian)
  for (let i = 1; i <= 15; i++) {
    const slot = document.createElement("div");
    slot.className = "time-slot-marker";
    slot.innerHTML = `<b>Tiết ${i}</b>`;

    // Tính toán vị trí dòng: Nếu >= tiết 7 thì nhảy 1 dòng (nghỉ trưa)
    const rowPos = i < 7 ? i : i + 1;

    slot.style.gridRow = `${rowPos} / ${rowPos + 1}`;
    gridBody.appendChild(slot);
  }
}

// --- 2. RENDER TIMELINE (THANH TRƯỢT TUẦN) ---
export function renderWeekNavigation(totalWeeks, currentSelectedWeek) {
  if (!weekListContainer) return;
  weekListContainer.innerHTML = "";

  const fragment = document.createDocumentFragment();

  for (let i = 1; i <= totalWeeks; i++) {
    const realWeek = convertToRealWeek(i); // i=1 -> Tuần 22
    const btn = document.createElement("button");
    btn.className = "week-chip";

    // Active tuần hiện tại
    if (realWeek === currentSelectedWeek) {
      btn.classList.add("active");
      // Auto scroll tới nút đang chọn
      setTimeout(() => {
        btn.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }, 100);
    }

    btn.textContent = `Tuần ${realWeek}`;
    btn.dataset.week = realWeek;

    fragment.appendChild(btn);
  }

  weekListContainer.appendChild(fragment);
}

// Hàm cập nhật trạng thái Active trên Timeline
export function setActiveWeek(weekNumber) {
  const currentActive = weekListContainer.querySelector(".week-chip.active");
  if (currentActive) currentActive.classList.remove("active");

  const newActive = weekListContainer.querySelector(
    `button[data-week="${weekNumber}"]`,
  );
  if (newActive) {
    newActive.classList.add("active");
    newActive.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }
}

// --- 3. RENDER LỊCH HỌC LÊN GRID ---
export function renderSchedule(courses, selectedWeek) {
  // Xóa các thẻ môn học cũ (giữ lại khung lưới)
  const oldCards = gridBody.querySelectorAll(".course-card");
  oldCards.forEach((card) => card.remove());

  const fragment = document.createDocumentFragment();

  courses.forEach((course) => {
    // Chỉ render nếu môn đó có học trong tuần này
    if (!course.weeks.includes(parseInt(selectedWeek))) return;

    const clone = cardTemplate.content.cloneNode(true);
    const card = clone.querySelector(".course-card");

    // Gán ID vào dataset để Click-to-Edit
    card.dataset.id = course.id;

    card.querySelector(".course-name").textContent = course.name;

    // Hiển thị Phòng và Giảng viên
    const roomP = card.querySelector(".course-room");
    let roomText = `📍 ${course.room}`;
    if (course.teacher) {
      roomText += ` • 👨‍🏫 ${course.teacher}`;
    }
    roomP.textContent = roomText;

    // Positioning (Grid Area)
    const colStart = parseInt(course.day);
    let rowStart = parseInt(course.startPeriod);
    let rowEnd = rowStart + parseInt(course.periodCount);

    // Xử lý nhảy dòng nghỉ trưa
    if (rowStart >= 7) rowStart += 1;
    if (rowEnd > 7) rowEnd += 1;

    card.style.gridColumn = `${colStart} / ${colStart + 1}`;
    card.style.gridRow = `${rowStart} / ${rowEnd}`;

    // Use custom color if available, otherwise fall back to random
    if (course.color) {
        card.style.backgroundColor = course.color;
        card.style.borderColor = course.color; // Also set border color for consistency
    } else {
        const colors = [
          "#ffeaa7",
          "#81ecec",
          "#74b9ff",
          "#a29bfe",
          "#ff7675",
          "#55efc4",
        ];
        card.style.backgroundColor = colors[Math.floor(course.id) % colors.length];
    }
    
    fragment.appendChild(card);
  });

  gridBody.appendChild(fragment);

  // We add the animation class after appending, to trigger the transition
  // This is a simple way, for staggered effect, a loop with timeout is needed.
  setTimeout(() => {
    const cards = gridBody.querySelectorAll('.course-card');
    cards.forEach(card => card.classList.add('animate-in'));
  }, 10);
}

// --- 4. RENDER GHI CHÚ & MÔN TỰ DO (Day = 0) ---
export function renderNotes(notes) {
  if (!notesContainer) return;
  notesContainer.innerHTML = "";

  notes.forEach((note) => {
    const div = document.createElement("div");
    div.className = "note-card";
    div.dataset.id = note.id; // Gán ID để Click-to-Edit
    div.innerHTML = `
            <h4>${note.name}</h4>
            <p>📅 <b>Tuần:</b> ${note.weekString || "Tự do"}</p>
            <p>📝 <b>Phòng/Ghi chú:</b> ${note.room || "Không có"}</p>
        `;
    notesContainer.appendChild(div);
  });
}

// --- 5. RENDER BẢNG CHỌN TUẦN (CHECKBOXES TRONG MODAL) ---
export function renderWeekSelector(activeWeeks = []) {
  if (!weekCheckboxContainer) return;
  weekCheckboxContainer.innerHTML = "";

  // Cấu hình: Render từ tuần 22 đến 47
  const START_WEEK = 22;
  const END_WEEK = 47;

  for (let w = START_WEEK; w <= END_WEEK; w++) {
    const div = document.createElement("div");
    div.className = "week-checkbox";
    div.textContent = w;
    div.dataset.week = w;

    // Nếu đang sửa và tuần này có trong data -> Active
    if (activeWeeks.includes(w)) {
      div.classList.add("selected");
    }

    // Sự kiện Click chọn/bỏ chọn
    div.addEventListener("click", () => {
      div.classList.toggle("selected");
      updateWeekInputDisplay(); // Cập nhật text input bên dưới
    });

    weekCheckboxContainer.appendChild(div);
  }

  // Cập nhật text lần đầu
  updateWeekInputDisplay();
}

/**
 * Helper: Lấy danh sách tuần đang chọn từ UI và cập nhật vào Input Text
 */
function updateWeekInputDisplay() {
  const selectedDivs = weekCheckboxContainer.querySelectorAll(
    ".week-checkbox.selected",
  );

  // Convert NodeList -> Array số
  const weeks = Array.from(selectedDivs).map((div) =>
    parseInt(div.dataset.week),
  );

  // Hiển thị ra input (chỉ để xem)
  if (weeks.length > 0) {
    weekRangeInput.value = weeks.join(", ");
  } else {
    weekRangeInput.value = "";
  }

  return weeks;
}

// Export hàm lấy dữ liệu để App Controller dùng
export function getSelectedWeeksFromUI() {
  return updateWeekInputDisplay();
}
// --- 6. RENDER DANH SÁCH CHI TIẾT (TABLE VIEW) ---
export function renderCourseListTable(coursesToRender) {
  const tbody = document.getElementById("course-list-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  // Sắp xếp môn học: Theo Thứ (2->8) rồi đến Tiết bắt đầu
  const sortedCourses = [...coursesToRender].sort((a, b) => {
    if (a.day === b.day) return a.startPeriod - b.startPeriod;
    // Đưa môn Tự do (day=0) xuống cuối, còn lại xếp theo thứ
    if (a.day === 0) return 1;
    if (b.day === 0) return -1;
    return a.day - b.day;
  });

  if (sortedCourses.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" style="padding:20px; color:#999;">Không tìm thấy môn học nào.</td></tr>';
    return;
  }

  sortedCourses.forEach((course, index) => {
    const tr = document.createElement("tr");

    // Xử lý hiển thị Thứ/Tiết
    let scheduleText = "";
    if (course.day === 0) {
      scheduleText =
        '<span style="color:#e74c3c; font-weight:bold;">Tự do / Ghi chú</span>';
    } else {
      const dayName = course.day === 8 ? "Chủ Nhật" : `Thứ ${course.day}`;
      scheduleText = `${dayName} <br> <small>(Tiết ${course.startPeriod} - ${course.startPeriod + course.periodCount - 1})</small>`;
    }

    tr.innerHTML = `
            <td>${index + 1}</td>
            <td class="col-name">${course.name}</td>
            <td>${scheduleText}</td>
            <td>${course.room}</td>
            <td>${course.teacher || ""}</td>
            <td><small>${course.weekString || "N/A"}</small></td>
            <td>
                <button class="action-btn btn-edit-row" data-id="${course.id}" title="Sửa">✏️</button>
                <button class="action-btn btn-delete-row" data-id="${course.id}" title="Xóa">🗑️</button>
            </td>
        `;

    tbody.appendChild(tr);
  });
}
