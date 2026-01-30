/**
 * Week Slider Module
 * Horizontal scrollable week navigation with smooth animations
 */

// Configuration
const WEEKS_VISIBLE = 5; // Number of weeks visible at once
const WEEK_ITEM_WIDTH = 86; // Width of each week item + gap (80px + 6px)

// State
let currentOffset = 0;
let selectedWeek = 22; // Default week
let weekChangeCallback = null;
let totalWeeks = 26; // Total number of weeks

// DOM Elements
let dashboardSlider = null;
let timetableSlider = null;
let dashboardContainer = null;
let timetableContainer = null;
let dashboardScrollbar = null;
let timetableScrollbar = null;
let dashboardThumb = null;
let timetableThumb = null;

/**
 * Initialize week slider for both dashboard and timetable
 */
export function initWeekSlider(totalWeeksParam, currentWeek, onWeekChange) {
  selectedWeek = currentWeek;
  weekChangeCallback = onWeekChange;
  totalWeeks = totalWeeksParam;

  // Dashboard slider elements
  dashboardContainer = document.getElementById("week-container-dashboard");
  const btnPrevDashboard = document.getElementById("btn-prev-week");
  const btnNextDashboard = document.getElementById("btn-next-week");
  dashboardScrollbar = document.getElementById("week-scrollbar-dashboard");
  dashboardThumb = document.getElementById("week-scrollbar-thumb-dashboard");

  // Timetable slider elements
  timetableContainer = document.getElementById("week-container-timetable");
  const btnPrevTimetable = document.getElementById("btn-prev-week-2");
  const btnNextTimetable = document.getElementById("btn-next-week-2");
  timetableScrollbar = document.getElementById("week-scrollbar-timetable");
  timetableThumb = document.getElementById("week-scrollbar-thumb-timetable");

  if (dashboardContainer) {
    renderWeekItems(dashboardContainer, totalWeeksParam, currentWeek);
    setupSliderEvents(dashboardContainer, btnPrevDashboard, btnNextDashboard);
  }

  if (timetableContainer) {
    renderWeekItems(timetableContainer, totalWeeksParam, currentWeek);
    setupSliderEvents(timetableContainer, btnPrevTimetable, btnNextTimetable);
  }

  // Setup custom scrollbars
  if (dashboardScrollbar && dashboardThumb) {
    setupCustomScrollbar(dashboardScrollbar, dashboardThumb, "dashboard");
  }

  if (timetableScrollbar && timetableThumb) {
    setupCustomScrollbar(timetableScrollbar, timetableThumb, "timetable");
  }

  // Scroll to selected week
  scrollToWeek(currentWeek);

  // Keyboard navigation (Arrow keys)
  setupKeyboardNavigation();
}

/**
 * Render week items into container
 */
function renderWeekItems(container, totalWeeks, currentWeek) {
  container.innerHTML = "";

  // Calculate real weeks (starting from week 22)
  const startWeek = 22;

  for (let i = 0; i < totalWeeks; i++) {
    const weekNum = startWeek + i;
    const item = document.createElement("button");
    item.className = "week-item";
    item.dataset.week = weekNum;
    item.textContent = `Week ${weekNum}`;
    item.setAttribute("aria-label", `Select week ${weekNum}`);
    item.setAttribute("role", "tab");

    if (weekNum === selectedWeek) {
      item.classList.add("active");
      item.setAttribute("aria-selected", "true");
    } else {
      item.setAttribute("aria-selected", "false");
    }

    if (weekNum === currentWeek) {
      item.classList.add("current");
    }

    item.addEventListener("click", () => {
      handleWeekClick(weekNum);
    });

    container.appendChild(item);
  }
}

/**
 * Setup slider navigation events
 */
function setupSliderEvents(container, prevBtn, nextBtn) {
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      slideWeeks("prev", container);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      slideWeeks("next", container);
    });
  }

  // Touch swipe support for mobile
  setupSwipeGestures(container);
}

/**
 * Handle week item click
 */
function handleWeekClick(weekNum) {
  // Animate content transition
  animateContentTransition(() => {
    selectedWeek = weekNum;
    updateActiveWeek(weekNum);

    // Trigger callback
    if (weekChangeCallback) {
      weekChangeCallback(weekNum);
    }
  });
}

/**
 * Update active week in both sliders
 */
