/**
 * ================================================
 * MOBILE MENU MODULE
 * Handles hamburger menu toggle and navigation
 * ================================================
 */

export class MobileMenu {
  constructor() {
    this.menuToggle = document.querySelector(".mobile-menu-toggle");
    this.menu = document.querySelector(".mobile-menu");
    this.overlay = document.querySelector(".mobile-menu-overlay");
    this.closeBtn = document.querySelector(".mobile-menu-close");
    this.menuItems = document.querySelectorAll(".mobile-menu-item[data-tab]");

    this.isOpen = false;
    this.init();
  }

  init() {
    if (!this.menuToggle || !this.menu || !this.overlay) {
      return;
    }

    // Bind event listeners
    this.menuToggle.addEventListener("click", () => this.toggle());
    this.overlay.addEventListener("click", () => this.close());
    this.closeBtn?.addEventListener("click", () => this.close());

    // Menu item navigation
    this.menuItems.forEach((item) => {
      item.addEventListener("click", (e) => this.handleMenuItemClick(e));
    });

    // Close on escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isOpen) {
        this.close();
      }
    });

    // Sync theme toggle in mobile menu
    this.syncThemeToggle();
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    this.menu.classList.add("active");
    this.overlay.classList.add("active");
    this.menuToggle.classList.add("active");
    document.body.classList.add("mobile-menu-open");

    // Prevent body scroll
    document.body.style.overflow = "hidden";
  }

  close() {
    this.isOpen = false;
    this.menu.classList.remove("active");
    this.overlay.classList.remove("active");
    this.menuToggle.classList.remove("active");
    document.body.classList.remove("mobile-menu-open");

    // Restore body scroll
    document.body.style.overflow = "";
  }

  handleMenuItemClick(e) {
    const item = e.currentTarget;
    const tabId = item.dataset.tab;

    if (!tabId) return;

    // Remove active from all items
    this.menuItems.forEach((i) => i.classList.remove("active"));

    // Add active to clicked item
    item.classList.add("active");

    // Trigger tab switch (sync with desktop tabs)
    const tabEvent = new CustomEvent("mobile-tab-switch", {
      detail: { tabId },
    });
    document.dispatchEvent(tabEvent);

    // Close menu after selection
    setTimeout(() => this.close(), 200);
  }

  syncThemeToggle() {
    // FIX: Find mobile theme toggle by ID
    const mobileThemeToggle = document.getElementById(
      "btn-theme-toggle-mobile",
    );
    const desktopThemeToggle = document.getElementById("btn-theme-toggle");

    if (!mobileThemeToggle || !desktopThemeToggle) return;

    // FIX: Sync theme toggle between mobile and desktop
    mobileThemeToggle.addEventListener("click", () => {
      // Trigger click on desktop toggle to maintain sync
      desktopThemeToggle.click();
    });
  }

  /**
   * Update active menu item based on current tab
   * @param {string} tabId - ID of the active tab
   */
  updateActiveItem(tabId) {
    this.menuItems.forEach((item) => {
      if (item.dataset.tab === tabId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }

  /**
   * Check if menu is currently open
   * @returns {boolean}
   */
  isMenuOpen() {
    return this.isOpen;
  }
}

// Auto-initialize when DOM is ready
let mobileMenuInstance = null;

export function initMobileMenu() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      mobileMenuInstance = new MobileMenu();
    });
  } else {
    mobileMenuInstance = new MobileMenu();
  }

  return mobileMenuInstance;
}

// Export singleton instance
export function getMobileMenu() {
  if (!mobileMenuInstance) {
    mobileMenuInstance = new MobileMenu();
  }
  return mobileMenuInstance;
}
