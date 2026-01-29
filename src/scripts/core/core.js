/**
 * CORE LOGIC MODULE
 * Contains calculation and data processing functions, independent of DOM/UI.
 */

// --- SYSTEM CONFIGURATION (CONFIGURABLE) ---
// Semester start date: 26/01/2026 (Monday)
let SEMESTER_START_DATE = new Date("2026-01-26T00:00:00");
// Semester starts at week 22 of the year (according to school calendar)
let WEEK_OFFSET_REAL = 22;

/**
 * Update system configuration from external source (app.js)
 * @param {string} date - Date string "yyyy-mm-dd"
 * @param {number} week - Starting week number
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
 * 1. Convert from Semester Week (1, 2...) to Real Week (22, 23...)
 * Used for UI display.
 */
export function convertToRealWeek(semesterWeek) {
  return semesterWeek + WEEK_OFFSET_REAL - 1;
}

/**
 * 2. Calculate Real Week from a specific DATE
 * Ex: Input "2026-02-16" -> Output: 25
 */
export function getRealWeekFromDate(inputDateStr) {
  if (!inputDateStr) return null;

  const inputDate = new Date(inputDateStr);
  const startDate = new Date(SEMESTER_START_DATE);

  // Reset time to 0 for accurate day calculation
  inputDate.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);

  const diffTime = inputDate - startDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // If selected date is before semester start date
  if (diffDays < 0) return null;

  // Formula: (Days difference / 7) + Initial offset
  const weeksPassed = Math.floor(diffDays / 7);
  return WEEK_OFFSET_REAL + weeksPassed;
}

/**
 * 4. Get array of dates in a week
 * Input: 25 -> Output: ["16/02", "17/02", ..., "22/02"]
 */
export function getDatesForWeek(weekNumber) {
  const dates = [];
  const weeksPassed = weekNumber - WEEK_OFFSET_REAL;
  const daysToAdd = weeksPassed * 7;

  // Calculate Monday of that week
  const mondayOfTargetWeek = new Date(SEMESTER_START_DATE);
  mondayOfTargetWeek.setDate(mondayOfTargetWeek.getDate() + daysToAdd);

  // Loop to get 7 days in the week
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
 * 4b. Get array of dates in a week (ISO format YYYY-MM-DD)
 * Input: 25 -> Output: ["2026-02-16", "2026-02-17", ..., "2026-02-22"]
 */
export function getDatesForWeekISO(weekNumber) {
  const dates = [];
  const weeksPassed = weekNumber - WEEK_OFFSET_REAL;
  const daysToAdd = weeksPassed * 7;

  // Calculate Monday of that week - use local time
  const mondayOfTargetWeek = new Date(SEMESTER_START_DATE.getTime());
  mondayOfTargetWeek.setDate(mondayOfTargetWeek.getDate() + daysToAdd);

  // Loop to get 7 days in the week
  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(mondayOfTargetWeek.getTime());
    currentDay.setDate(currentDay.getDate() + i);

    // Format to YYYY-MM-DD in local timezone
    const year = currentDay.getFullYear();
    const month = String(currentDay.getMonth() + 1).padStart(2, "0");
    const day = String(currentDay.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
  }
  return dates;
}

/**
 * 3. Parse "Smart String" input
 * Input: "22-30 except 25, 26" or "22->30 except 25"
 * Output: Array [22, 23, 24, 27, 28, 29, 30]
 */
export function parseWeekString(weekString) {
  const resultWeeks = new Set();
  const cleanStr = weekString.toLowerCase().trim();

  // Regex to find exclusion keywords: "except", "skip", "not", "-"
  // Ex: "22-40 except 25" -> rangePart="22-40", excludePart=" 25"
  const splitRegex = /(?:nghỉ|trừ|except|bỏ|skip|not)\s+/i;

  let rangePart = cleanStr;
  let excludePart = "";

  if (splitRegex.test(cleanStr)) {
    const parts = cleanStr.split(splitRegex);
    rangePart = parts[0];
    excludePart = parts[1];
  }

  // A. Process week range: Ex "22-40" or "22->40"
  const rangeRegex = /(\d+)\s*[-to>]\s*(\d+)/;
  const match = rangePart.match(rangeRegex);

  if (match) {
    const start = parseInt(match[1]);
    const end = parseInt(match[2]);

    // Add all weeks in range to Set
    for (let i = start; i <= end; i++) {
      resultWeeks.add(i);
    }
  } else {
    // Case: user enters single number: "22"
    // Or discrete list: "22, 24, 26" (basic handling)
    const singleNums = rangePart.match(/\d+/g);
    if (singleNums) {
      singleNums.forEach((num) => resultWeeks.add(parseInt(num)));
    }
  }

  // B. Process excluded weeks
  if (excludePart) {
    // Find all numbers in exclude part
    const excludes = excludePart.match(/\d+/g);
    if (excludes) {
      excludes.forEach((num) => {
        resultWeeks.delete(parseInt(num));
      });
    }
  }

  // Return sorted array in ascending order
  return Array.from(resultWeeks).sort((a, b) => a - b);
}

/**
 * 5. Get actual class time from period number
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
 * 6. Check if a day in the week is today
 * Input: weekNumber, dayIndex (0=Monday, 6=Sunday)
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
 * 7. Get current week
 */
export function getCurrentWeek() {
  const today = new Date();
  return getRealWeekFromDate(today.toISOString().split("T")[0]);
}
