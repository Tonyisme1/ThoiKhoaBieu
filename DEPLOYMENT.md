# 🚀 Deployment Guide

This guide will help you deploy Smart Timetable to GitHub and GitHub Pages.

## 📋 Prerequisites

- Git installed on your computer
- GitHub account
- Basic knowledge of Git commands

## 🔧 Step-by-Step Deployment

### 1. Prepare Your Repository

The repository is already initialized with Git and has all files committed.

#### Verify Git Status

```bash
cd d:\Ca_Nhan\Du_An\Demo_Ca_Nhan\Thoi_Khoa_Bieu-JS
git status
```

You should see: "nothing to commit, working tree clean"

### 2. Create GitHub Repository

1. Go to [GitHub](https://github.com)
2. Click the **"+"** icon → **"New repository"**
3. Fill in the details:
   - **Repository name**: `smart-timetable` (or your preferred name)
   - **Description**: "A modern academic management system for university students"
   - **Visibility**: Public (for GitHub Pages)
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click **"Create repository"**

### 3. Connect Local Repository to GitHub

Copy the commands from GitHub's setup page and run:

```bash
# Add remote repository
git remote add origin https://github.com/YOUR-USERNAME/smart-timetable.git

# Verify remote
git remote -v

# Push to GitHub
git branch -M main
git push -u origin main
```

**Replace `YOUR-USERNAME`** with your actual GitHub username!

### 4. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll down to **Pages** section (left sidebar)
4. Under **"Source"**:
   - Select branch: `main`
   - Select folder: `/ (root)`
5. Click **Save**
6. Wait 1-2 minutes for deployment

### 5. Access Your Live Site

Your site will be available at:

```
https://YOUR-USERNAME.github.io/smart-timetable/public/index.html
```

**Landing page:**

```
https://YOUR-USERNAME.github.io/smart-timetable/public/landing.html
```

### 6. Update README Links

After deployment, update the links in README.md:

```markdown
## 🌐 Live Demo

**🎯 [View Landing Page](https://YOUR-USERNAME.github.io/smart-timetable/public/landing.html)**

**📱 [Launch App](https://YOUR-USERNAME.github.io/smart-timetable/public/index.html)**
```

Commit and push the changes:

```bash
git add README.md
git commit -m "docs: Update live demo links"
git push
```

## 🔄 Future Updates

When you make changes to your project:

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: Add new feature"
# or
git commit -m "fix: Fix bug in attendance tracker"
# or
git commit -m "docs: Update documentation"

# Push to GitHub
git push
```

GitHub Pages will automatically update within 1-2 minutes.

## 📝 Commit Message Conventions

Use semantic commit messages for better organization:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

Examples:

```bash
git commit -m "feat: Add grade calculator module"
git commit -m "fix: Resolve note save issue"
git commit -m "docs: Add API documentation"
git commit -m "style: Format CSS files"
```

## 🌐 Custom Domain (Optional)

If you want to use a custom domain:

1. Buy a domain from a registrar (Namecheap, GoDaddy, etc.)
2. In your repository settings → Pages → Custom domain
3. Enter your domain name
4. Configure DNS settings at your registrar:
   - Add CNAME record pointing to `YOUR-USERNAME.github.io`
5. Wait for DNS propagation (can take 24-48 hours)

## 🔒 HTTPS

GitHub Pages automatically provides HTTPS for `*.github.io` domains.

For custom domains:

1. Enable "Enforce HTTPS" in repository settings
2. Wait for SSL certificate provisioning

## 📊 GitHub Repository Settings

### Recommended Settings

**General:**

- ✅ Enable "Issues" for bug tracking
- ✅ Enable "Discussions" for community Q&A
- ✅ Add topics: `javascript`, `education`, `timetable`, `student-project`

**Branches:**

- Set `main` as default branch
- Optional: Add branch protection rules

**Pages:**

- ✅ Enable Pages
- Source: `main` branch, `/ (root)` folder

## 🎯 Sharing Your Project

After deployment, share your project:

1. **Update README badges** with your repo URL
2. **Add to your GitHub profile** as a pinned repository
3. **Share on social media** or with classmates
4. **Submit to lists** of open-source projects

## 🐛 Troubleshooting

### Pages Not Showing

- Check if GitHub Pages is enabled in Settings
- Verify the branch and folder are correct
- Wait 2-3 minutes for initial deployment
- Check for build errors in Actions tab

### CSS/JS Not Loading

- Ensure paths are correct (relative paths work best)
- Check browser console for errors
- Verify all files are committed and pushed

### 404 Error

- Make sure you're accessing the correct URL
- Include `public/index.html` in the path
- GitHub Pages is case-sensitive!

### Changes Not Updating

- Clear browser cache (Ctrl+F5)
- Wait 1-2 minutes after push
- Check if commit was successfully pushed: `git log`

## 📚 Additional Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Git Documentation](https://git-scm.com/doc)
- [Markdown Guide](https://www.markdownguide.org/)

## ✅ Deployment Checklist

- [ ] Git repository initialized
- [ ] All files committed
- [ ] GitHub repository created
- [ ] Remote added and verified
- [ ] Code pushed to GitHub
- [ ] GitHub Pages enabled
- [ ] Site is live and accessible
- [ ] README links updated
- [ ] Repository description added
- [ ] Topics/tags added
- [ ] License file included

## 🎉 Success!

Your Smart Timetable is now live on GitHub Pages! Share it with your friends and classmates.

---

**Need help?** Open an issue on GitHub or check the documentation.
