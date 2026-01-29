# Project Structure

## Overview

This is a modular timetable management application with a well-organized folder structure for maintainability and scalability.

## Directory Structure

```
Thoi_Khoa_Bieu-JS/
│
├── public/                      # Public assets and entry point
│   └── index.html              # Main HTML file (entry point)
│
├── src/                        # Source code
│   ├── assets/                 # Static assets
│   │   └── css/               # Stylesheets
│   │       ├── base/          # Base styles
│   │       │   ├── variables.css    # CSS variables (colors, spacing, etc.)
│   │       │   └── layout.css       # Grid, layout, general structure
│   │       │
│   │       ├── components/    # Reusable UI components
│   │       │   ├── buttons.css      # Button styles
│   │       │   ├── cards.css        # Card components
│   │       │   ├── forms.css        # Form inputs and controls
│   │       │   ├── sidebar.css      # Sidebar component
│   │       │   └── search.css       # Search bar component
│   │       │
│   │       ├── pages/         # Page-specific styles
│   │       │   ├── dashboard.css    # Dashboard page
│   │       │   ├── assignments.css  # Assignments management
│   │       │   ├── exams.css        # Exams schedule
│   │       │   ├── attendance.css   # Attendance tracking
│   │       │   ├── notes.css        # Smart notes
│   │       │   └── settings.css     # Settings page
│   │       │
│   │       └── main.css       # Main stylesheet (imports all modules)
│   │
│   └── scripts/               # JavaScript modules
│       ├── core/              # Core functionality
│       │   ├── core.js        # Core utilities and business logic
│       │   └── ui.js          # UI rendering functions
│       │
│       ├── modules/           # Feature modules
│       │   ├── assignments.js # Assignment management
│       │   ├── attendance.js  # Attendance tracking
│       │   ├── dashboard.js   # Dashboard and analytics
│       │   ├── exams.js       # Exam scheduling
│       │   ├── holidays.js    # Holiday management
│       │   ├── notes.js       # Notes data logic
│       │   └── notes-ui.js    # Notes UI rendering
│       │
│       └── app.js             # Main application controller
│
├── data/                      # Application data
│   └── Lich_Hoc.json         # Course schedule data
│
├── docs/                      # Documentation
│   ├── README.md             # Project documentation
│   └── REFACTORING.md        # Refactoring notes
│
└── .git/                      # Git repository
```

## File Responsibilities

### Public Directory

- **index.html**: Main HTML document, entry point for the application

### Source Directory

#### CSS Architecture

The CSS is organized in a modular, scalable architecture:

**Base Layer** (`src/assets/css/base/`)

- `variables.css`: Global CSS custom properties (theme colors, spacing, typography)
- `layout.css`: Page layout, grid systems, container styles

**Components Layer** (`src/assets/css/components/`)

- Reusable UI components that can be used across different pages
- Each component is self-contained with its own styles
- Includes: buttons, cards, forms, sidebar, search

**Pages Layer** (`src/assets/css/pages/`)

- Page-specific styles for major application sections
- Each page has its own stylesheet for better organization
- Includes: dashboard, assignments, exams, attendance, notes, settings

**Main Stylesheet** (`src/assets/css/main.css`)

- Central import file that loads all CSS modules in correct order
- Ensures proper cascade and specificity

#### JavaScript Architecture

The JavaScript follows a modular pattern with clear separation of concerns:

**Core Layer** (`src/scripts/core/`)

- `core.js`: Core business logic, utilities, date calculations
- `ui.js`: Shared UI rendering functions, grid management

**Modules Layer** (`src/scripts/modules/`)

- Feature-specific modules that handle their own data and UI
- Each module is independent and can be developed/tested separately
- Modules include:
  - `assignments.js`: Assignment CRUD operations
  - `attendance.js`: Attendance tracking logic
  - `dashboard.js`: Dashboard analytics and charts
  - `exams.js`: Exam schedule management
  - `holidays.js`: Holiday calendar management
  - `notes.js`: Notes data and markdown processing
  - `notes-ui.js`: Notes UI rendering and interactions

**Main Controller** (`src/scripts/app.js`)

- Application orchestrator
- Coordinates communication between modules
- Manages global state and data flow
- Handles initialization and routing

### Data Directory

- **Lich_Hoc.json**: Stores course schedule data in JSON format

### Docs Directory

- **README.md**: Project overview, setup instructions, usage guide
- **REFACTORING.md**: Notes on code refactoring and improvements

## Module Dependencies

### Import Flow

```
app.js (Main Controller)
├── core/core.js (Utilities)
├── core/ui.js (UI Rendering) → depends on core.js
└── modules/* (Feature Modules)
    ├── assignments.js
    ├── attendance.js → depends on core.js
    ├── dashboard.js → depends on core.js, attendance.js
    ├── exams.js
    ├── holidays.js
    ├── notes.js
    └── notes-ui.js → depends on notes.js
```

### CSS Import Order (in main.css)

1. Base styles (variables, layout)
2. Component styles (buttons, cards, forms, etc.)
3. Page-specific styles (dashboard, assignments, etc.)

## Best Practices

### Adding New Features

1. **CSS**: Create new file in appropriate folder (components or pages)
2. **JavaScript**: Create new module in `src/scripts/modules/`
3. **Update imports**: Add imports to `main.css` and `app.js`

### File Naming

- Use kebab-case for CSS files: `my-component.css`
- Use kebab-case for JS files: `my-module.js`
- Be descriptive and specific with names

### Code Organization

- Keep modules focused on single responsibility
- Use ES6 imports/exports for modularity
- Maintain clear separation between data logic and UI logic
- Document complex functions with comments

## Development Workflow

1. Edit files in `src/` directory
2. HTML entry point is in `public/index.html`
3. All paths are relative to maintain portability
4. Use browser dev tools for debugging

## Benefits of This Structure

✅ **Scalability**: Easy to add new features without cluttering existing code  
✅ **Maintainability**: Clear organization makes code easy to find and update  
✅ **Modularity**: Independent modules can be developed and tested separately  
✅ **Reusability**: Components can be reused across different pages  
✅ **Performance**: CSS and JS can be lazy-loaded if needed  
✅ **Team Collaboration**: Clear structure helps multiple developers work together
