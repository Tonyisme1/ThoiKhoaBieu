/**
 * MAIN CONTROLLER
 * Điều phối luồng dữ liệu và sự kiện.
 */

import { getRealWeekFromDate, setSystemConfig } from "./core.js";
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
  settings: {
    startDate: "2026-01-26", // Default
    startWeek: 22, // Default
  },
  theme: 'light', // Add theme property
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
  console.log("🚀 App Started - Final Version.");

  // Load Data
  const stored = localStorage.getItem("smartTimetableData");
  if (stored) {
    try {
      const parsedData = JSON.parse(stored);
      // Merge: Giữ lại data cũ và thêm settings nếu có
      appData = { ...appData, ...parsedData };

      // Patch logic: Nếu data cũ chưa có các key mới thì thêm vào
      if (!appData.holidays) appData.holidays = [];
      if (!appData.settings) {
        appData.settings = { startDate: "2026-01-26", startWeek: 22 };
      }
      if (!appData.generalNotes) appData.generalNotes = "";
      if (!appData.theme) appData.theme = 'light';


    } catch (e) {
      console.error("Error parsing stored data, using default:", e);
      appData = {
        courses: [],
        holidays: [],
        settings: { startDate: "2026-01-26", startWeek: 22 },
        theme: 'light',
        generalNotes: "",
      };
    }
  }
  
  // Apply initial theme
  document.documentElement.setAttribute('data-theme', appData.theme);


  // Apply initial settings
  setSystemConfig(appData.settings.startDate, appData.settings.startWeek);
  currentViewWeek = appData.settings.startWeek; // Cập nhật tuần hiện tại theo config
  
  // Load initial notes
  if(notesTextarea) {
    notesTextarea.value = appData.generalNotes;
  }

  // Render Skeleton
  initGridStructure();
  renderWeekNavigation(TOTAL_WEEKS_RENDER, currentViewWeek);

  // Render Data
  renderAllViews();

  // Setup Events
  setupEventListeners();
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
  renderCourseListTable(appData.courses);
  // 3. Logic hiển thị thông báo ngày nghỉ
  checkAndDisplayHoliday(currentViewWeek);

  // 4. Gắn sự kiện Click-to-Edit
  attachEditEvents();
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
    holidayBanner.textContent = `⚠️ Lịch nghỉ: ${names}`;
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

// --- 3. LOGIC SIDEBAR (ADD / EDIT) ---
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
  document.getElementById("course-color").value = course.color || '#3b82f6'; // Load color

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

