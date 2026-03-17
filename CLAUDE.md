# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm start          # Start local dev server at http://localhost:3000
npm run build      # Build production static site to /build
npm run serve      # Serve the built site locally
npm run clear      # Clear Docusaurus cache

# Testing
npm test           # Run unit tests with Jest

# Deployment
USE_SSH=true npm run deploy               # Deploy to GitHub Pages via SSH
GIT_USER=<username> npm run deploy        # Deploy to GitHub Pages via HTTPS

# Content utilities
npm run write-translations    # Generate i18n translation files
npm run write-heading-ids     # Auto-generate heading IDs
npm run swizzle               # Eject/customize Docusaurus components
```

## Architecture

This is a [Docusaurus 3.9.2](https://docusaurus.io/) static documentation site.

**Content** lives in two places:
- `blog/` — Blog posts with author metadata in `blog/authors.yml` and tags in `blog/tags.yml`
- `src/pages/` — Custom React pages (rendered at their filename path, e.g. `index.js` → `/`)

Note: The docs plugin is disabled (`docs: false` in the preset config). The `docs/` folder and `sidebars.js` are unused.

**React source** in `src/`:
- `src/pages/index.js` — Homepage with hero banner + blog post list
- `src/components/HomepageFeatures/` — Homepage blog list component (renders posts from `usePluginData`)
- `src/css/custom.css` — Global Infima CSS variable overrides (primary color, dark mode)

**Configuration:**
- `docusaurus.config.js` — Main config: site metadata, navbar, footer, theme (Prism), presets

**Homepage blog list:**
- `plugins/blog-posts-plugin.js` — Custom Docusaurus plugin that uses `allContentLoaded` to read blog posts from the built-in `docusaurus-plugin-content-blog` plugin's processed data (no filesystem parsing). Exposes the post list via `setGlobalData`.
- The homepage (`src/components/HomepageFeatures/`) consumes this data with `usePluginData('blog-posts-plugin')`.
- Adding a new `.md` or `.mdx` file to `blog/` (or a folder with `index.md`) will automatically include it on the homepage after the next build. The post must have a `title` field in its frontmatter. Posts retain the order from the blog plugin (newest first).

**Blog post conventions:**
- File naming: `blog/YYYY/YYYY-MM-DD-slug.md`
- Required frontmatter: `slug`, `title`, `authors` (key from `authors.yml`), `tags` (keys from `tags.yml`)
- Include `<!-- truncate -->` to control the preview excerpt — omitting it triggers a build warning (`onUntruncatedBlogPosts: 'warn'`)
- `onBrokenLinks: 'throw'` — the build hard-fails on any broken internal links

**Styling** uses CSS Modules (`.module.css`) for component-scoped styles and Infima CSS framework variables for global theming. Dark/light mode is handled via CSS custom properties.