function updateActiveWeek(weekNum) {
  // Update dashboard slider
  if (dashboardContainer) {
    const items = dashboardContainer.querySelectorAll(".week-item");
    items.forEach((item) => {
      item.classList.remove("active");
      if (parseInt(item.dataset.week) === weekNum) {
        item.classList.add("active");
      }
    });
  }

  // Update timetable slider
  if (timetableContainer) {
    const items = timetableContainer.querySelectorAll(".week-item");
    items.forEach((item) => {
      item.classList.remove("active");
      if (parseInt(item.dataset.week) === weekNum) {
        item.classList.add("active");
      }
    });
  }
}

/**
 * Slide weeks left or right AND select adjacent week
 */
function slideWeeks(direction, container) {
  const items = container.querySelectorAll(".week-item");
  const totalItems = items.length;
  const maxOffset = Math.max(0, (totalItems - WEEKS_VISIBLE) * WEEK_ITEM_WIDTH);
  const startWeek = 22;
  const maxWeek = startWeek + totalItems - 1;

  // Calculate new selected week
  let newSelectedWeek = selectedWeek;
  if (direction === "prev") {
    newSelectedWeek = Math.max(startWeek, selectedWeek - 1);
    currentOffset = Math.max(0, currentOffset - WEEK_ITEM_WIDTH);
  } else {
    newSelectedWeek = Math.min(maxWeek, selectedWeek + 1);
    currentOffset = Math.min(maxOffset, currentOffset + WEEK_ITEM_WIDTH);
  }

  // Apply smooth transform to both containers
  applyTransform(currentOffset);

  // If week changed, trigger week change with animation
  if (newSelectedWeek !== selectedWeek) {
    animateContentTransition(() => {
      selectedWeek = newSelectedWeek;
      updateActiveWeek(newSelectedWeek);

      // Trigger callback
      if (weekChangeCallback) {
        weekChangeCallback(newSelectedWeek);
      }
    });
  }
}

/**
 * Apply transform to both slider containers and update scrollbar position
 */
function applyTransform(offset) {
  if (dashboardContainer) {
    dashboardContainer.style.transform = `translateX(-${offset}px)`;
  }
  if (timetableContainer) {
    timetableContainer.style.transform = `translateX(-${offset}px)`;
  }

  // Update scrollbar thumb position
  updateScrollbarPosition();
}

/**
 * Scroll to center a specific week
 */
function scrollToWeek(weekNum) {
  const startWeek = 22;
  const weekIndex = weekNum - startWeek;
  const centerOffset = Math.max(
    0,
    (weekIndex - Math.floor(WEEKS_VISIBLE / 2)) * WEEK_ITEM_WIDTH,
  );

  currentOffset = centerOffset;

  // Apply with slight delay for initial render
  setTimeout(() => {
    applyTransform(centerOffset);
  }, 100);
}

/**
 * Animate content transition when changing weeks
 */
function animateContentTransition(callback) {
  const dashboardContent = document.getElementById("dashboard-content");
  const timetableContent = document.getElementById("timetable-content");

  // Fade out
  if (dashboardContent) {
    dashboardContent.classList.remove("visible");
    dashboardContent.classList.add("fade-out");
  }
  if (timetableContent) {
    timetableContent.classList.remove("visible");
    timetableContent.classList.add("fade-out");
  }

  // Execute callback and fade in
  setTimeout(() => {
    callback();

    // Fade in
    if (dashboardContent) {
      dashboardContent.classList.remove("fade-out");
      dashboardContent.classList.add("fade-in");
    }
    if (timetableContent) {
      timetableContent.classList.remove("fade-out");
      timetableContent.classList.add("fade-in");
    }

    // Complete animation
    setTimeout(() => {
      if (dashboardContent) {
        dashboardContent.classList.remove("fade-in");
        dashboardContent.classList.add("visible");
      }
      if (timetableContent) {
        timetableContent.classList.remove("fade-in");
        timetableContent.classList.add("visible");
      }
    }, 300);
  }, 200);
}

/**
 * Set selected week programmatically
 */
export function setSelectedWeek(weekNum) {
  selectedWeek = weekNum;
  updateActiveWeek(weekNum);
  scrollToWeek(weekNum);
}

/**
 * Setup keyboard navigation for week slider
 * Left/Right arrow keys to navigate weeks
 */