function attachEditEvents() {
  // 1. Click vào thẻ trong Lưới & Ghi chú (Mở Form Sửa)
  document.querySelectorAll(".course-card, .note-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = parseFloat(card.dataset.id);
      const course = appData.courses.find((c) => c.id === id);
      if (course) openSidebarToEdit(course);
    });
  });

  // 2. Click vào nút SỬA trong Bảng Danh Sách
  document.querySelectorAll(".btn-edit-row").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Tránh click nhầm
      const id = parseFloat(btn.dataset.id);
      const course = appData.courses.find((c) => c.id === id);
      if (course) openSidebarToEdit(course);
    });
  });

  // 3. Click vào nút XÓA trong Bảng Danh Sách (Xóa nhanh)
  document.querySelectorAll(".btn-delete-row").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = parseFloat(btn.dataset.id);
      if (confirm("⚠️ Bạn chắc chắn muốn xóa môn này vĩnh viễn?")) {
        appData.courses = appData.courses.filter((c) => c.id !== id);
        saveAndRender(); // Lưu và vẽ lại
      }
    });
  });
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
  // THEME TOGGLE
  const themeToggleButton = document.getElementById('btn-theme-toggle');
  if(themeToggleButton) {
      themeToggleButton.addEventListener('click', (event) => {
        // Check for View Transitions API support
        if (!document.startViewTransition) {
            const newTheme = appData.theme === 'light' ? 'dark' : 'light';
            appData.theme = newTheme;
            document.documentElement.setAttribute('data-theme', newTheme);
            saveData();
            return;
        }

        // Get click coordinates
        const x = event.clientX;
        const y = event.clientY;

        // Set CSS custom properties for the animation origin
        document.documentElement.style.setProperty('--x', x + 'px');
        document.documentElement.style.setProperty('--y', y + 'px');

        const transition = document.startViewTransition(() => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const newTheme = isDark ? 'light' : 'dark';
            appData.theme = newTheme;
            document.documentElement.setAttribute('data-theme', newTheme);
            saveData();
        });
      });
  }

  // A. TIMELINE NAVIGATION
  const weekList = document.getElementById("week-list");
  weekList.addEventListener("click", (e) => {
    if (e.target.classList.contains("week-chip")) {
      const w = parseInt(e.target.dataset.week);
      currentViewWeek = w;
      setActiveWeek(w);
      renderAllViews();
    }
  });

  document.getElementById("btn-prev-week").addEventListener("click", () => {
    if (currentViewWeek > 22) {
      currentViewWeek--;
      setActiveWeek(currentViewWeek);
      renderAllViews();
    }
  });
  document.getElementById("btn-next-week").addEventListener("click", () => {
    if (currentViewWeek < 22 + TOTAL_WEEKS_RENDER) {
      currentViewWeek++;
      setActiveWeek(currentViewWeek);
      renderAllViews();
    }
  });

  // B. SIDEBAR ACTIONS
  document
    .getElementById("btn-open-input")
    .addEventListener("click", openSidebarToAdd);

  document.getElementById("btn-cancel-sidebar").addEventListener("click", closeSidebar);
  sidebarOverlay.addEventListener("click", closeSidebar);
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && inputSidebar.classList.contains('is-open')) {
        closeSidebar();
    }
  });

  // Nút Chọn Tất Cả (Trong Sidebar)
  document.getElementById("btn-toggle-all").addEventListener("click", () => {
    const boxes = document.querySelectorAll(".week-checkbox");
    const isAllSelected = Array.from(boxes).every((b) => b.classList.contains("selected"));
    boxes.forEach((b) => {
        if (isAllSelected) {
            b.classList.remove("selected");
        } else {
            b.classList.add("selected");
        }
    });
    getSelectedWeeksFromUI(); // Update input display
  });
  
  // Nút Chọn Tuần Chẵn/Lẻ
    document.getElementById('btn-select-even').addEventListener('click', () => {
        document.querySelectorAll('.week-checkbox').forEach(box => {
            const week = parseInt(box.dataset.week);
            if (week % 2 === 0) {
                box.classList.add('selected');
            } else {
                box.classList.remove('selected');
            }
        });
        getSelectedWeeksFromUI();
    });

    document.getElementById('btn-select-odd').addEventListener('click', () => {
        document.querySelectorAll('.week-checkbox').forEach(box => {
            const week = parseInt(box.dataset.week);
            if (week % 2 !== 0) {
                box.classList.add('selected');
            } else {
                box.classList.remove('selected');
            }
        });
        getSelectedWeeksFromUI();
    });

  // Nút SAVE
  btnSave.addEventListener("click", (e) => {
    e.preventDefault();

    // --- VALIDATION LOGIC ---
    const name = document.getElementById("subject-name").value.trim();
    if (!name) {
      alert("⚠️ Tên môn học không được để trống!");
      return;
    }

    const weeks = getSelectedWeeksFromUI();
    const day = parseInt(document.getElementById("day-select").value);
    if (day !== 0 && weeks.length === 0) {
      alert("⚠️ Vui lòng chọn ít nhất một tuần học cho môn này!");
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
    };
    
    // Collision Detection
    const isCollision = (courseA, courseB) => {
        // Different courses, same day, not a note
        if (courseA.id !== courseB.id && courseA.day === courseB.day && courseA.day !== 0) {
            const weeksA = new Set(courseA.weeks);
            const weeksB = new Set(courseB.weeks);
            const weekIntersection = [...weeksA].filter(w => weeksB.has(w));
            
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
            alert(`⚠️ Lịch bị trùng!\n\nMôn "${formCourse.name}" trùng lịch với môn "${existingCourse.name}" vào cùng thời gian, cùng ngày.`);
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
  const btnSaveNotes = document.getElementById('btn-save-notes');
  if(btnSaveNotes && notesTextarea) {
      btnSaveNotes.addEventListener('click', () => {
          appData.generalNotes = notesTextarea.value;
          saveData();
          alert('✅ Ghi chú đã được lưu!');
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
  document.getElementById("btn-settings").addEventListener("click", () => {
    document.getElementById("setting-start-date").value =
      appData.settings.startDate;
    document.getElementById("setting-start-week").value =
      appData.settings.startWeek;
    settingsModal.showModal();

  });

  // Lưu Settings
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

  document.getElementById("btn-add-holiday").addEventListener("click", () => {
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

  // F. QUICK SEARCH
  const searchInput = document.getElementById('search-input');
  if(searchInput) {
      searchInput.addEventListener('input', (e) => {
          const searchTerm = e.target.value.toLowerCase();
          const filteredCourses = appData.courses.filter(course => {
              const name = course.name ? course.name.toLowerCase() : '';
              const teacher = course.teacher ? course.teacher.toLowerCase() : '';
              const room = course.room ? course.room.toLowerCase() : '';
              return name.includes(searchTerm) || teacher.includes(searchTerm) || room.includes(searchTerm);
          });
          renderCourseListTable(filteredCourses);
          attachEditEvents(); // Re-attach events for the new rows
      });
  }

  // G. EXPORT / IMPORT
  document.getElementById("btn-export").addEventListener("click", () => {
    const json = JSON.stringify(appData, null, 2);
    navigator.clipboard
      .writeText(json)
      .then(() => alert("Đã copy dữ liệu vào Clipboard!"));
  });
  const importModal = document.getElementById('import-modal');
  const importArea = document.getElementById('import-area');
  const btnConfirmImport = document.getElementById('btn-confirm-import');
  const btnCancelImport = document.getElementById('btn-cancel-import');

  document.getElementById("btn-import").addEventListener("click", () => {
      if(importModal) {
        importArea.value = ''; // Clear textarea on open
        importModal.showModal();
      }
  });

  btnCancelImport.addEventListener('click', () => importModal.close());

  btnConfirmImport.addEventListener('click', () => {
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
              else if (typeof parsed === 'object' && parsed.courses) {
                  // Cập nhật toàn bộ, đảm bảo các key không thiếu
                  appData = {
                      settings: { startDate: "2026-01-26", startWeek: 22 },
                      holidays: [],
                      generalNotes: "",
                      ...parsed
                  };
                  alert("Import thành công! (Toàn bộ dữ liệu đã được nạp)");
              } else {
                  throw new Error("Định dạng JSON không được hỗ trợ.");
              }
              
              setSystemConfig(appData.settings.startDate, appData.settings.startWeek);
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
document.addEventListener("DOMContentLoaded", init);
