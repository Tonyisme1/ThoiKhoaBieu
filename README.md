# 📚 Smart Timetable

> A powerful, feature-rich academic management system built with 100% Vanilla JavaScript. Manage your university schedule, assignments, exams, notes, and attendance - all in one beautiful, lightning-fast application.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/Vanilla%20JS-ES6+-yellow.svg)](https://github.com)
[![No Build Tools](https://img.shields.io/badge/Build%20Tools-None-green.svg)](https://github.com)
[![Lines of Code](https://img.shields.io/badge/Lines%20of%20Code-14.5k+-blue.svg)](https://github.com)
[![Dark Mode](https://img.shields.io/badge/Dark%20Mode-WCAG%20AA-8B5CF6.svg)](https://github.com)

## 🌐 Live Demo

**🎯 [View Landing Page](https://tonyisme1.github.io/ThoiKhoaBieu/public/landing.html)**

**📱 [Launch App](https://tonyisme1.github.io/ThoiKhoaBieu/public/index.html)**

## � Project Statistics

- **Total Lines of Code**: 14,564 lines
  - 💅 CSS: 7,130 lines (49.0%) - 21 modular files
  - 💛 JavaScript: 4,720 lines (32.4%) - 14 ES6 modules
  - 📝 HTML: 2,554 lines (17.5%) - Semantic markup
  - 📋 JSON: 160 lines (1.1%) - Course data
- **Total Files**: 37 files
- **Architecture**: 100% Vanilla JavaScript, Zero dependencies
- **Browser Support**: All modern browsers (ES6+)
- **Mobile Ready**: Responsive 320px - 4K

## �🚀 Quick Start

### Option 1: Direct Open

1. Clone this repository
2. Open `public/index.html` in your browser
3. Start managing your academic life!

### Option 2: Local Server (Recommended)

```bash
# Using npx serve
npx serve -l 3001

# Then open
http://localhost:3001/public/index.html
```

### Option 3: GitHub Pages (Online)

1. Fork this repository
2. Go to Settings → Pages
3. Select `main` branch as source
4. Your site will be live at `https://your-username.github.io/ThoiKhoaBieu/public/index.html`

## 📁 Project Structure

```
📦 Smart-Timetable/
│
├── 📂 public/                        # Public web assets (2 files, 2,554 lines)
│   ├── index.html                   # Main application (1,239 lines)
│   └── landing.html                 # Landing page (1,315 lines)
│
├── 📂 src/                           # Source code (35 files, 11,850 lines)
│   │
│   ├── 📂 assets/css/               # Stylesheets (21 files, 7,130 lines)
│   │   │
│   │   ├── 📂 base/                 # Foundation styles (4 files)
│   │   │   ├── variables.css       # CSS custom properties & theme colors
│   │   │   ├── layout.css          # Layout system & grid
│   │   │   ├── mobile.css          # Mobile base styles (524 lines)
│   │   │   └── utilities-mobile.css # Mobile utilities (465 lines)
│   │   │
│   │   ├── 📂 components/           # Reusable UI components (10 files)
│   │   │   ├── buttons.css         # Button styles & variants
│   │   │   ├── cards.css           # Card components
│   │   │   ├── forms.css           # Form elements & inputs
│   │   │   ├── search.css          # Search bar component
│   │   │   ├── sidebar.css         # Desktop sidebar (legacy)
│   │   │   ├── desktop-sidebar.css # Desktop sidebar styles
│   │   │   ├── header-tabs.css     # Header tab navigation (409 lines)
│   │   │   ├── mobile-menu.css     # Mobile hamburger menu
│   │   │   ├── toast.css           # Toast notifications
│   │   │   └── loading.css         # Loading spinners & states
│   │   │
│   │   ├── 📂 pages/                # Page-specific styles (6 files)
│   │   │   ├── dashboard.css       # Dashboard analytics view
│   │   │   ├── assignments.css     # Assignments page (460 lines)
│   │   │   ├── exams.css           # Exams schedule page
│   │   │   ├── attendance.css      # Attendance tracker
│   │   │   ├── notes.css           # Smart notes (809 lines)
│   │   │   └── settings.css        # Settings page
│   │   │
│   │   └── main.css                 # Main CSS entry point (900 lines)
│   │                                # Imports all modules
│   │
│   └── 📂 scripts/                  # JavaScript modules (14 files, 4,720 lines)
│       │
│       ├── 📂 core/                 # Core functionality (2 files)
│       │   ├── core.js             # Business logic & data management
│       │   └── ui.js               # UI rendering & DOM manipulation
│       │
│       ├── 📂 modules/              # Feature modules (11 files)
│       │   ├── assignments.js      # Assignment management
│       │   ├── exams.js            # Exam scheduling
│       │   ├── attendance.js       # Attendance tracking
│       │   ├── dashboard.js        # Dashboard analytics
│       │   ├── notes.js            # Notes core logic (markdown, todos)
│       │   ├── notes-ui.js         # Notes UI & event handlers
│       │   ├── holidays.js         # Holiday management
│       │   ├── header-tabs.js      # Header tab navigation
│       │   ├── mobile-menu.js      # Mobile hamburger menu
│       │   ├── week-slider.js      # Week slider component (492 lines)
│       │   └── toast.js            # Toast notification system
│       │
│       └── app.js                   # Main application controller (1,250 lines)
│                                    # Initialization & orchestration
│
├── 📂 data/                          # Data storage (1 file, 160 lines)
│   └── Lich_Hoc.json                # Course data & schedule
│
├── .gitignore                        # Git ignore rules
└── README.md                         # This file
```

### 📊 File Statistics

| Category    | Files | Lines  | Percentage | Notes                          |
| ----------- | ----- | ------ | ---------- | ------------------------------ |
| 🎨 **CSS**  | 21    | 7,130  | 49.0%      | Modular architecture           |
| 💛 **JS**   | 14    | 4,720  | 32.4%      | ES6 modules, zero dependencies |
| 📝 **HTML** | 2     | 2,554  | 17.5%      | Semantic markup                |
| 📋 **JSON** | 1     | 160    | 1.1%       | Course data                    |
| **Total**   | 38    | 14,564 | 100%       | Production-ready code          |

### 🏆 Top 10 Largest Files

1. **landing.html** - 1,315 lines (Landing page with animations)
2. **app.js** - 1,250 lines (Main application controller)
3. **index.html** - 1,239 lines (Main app HTML)
4. **main.css** - 900 lines (CSS imports & global styles)
5. **notes.css** - 809 lines (Smart notes styling)
6. **mobile.css** - 524 lines (Mobile base styles)
7. **week-slider.js** - 492 lines (Week navigation component)
8. **utilities-mobile.css** - 465 lines (Mobile utilities)
9. **assignments.css** - 460 lines (Assignments styling)
10. **header-tabs.css** - 409 lines (Header tab navigation)

## ✨ Features

### 📅 Smart Timetable

#### 🎯 Core Features

- **Visual weekly schedule** - Color-coded courses with clean grid layout
- **Header tab navigation** - Horizontal centered tabs (no sidebar on desktop)
- **Course details on hover** - Room, instructor, week range
- **Today indicator** - Auto-highlight current day with badge
- **Semester and holiday management** - Configure breaks and weeks off

#### 🎨 Week Navigation System

- **Horizontal week slider** - Swipeable carousel with centered selection
- **Draggable scrollbar** - Custom scrollbar below slider for quick access
- **Arrow buttons** - Navigate and auto-select weeks (slide + select)
- **Smooth animations** - 400ms cubic-bezier fade transitions
- **Keyboard support** - ← → arrow keys to navigate weeks
- **Swipe gestures** - Touch-friendly mobile navigation (50px threshold)
- **Auto-scroll** - Selected week automatically centers
- **Loading states** - Skeleton screens during data fetch

### 📊 Analytics Dashboard

- Weekly workload statistics
- Course distribution charts
- Next class notifications
- Attendance rates
- Favorite courses tracking

### 📝 Assignment Management

- Track homework and projects
- Priority levels (Low, Medium, High)
- Deadline tracking with overdue detection
- Filter by status (Active, Completed, Overdue)
- Course association

### 📖 Exam Scheduler

- Comprehensive exam schedule
- Exam format tracking (Written, Online, Practical)
- Room and duration information
- Countdown to exam dates
- Preparation notes

### ✅ Attendance Tracker

- Session-by-session attendance logging
- Per-course attendance statistics
- Overall attendance rate
- Visual progress indicators

### 🎓 Course Management

- Full course database
- Schedule information (day, period, room)
- Instructor details
- Week range selection
- Personal notes per course
- Color coding

### 📌 Smart Notes

#### ✍️ Rich Text Features

- **Markdown support** - Headers, bold, italic, strikethrough, links
- **Interactive todo lists** - Clickable checkboxes with real-time updates
  - `[ ]` Task not completed
  - `[x]` Task completed
  - Auto-save on checkbox toggle
  - Visual progress bar (completed/total)
- **Tag system** - Hashtag organization (#work #study #important)
- **Color coding** - 8+ color options for visual organization
- **Pin to top** - Keep important notes at the top

#### 🔍 Organization & Search

- **Filter by type** - All, Regular notes, Todo lists
- **Search functionality** - Real-time search across titles and content
- **Sort options** - Updated date, created date, pinned first
- **Statistics** - Total notes, pinned count, todo progress

#### 📝 Editor Features

- **Form validation** - Required title and content
- **Character counter** - Track note length
- **Submit on Enter** - Press Enter in form to save
- **Edit mode** - Click ✏️ button to edit (card click disabled for checkbox interaction)
- **Delete confirmation** - Prevent accidental deletions

### ⚙️ Customizable Settings

- Semester start date configuration
- Week numbering system
- Holiday management
- Data import/export (JSON)
- Theme customization

### 🔔 Toast Notifications

- **Success messages** - Green confirmation toasts
- **Error alerts** - Red warning notifications
- **Auto-dismiss** - 3-5 second duration
- **Progress bar** - Visual countdown
- **Smooth animations** - Slide in from bottom-right
- **Mobile optimized** - Above navigation bar

### ⏳ Loading States

- **Spinner animations** - Smooth rotation
- **Skeleton screens** - Content placeholders
- **Progress bars** - Visual feedback
- **Overlay states** - Non-blocking indicators

### 🌙 Dark Mode (WCAG 2.1 AA Compliant)

#### 🎨 Visual Excellence

- **Comprehensive dark theme** - All 30+ components optimized
- **High contrast ratios** - WCAG 2.1 AA compliant (3:1 minimum)
- **Consistent design language** - Dark backgrounds → Light text
- **Smart color adjustments**:
  - Background: `#1a1a2e` → `#0f0f1e` (dark surfaces)
  - Text: `#e2e8f0` (light gray for readability)
  - Primary: `#60a5fa` (vibrant blue)
  - Success: `#34d399` | Warning: `#fbbf24` | Error: `#f87171`

#### ⚡ Performance

- **Instant theme switching** - No flash or reload
- **Smooth transitions** - 300ms ease-in-out on color changes
- **Persistent preference** - Saved to localStorage
- **System sync ready** - Can detect OS theme preference

#### ♿ Accessibility

- **Enhanced readability** - Optimized for eye comfort
- **Focus states** - High contrast outlines (2px)
- **Smart badges** - Color-coded with sufficient contrast
- **Form controls** - All inputs styled for dark mode

## 🛠️ Technology Stack

### Frontend (100% Vanilla)

- **HTML5** (2,554 lines) - Semantic markup with ARIA attributes
  - 2 main files: index.html (1,239) + landing.html (1,315)
  - Dialog API for modals
  - Template elements for dynamic content
  - Accessible form controls

- **CSS3** (7,130 lines across 21 files) - Modern styling with CSS Variables
  - **Modular architecture**: base/ + components/ + pages/
  - **CSS Grid & Flexbox** layouts for responsive design
  - **Dark mode** with WCAG 2.1 AA contrast ratios (3:1 minimum)
  - **Smooth transitions**: 150ms-400ms cubic-bezier easing
  - **Responsive breakpoints**: 320px → 768px → 1024px → 4K
  - **CSS Custom Properties**: 50+ variables for theming
  - **Mobile-first**: Touch targets 44px minimum

- **JavaScript ES6+** (4,720 lines across 14 modules) - Pure vanilla JavaScript
  - **ES6 Modules**: Clean imports/exports, no bundler
  - **Zero dependencies**: No npm, no frameworks, no libraries
  - **Event delegation**: Efficient event handling
  - **Touch events**: Passive listeners for 60fps scrolling
  - **Keyboard navigation**: Full arrow key support
  - **LocalStorage API**: Persistent data management
  - **Debouncing**: Optimized search and scroll handlers

### Data & Storage

- **LocalStorage** - Client-side data persistence
- **JSON** - Data structure format
- **Native Dialog API** - Modal management

### Architecture

- **Component-based** - Modular design pattern
- **MVC-inspired** - Separation of concerns
- **No build tools** - Direct browser execution
- **Progressive Enhancement** - Works everywhere

### Development

- **No Dependencies** - Zero npm packages in production
- **Modern Browser APIs** - Native features only
- **Responsive Design** - Mobile-first approach

## 📚 Documentation

- [Project Structure](PROJECT_STRUCTURE.md) - Detailed folder organization
- [Documentation](docs/README.md) - Full documentation
- [Refactoring Notes](docs/REFACTORING.md) - Development history

## 🎯 Development Guide

### File Organization Principles

#### CSS Modules

```
base/         → Foundation (variables, layout, resets)
components/   → Reusable UI components (buttons, cards, forms)
pages/        → Page-specific styles (dashboard, notes, etc.)
```

#### JavaScript Modules

```
core/         → Core business logic and UI rendering
modules/      → Independent feature modules
app.js        → Main application controller
```

### Adding a New Feature

1. **Create CSS Module** (if needed)

   ```css
   /* src/assets/css/pages/my-feature.css */
   .my-feature-container {
     /* styles */
   }
   ```

2. **Create JavaScript Module**

   ```javascript
   // src/scripts/modules/my-feature.js
   export function initMyFeature() {
     // feature logic
   }
   ```

3. **Import in Main Files**

   ```css
   /* src/assets/css/main.css */
   @import "pages/my-feature.css";
   ```

   ```javascript
   // src/scripts/app.js
   import { initMyFeature } from "./modules/my-feature.js";
   ```

4. **Initialize in App**
   ```javascript
   // In app.js init() function
   initMyFeature();
   ```

### Code Style Guidelines

- Use ES6+ features (modules, arrow functions, destructuring)
- Follow modular architecture patterns
- Keep functions small and focused
- Use meaningful variable names
- Comment complex logic
- Maintain consistent formatting

### CSS Best Practices

- Use CSS Variables for theming
- Follow BEM-like naming conventions
- Keep specificity low
- Mobile-first responsive design
- Use modern CSS features (Grid, Flexbox)

### Testing

Open the app in your browser and test:

- All CRUD operations work
- Data persists after reload
- Dark mode toggles correctly
- Responsive design on different screen sizes
- No console errors

## 📦 Key Files

| File                                | Purpose                                 |
| ----------------------------------- | --------------------------------------- |
| `public/index.html`                 | Main application entry point            |
| `public/landing.html`               | Landing page for app introduction       |
| `src/scripts/app.js`                | Application controller & initialization |
| `src/scripts/core/core.js`          | Core business logic & data management   |
| `src/scripts/core/ui.js`            | UI rendering & DOM manipulation         |
| `src/assets/css/main.css`           | CSS entry point (imports all modules)   |
| `src/assets/css/base/variables.css` | CSS custom properties & theme variables |
| `data/Lich_Hoc.json`                | Sample course data structure            |

## 🌟 Why Choose Smart Timetable?

### 💯 Completely Free

- 100% free and open source
- No subscriptions or hidden costs
- No account required
- No data collection

### 🔒 Privacy First

- All data stored locally on your device
- No servers, no tracking
- Complete control over your information
- Works completely offline after initial load

### ⚡ Lightning Fast

- No build process or bundling
- Instant page loads
- Smooth transitions (150-400ms)
- Optimized performance
- Passive event listeners for better scroll

### ♿ Accessibility Features

- **ARIA labels** for screen readers
- **Keyboard navigation** support
- **Focus states** with 2px outline
- **High contrast** in dark mode
- **Touch-friendly** 44px minimum tap targets
- **Responsive** from 320px to 4K displays

### 🎨 Beautiful Design

- Modern, clean interface
- Intuitive user experience
- Consistent design language
- Attention to detail

### 🔧 Easy to Customize

- Modular architecture
- Well-commented code
- Easy to extend
- Clear separation of concerns

### 📱 Cross-Platform

- Works on desktop, tablet, and mobile
- Responsive design
- Touch-friendly interface
- Progressive web app ready

### 🚀 Developer Friendly

- Clean, organized codebase
- No complex build tools
- Easy to understand
- Great for learning

## � Documentation

- **Landing Page**: [public/landing.html](public/landing.html) - Visual introduction
- **Project Structure**: Well-organized modular architecture
- **Code Comments**: Comprehensive inline documentation
- **This README**: Complete usage and development guide

## 🤝 Contributing

This is a personal educational project, but suggestions and feedback are welcome!

### How to Contribute

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Areas for Improvement

- [ ] Add more chart types to dashboard
- [ ] Implement data export to PDF
- [ ] Add calendar view for assignments
- [ ] Enhance note editor with rich formatting
- [ ] Course scheduling conflicts detection
- [ ] Study timer/pomodoro integration
- [ ] Grade calculator module
- [ ] PWA (Progressive Web App) support

## 🐛 Known Issues

Currently no known critical issues. If you find a bug, please open an issue!

## 📄 License

MIT License - Free to use for learning and personal projects.

## 👤 Author

Created with ❤️ by a student, for students.

## 🙏 Acknowledgments

- Built with vanilla JavaScript - proving frameworks aren't always necessary
- Inspired by the need for simple, effective academic management
- Thanks to the developer community for best practices and patterns

---

## 💡 Tips & Tricks

### Data Management

- 💾 **Backup regularly**: Settings → Export JSON
- 📤 **Transfer data**: Import JSON on new devices
- 🔄 **Reset if needed**: Clear all data from Settings

### Efficient Usage

- ⌨️ **Quick navigation**: Use tab navigation between sections
- 📌 **Pin notes**: Keep important information at the top
- 🎯 **Set priorities**: Focus on high-priority assignments
- 🎨 **Color code**: Use colors to organize visually
- 🌙 **Dark mode**: Better for late-night study sessions

### Customization

- 📅 **Semester setup**: Configure dates in Settings
- 🎊 **Holiday tracking**: Add breaks to your calendar
- 🎨 **Course colors**: Customize for better visual distinction
- 📝 **Note tags**: Organize notes with hashtags

---

**⭐ If you find this useful, give it a star on GitHub!**

**📧 Questions or feedback?** Open an issue or contribute!

---

**Made with ❤️ for students | Smart Timetable © 2026**
