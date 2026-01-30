/**
 * Header Tabs Module
 * Desktop horizontal tab navigation in header
 */

let headerTabs = null;
let tabButtons = [];
let onTabChangeCallback = null;

/**
 * Initialize header tabs navigation
 */
export function initHeaderTabs(onTabChange) {
  headerTabs = document.getElementById("header-tabs");
  onTabChangeCallback = onTabChange;

  if (!headerTabs) return;

  tabButtons = headerTabs.querySelectorAll(".header-tab");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.dataset.tab;
      setActiveTab(tabName);

      if (onTabChangeCallback) {
        onTabChangeCallback(tabName);
      }
    });
  });
}

/**
 * Set active tab
 */
export function setActiveTab(tabName) {
  tabButtons.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.tab === tabName) {
      btn.classList.add("active");
    }
  });
}

/**
 * Sync with other navigation (mobile menu, sidebar)
 */
export function syncWithTab(tabName) {
  setActiveTab(tabName);
}
