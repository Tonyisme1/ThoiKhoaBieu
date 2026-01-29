/**
 * CORE LOGIC MODULE
 * Chứa các hàm tính toán, xử lý dữ liệu, không phụ thuộc vào DOM/UI.
 */

// --- CẤU HÌNH HỆ THỐNG (CÓ THỂ THAY ĐỔI) ---
// Ngày bắt đầu học kỳ: 26/01/2026 (Thứ 2)
let SEMESTER_START_DATE = new Date("2026-01-26T00:00:00");
// Học kỳ bắt đầu vào tuần thứ 22 của năm (theo lịch trường)
let WEEK_OFFSET_REAL = 22;

/**
 * Cập nhật cấu hình hệ thống từ bên ngoài (app.js)
 * @param {string} date - Chuỗi ngày "yyyy-mm-dd"
 * @param {number} week - Số tuần bắt đầu
 */
export function setSystemConfig(date, week) {
  if (date) {
    SEMESTER_START_DATE = new Date(`${date}T00:00:00`);
  }
  if (week) {
    WEEK_OFFSET_REAL = week;
  }
}

/**
 * 1. Quy đổi từ Tuần Học Kỳ (1, 2...) sang Tuần Thực Tế (22, 23...)
 * Dùng để hiển thị lên giao diện.
 */
export function convertToRealWeek(semesterWeek) {
  return semesterWeek + WEEK_OFFSET_REAL - 1;
}

/**
 * 2. Tính số Tuần Thực Tế từ một NGÀY cụ thể
 * VD: Input "2026-02-16" -> Output: 25
 */
export function getRealWeekFromDate(inputDateStr) {
  if (!inputDateStr) return null;

  const inputDate = new Date(inputDateStr);
  const startDate = new Date(SEMESTER_START_DATE);

  // Reset giờ về 0 để tính chính xác theo ngày
  inputDate.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);

  const diffTime = inputDate - startDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Nếu ngày chọn nhỏ hơn ngày bắt đầu học kỳ
  if (diffDays < 0) return null;

  // Công thức: (Số ngày lệch / 7) + Offset ban đầu
  const weeksPassed = Math.floor(diffDays / 7);
  return WEEK_OFFSET_REAL + weeksPassed;
}

/**
 * 4. Lấy mảng ngày trong tuần
 * Input: 25 -> Output: ["16/02", "17/02", ..., "22/02"]
 */
export function getDatesForWeek(weekNumber) {
  const dates = [];
  const weeksPassed = weekNumber - WEEK_OFFSET_REAL;
  const daysToAdd = weeksPassed * 7;

  // Tính ngày thứ 2 của tuần đó
  const mondayOfTargetWeek = new Date(SEMESTER_START_DATE);
  mondayOfTargetWeek.setDate(mondayOfTargetWeek.getDate() + daysToAdd);

  // Lặp để lấy 7 ngày trong tuần
  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(mondayOfTargetWeek);
    currentDay.setDate(currentDay.getDate() + i);

    const day = String(currentDay.getDate()).padStart(2, "0");
    const month = String(currentDay.getMonth() + 1).padStart(2, "0");
    dates.push(`${day}/${month}`);
  }
  return dates;
}

/**
 * 4b. Lấy mảng ngày trong tuần (ISO format YYYY-MM-DD)
 * Input: 25 -> Output: ["2026-02-16", "2026-02-17", ..., "2026-02-22"]
 */
export function getDatesForWeekISO(weekNumber) {
  const dates = [];
  const weeksPassed = weekNumber - WEEK_OFFSET_REAL;
  const daysToAdd = weeksPassed * 7;

  // Tính ngày thứ 2 của tuần đó - dùng local time
  const mondayOfTargetWeek = new Date(SEMESTER_START_DATE.getTime());
  mondayOfTargetWeek.setDate(mondayOfTargetWeek.getDate() + daysToAdd);

  // Lặp để lấy 7 ngày trong tuần
  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(mondayOfTargetWeek.getTime());
    currentDay.setDate(currentDay.getDate() + i);

    // Format thành YYYY-MM-DD trong local timezone
    const year = currentDay.getFullYear();
    const month = String(currentDay.getMonth() + 1).padStart(2, "0");
    const day = String(currentDay.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
  }
  return dates;
}

