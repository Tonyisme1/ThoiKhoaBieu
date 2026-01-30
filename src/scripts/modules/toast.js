/**
 * Toast Notification System
 * User-friendly notifications for success/error messages
 */

class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = [];
    this.init();
  }

  init() {
    // Create container if doesn't exist
    if (!document.querySelector(".toast-container")) {
      this.container = document.createElement("div");
      this.container.className = "toast-container";
      document.body.appendChild(this.container);
    } else {
      this.container = document.querySelector(".toast-container");
    }
  }

  /**
   * Show a toast notification
   * @param {string} type - success, error, warning, info
   * @param {string} title - Toast title
   * @param {string} message - Toast message (optional)
   * @param {number} duration - Auto dismiss duration in ms (0 = no auto dismiss)
   */
  show(type = "info", title = "", message = "", duration = 3000) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const icons = {
      success: `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
      error: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      warning: `<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      info: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    };

    toast.innerHTML = `
      <div class="toast-icon">${icons[type]}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ""}
      </div>
      <button class="toast-close" aria-label="Close">
        <svg viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      ${duration > 0 ? '<div class="toast-progress"></div>' : ""}
    `;

    // Close button
    const closeBtn = toast.querySelector(".toast-close");
    closeBtn.addEventListener("click", () => this.dismiss(toast));

    // Add to container
    this.container.appendChild(toast);
    this.toasts.push(toast);

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(toast), duration);
    }

    return toast;
  }

  /**
   * Dismiss a toast
   */
  dismiss(toast) {
    toast.classList.add("hiding");
    setTimeout(() => {
      toast.remove();
      this.toasts = this.toasts.filter((t) => t !== toast);
    }, 300);
  }

  /**
   * Shorthand methods
   */
  success(title, message, duration) {
    return this.show("success", title, message, duration);
  }

  error(title, message, duration) {
    return this.show("error", title, message, duration);
  }

  warning(title, message, duration) {
    return this.show("warning", title, message, duration);
  }

  info(title, message, duration) {
    return this.show("info", title, message, duration);
  }

  /**
   * Clear all toasts
   */
  clearAll() {
    this.toasts.forEach((toast) => this.dismiss(toast));
  }
}

// Create global instance
const toast = new ToastManager();

export default toast;

/**
 * Usage examples:
 *
 * toast.success("Saved!", "Your changes have been saved successfully");
 * toast.error("Error", "Failed to save changes");
 * toast.warning("Warning", "This action cannot be undone");
 * toast.info("Info", "New features available");
 *
 * // Custom duration (or no auto dismiss)
 * toast.success("Done!", "Operation completed", 5000);
 * toast.error("Critical", "Please check immediately", 0); // No auto dismiss
 */