function setupKeyboardNavigation() {
  document.addEventListener("keydown", (e) => {
    // Only handle if not typing in input/textarea
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA" ||
      e.target.isContentEditable
    ) {
      return;
    }

    // Left arrow - previous week
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevWeek = selectedWeek - 1;
      if (prevWeek >= 22) {
        // Start week is 22
        handleWeekClick(prevWeek);
      }
    }

    // Right arrow - next week
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextWeek = selectedWeek + 1;
      if (nextWeek <= 47) {
        // End week is 47 (22 + 26 - 1)
        handleWeekClick(nextWeek);
      }
    }
  });
}

/**
 * Setup swipe gestures for mobile touch navigation
 */
function setupSwipeGestures(container) {
  let touchStartX = 0;
  let touchEndX = 0;
  const minSwipeDistance = 50; // Minimum distance for a swipe

  const slider = container.closest(".week-slider");
  if (!slider) return;

  slider.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true },
  );

  slider.addEventListener(
    "touchend",
    (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    },
    { passive: true },
  );

  function handleSwipe() {
    const swipeDistance = touchEndX - touchStartX;

    // Swipe left (next week)
    if (swipeDistance < -minSwipeDistance) {
      const nextWeek = selectedWeek + 1;
      if (nextWeek <= 47) {
        handleWeekClick(nextWeek);
      }
    }

    // Swipe right (previous week)
    if (swipeDistance > minSwipeDistance) {
      const prevWeek = selectedWeek - 1;
      if (prevWeek >= 22) {
        handleWeekClick(prevWeek);
      }
    }
  }
}

/**
 * Setup custom scrollbar with drag functionality
 */
function setupCustomScrollbar(scrollbar, thumb, type) {
  const track = scrollbar.querySelector(".week-scrollbar-track");
  if (!track) return;

  let isDragging = false;
  let startX = 0;
  let startOffset = 0;

  // Calculate scrollbar dimensions
  const maxOffset = Math.max(0, (totalWeeks - WEEKS_VISIBLE) * WEEK_ITEM_WIDTH);
  const trackWidth = track.offsetWidth;
  const thumbWidth = Math.max(40, (WEEKS_VISIBLE / totalWeeks) * trackWidth);

  // Set thumb width
  thumb.style.width = `${thumbWidth}px`;

  // Mouse down on thumb - start dragging
  thumb.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startOffset = currentOffset;
    document.body.style.cursor = "grabbing";
    e.preventDefault();
  });

  // Mouse move - drag thumb
  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const scrollRatio = maxOffset / (trackWidth - thumbWidth);
    const newOffset = Math.max(
      0,
      Math.min(maxOffset, startOffset + deltaX * scrollRatio),
    );

    currentOffset = newOffset;
    applyTransform(currentOffset);
    updateScrollbarPosition();
  });

  // Mouse up - stop dragging
  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.cursor = "";
    }
  });

  // Click on track - jump to position
  track.addEventListener("click", (e) => {
    if (e.target === thumb) return;

    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const scrollRatio = maxOffset / (trackWidth - thumbWidth);
    const newOffset = Math.max(
      0,
      Math.min(maxOffset, (clickX - thumbWidth / 2) * scrollRatio),
    );

    currentOffset = newOffset;
    applyTransform(currentOffset);
    updateScrollbarPosition();
  });

  // Initial position
  updateScrollbarPosition();
}

/**
 * Update scrollbar thumb position based on current offset
 */
function updateScrollbarPosition() {
  const maxOffset = Math.max(0, (totalWeeks - WEEKS_VISIBLE) * WEEK_ITEM_WIDTH);

  if (dashboardThumb && dashboardScrollbar) {
    const track = dashboardScrollbar.querySelector(".week-scrollbar-track");
    if (track) {
      const trackWidth = track.offsetWidth;
      const thumbWidth = parseFloat(dashboardThumb.style.width) || 40;
      const thumbPosition =
        (currentOffset / maxOffset) * (trackWidth - thumbWidth);
      dashboardThumb.style.left = `${isNaN(thumbPosition) ? 0 : thumbPosition}px`;
    }
  }

  if (timetableThumb && timetableScrollbar) {
    const track = timetableScrollbar.querySelector(".week-scrollbar-track");
    if (track) {
      const trackWidth = track.offsetWidth;
      const thumbWidth = parseFloat(timetableThumb.style.width) || 40;
      const thumbPosition =
        (currentOffset / maxOffset) * (trackWidth - thumbWidth);
      timetableThumb.style.left = `${isNaN(thumbPosition) ? 0 : thumbPosition}px`;
    }
  }
}

/**
 * Get current selected week
 */
export function getSelectedWeek() {
  return selectedWeek;
}