/**
 * 3. Phân tích chuỗi nhập liệu "Smart String"
 * Input: "22-30 nghỉ 25, 26" hoặc "22->30 except 25"
 * Output: Mảng [22, 23, 24, 27, 28, 29, 30]
 */
export function parseWeekString(weekString) {
  const resultWeeks = new Set();
  const cleanStr = weekString.toLowerCase().trim();

  // Regex tìm từ khóa tách phần loại trừ: "nghỉ", "trừ", "except", "bỏ", dấu "-"
  // VD: "22-40 nghỉ 25" -> rangePart="22-40", excludePart=" 25"
  const splitRegex = /(?:nghỉ|trừ|except|bỏ)\s+/i;

  let rangePart = cleanStr;
  let excludePart = "";

  if (splitRegex.test(cleanStr)) {
    const parts = cleanStr.split(splitRegex);
    rangePart = parts[0];
    excludePart = parts[1];
  }

  // A. Xử lý khoảng tuần (Range): VD "22-40" hoặc "22->40"
  const rangeRegex = /(\d+)\s*[-to>]\s*(\d+)/;
  const match = rangePart.match(rangeRegex);

  if (match) {
    const start = parseInt(match[1]);
    const end = parseInt(match[2]);

    // Thêm tất cả tuần trong khoảng vào Set
    for (let i = start; i <= end; i++) {
      resultWeeks.add(i);
    }
  } else {
    // Trường hợp người dùng nhập 1 số đơn lẻ: "22"
    // Hoặc danh sách rời rạc: "22, 24, 26" (Xử lý sơ bộ)
    const singleNums = rangePart.match(/\d+/g);
    if (singleNums) {
      singleNums.forEach((num) => resultWeeks.add(parseInt(num)));
    }
  }

  // B. Xử lý tuần nghỉ (Exclude)
  if (excludePart) {
    // Tìm tất cả các số trong phần exclude
    const excludes = excludePart.match(/\d+/g);
    if (excludes) {
      excludes.forEach((num) => {
        resultWeeks.delete(parseInt(num));
      });
    }
  }

  // Trả về mảng đã sắp xếp tăng dần
  return Array.from(resultWeeks).sort((a, b) => a - b);
}

/**
 * 5. Lấy giờ học thực tế từ số tiết
 * Input: 1 -> Output: "07h00"
 */
export function getPeriodTime(periodNumber) {
  const periodTimes = {
    1: "07h00",
    2: "07h50",
    3: "08h40",
    4: "09h35",
    5: "10h25",
    6: "11h15",
    7: "12h35",
    8: "13h25",
    9: "14h15",
    10: "15h10",
    11: "16h00",
    12: "16h50",
    13: "17h45",
    14: "18h35",
    15: "19h25",
  };
  return periodTimes[periodNumber] || "";
}

/**
 * 6. Kiểm tra ngày trong tuần có phải là hôm nay không
 * Input: weekNumber, dayIndex (0=Thứ 2, 6=CN)
 * Output: true/false
 */
export function isToday(weekNumber, dayIndex) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weeksPassed = weekNumber - WEEK_OFFSET_REAL;
  const daysToAdd = weeksPassed * 7 + dayIndex;

  const targetDate = new Date(SEMESTER_START_DATE);
  targetDate.setDate(targetDate.getDate() + daysToAdd);
  targetDate.setHours(0, 0, 0, 0);

  return today.getTime() === targetDate.getTime();
}

/**
 * 7. Lấy tuần hiện tại
 */
export function getCurrentWeek() {
  const today = new Date();
  return getRealWeekFromDate(today.toISOString().split("T")[0]);
}
