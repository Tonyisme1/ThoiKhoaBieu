/**
 * HOLIDAYS MODULE
 * Holiday management
 */

let appData = null;
let saveDataCallback = null;

export function initHolidays(data, saveCallback) {
  appData = data;
  saveDataCallback = saveCallback;
}

export function checkAndDisplayHoliday(week) {
  if (!appData.holidays) return;

  const activeHolidays = appData.holidays.filter((h) => h.weeks.includes(week));
  const holidayBanner = document.getElementById("holiday-banner");

  if (!holidayBanner) return;

  if (activeHolidays.length > 0) {
    const names = activeHolidays.map((h) => h.name).join(" & ");
    holidayBanner.textContent = `Holiday: ${names}`;
    holidayBanner.style.display = "block";
  } else {
    holidayBanner.textContent = "";
    holidayBanner.style.display = "none";
  }
}

export function renderHolidayList() {
  const list = document.getElementById("holiday-list");

  if (!list) return;

  list.innerHTML = "";

  if (appData.holidays.length === 0) {
    list.innerHTML =
      '<li style="padding:10px; color:#999;">No holidays yet.</li>';
    return;
  }

  appData.holidays.forEach((h, index) => {
    const li = document.createElement("li");
    li.className = "holiday-item";
    li.innerHTML = `
      <div><strong>${h.name}</strong> <small>(${h.weeks.length} weeks)</small></div>
      <button class="btn-remove-holiday" data-index="${index}">✖</button>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll(".btn-remove-holiday").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.index);
      if (confirm("Delete this holiday?")) {
        appData.holidays.splice(idx, 1);
        saveDataCallback();
        const event = new CustomEvent("render-all-views");
        document.dispatchEvent(event);
        renderHolidayList();
      }
    });
  });
}
