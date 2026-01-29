# 📚 Smart Timetable

> A modern, comprehensive academic management system for university students. Track courses, assignments, exams, attendance, and notes - all in one beautiful application.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Made with Love](https://img.shields.io/badge/Made%20with-%E2%9D%A4-red.svg)](https://github.com)
[![No Build Tools](https://img.shields.io/badge/No%20Build%20Tools-Vanilla%20JS-yellow.svg)](https://github.com)

## 🌐 Live Demo

**🎯 [View Landing Page](https://tonyisme1.github.io/ThoiKhoaBieu/public/landing.html)**

**📱 [Launch App](https://tonyisme1.github.io/ThoiKhoaBieu/public/index.html)**

## 🚀 Quick Start

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
├── 📂 public/                    # Public web assets
│   ├── index.html               # Main application
│   └── landing.html             # Landing page
│
├── 📂 src/                       # Source code
│   ├── 📂 assets/css/           # Modular stylesheets
│   │   ├── 📂 base/             # Foundation styles
│   │   │   ├── variables.css    # CSS custom properties
│   │   │   └── layout.css       # Layout & grid systems
│   │   ├── 📂 components/       # Reusable components
│   │   │   ├── buttons.css      # Button styles
│   │   │   ├── cards.css        # Card components
│   │   │   ├── forms.css        # Form elements
│   │   │   ├── search.css       # Search functionality
│   │   │   └── sidebar.css      # Sidebar panel
│   │   ├── 📂 pages/            # Page-specific styles
│   │   │   ├── dashboard.css    # Dashboard view
│   │   │   ├── assignments.css  # Assignments page
│   │   │   ├── exams.css        # Exams page
│   │   │   ├── attendance.css   # Attendance tracker
│   │   │   ├── notes.css        # Smart notes
│   │   │   └── settings.css     # Settings page
│   │   └── main.css             # Main CSS entry point
│   │
│   └── 📂 scripts/              # JavaScript modules
│       ├── 📂 core/             # Core functionality
│       │   ├── core.js          # Business logic
│       │   └── ui.js            # UI rendering
│       ├── 📂 modules/          # Feature modules
│       │   ├── assignments.js   # Assignment management
│       │   ├── exams.js         # Exam scheduling
│       │   ├── attendance.js    # Attendance tracking
│       │   ├── notes.js         # Notes core logic
│       │   └── notes-ui.js      # Notes UI handlers
│       └── app.js               # Main controller
│
├── 📂 data/                      # Data storage
│   └── Lich_Hoc.json            # Course data
│
└── 📂 docs/                      # Documentation
    └── (documentation files)
```

## ✨ Features

### 📅 Smart Timetable

- Visual weekly schedule with color-coded courses
- Course details on hover (room, instructor, weeks)
- Week-by-week navigation
- Semester and holiday management

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

- Rich text editor with markdown support
- Todo list functionality
- Tag system for organization
- Color-coded notes
- Pin important notes to top
- Search and filter capabilities

### ⚙️ Customizable Settings

- Semester start date configuration
- Week numbering system
- Holiday management
- Data import/export (JSON)
- Theme customization

### 🌙 Dark Mode

- Beautiful dark theme
- Instant theme switching
- Persistent theme preference
- Optimized for eye comfort

## 🛠️ Technology Stack

### Frontend

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS Variables
  - Modular architecture (14 CSS files)
  - CSS Grid & Flexbox layouts
  - Smooth transitions and animations
- **JavaScript ES6+** - Pure vanilla JavaScript
  - ES6 Modules for code organization
  - No frameworks or libraries
  - Event-driven architecture

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
- Smooth transitions
- Optimized performance

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
