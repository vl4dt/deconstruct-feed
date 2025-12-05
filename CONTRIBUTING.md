# Contributing to Deconstruct Feed

This guide is for the Deconstruct Feed development team. It outlines our development standards, workflows, and best practices.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Community](#community)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in all interactions.

### Our Standards

**Positive behaviors:**
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behaviors:**
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct considered inappropriate in a professional setting

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Google Chrome (latest version or Canary for Chrome AI features)
- Git
- Code editor (VS Code recommended with Svelte extension)

### Setting Up Development Environment

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR-USERNAME/deconstruct-feed.git
   cd deconstruct-feed
   ```

2. **Install Dependencies**
   ```powershell
   npm install
   ```

3. **Start Development Server**
   ```powershell
   npm run dev
   ```

4. **Load Extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder in your project

5. **Make Changes**
   - The extension will hot-reload as you make changes
   - Check the browser console for errors

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `docs/topic` - Documentation updates

### Working on a Feature

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write clean, readable code
   - Follow our style guidelines
   - Add comments for complex logic
   - Update documentation as needed

3. **Test Thoroughly**
   - Test all affected features
   - Check console for errors
   - Test in both popup and side panel modes
   - Test with different AI providers if applicable

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   ```

   Use conventional commit messages:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation only
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding tests
   - `chore:` - Maintenance tasks

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Code Style Guidelines

### Svelte Components

**Component Structure**
```svelte
<script>
  // Imports first
  import { onMount } from 'svelte';
  import { myStore } from '../stores/myStore';
  
  // Props
  let { propName = 'default' } = $props();
  
  // State (using $state rune)
  let localState = $state(initialValue);
  
  // Derived state (using $derived)
  let computed = $derived(localState * 2);
  
  // Functions
  function handleClick() {
    // ...
  }
  
  // Lifecycle
  onMount(() => {
    // ...
  });
</script>

<!-- Template -->
<div class="component">
  <!-- Use semantic HTML -->
  <button onclick={handleClick}>
    {propName}
  </button>
</div>

<style>
  /* Component-scoped styles */
  .component {
    /* Use CSS variables for theming */
    background: var(--bg-primary);
  }
</style>
```

**Best Practices**
- Use Svelte 5 runes (`$state`, `$derived`, `$effect`) instead of legacy syntax
- Keep components focused and single-purpose
- Extract reusable logic into separate files
- Use semantic HTML elements
- Prefer composition over prop drilling

### JavaScript Style

**General Rules**
- Use ES6+ features (arrow functions, destructuring, etc.)
- Use `const` by default, `let` when reassignment needed, never `var`
- Use async/await instead of promise chains
- Add JSDoc comments for public functions
- Keep functions small and focused

**Example**
```javascript
/**
 * Summarizes article text using the configured AI provider
 * @param {string} text - The article text to summarize
 * @param {string|null} apiKey - Optional API key override
 * @param {boolean} forceRefresh - Skip cache if true
 * @returns {Promise<string>} The generated summary
 */
export async function summarize(text, apiKey = null, forceRefresh = false) {
  return generateContent(
    `Summarize this news article in Markdown format:\n\n${text}`,
    'You are a helpful news assistant.',
    'summary',
    forceRefresh
  );
}
```

### CSS Style

**Naming Conventions**
- Use kebab-case for class names: `.news-card`, `.article-title`
- Use BEM for complex components: `.card__header`, `.card__title--large`
- Prefix utility classes with `u-`: `.u-text-center`, `.u-hidden`

**CSS Variables**
Always use CSS variables for colors and common values:
```css
.component {
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
}
```

**Responsive Design**
```css
.component {
  /* Mobile first */
  padding: 1rem;
}

@media (min-width: 768px) {
  .component {
    padding: 2rem;
  }
}
```

### File Organization

**Component Files**
- One component per file
- Name files with PascalCase: `NewsCard.svelte`, `SettingsPanel.svelte`
- Place in appropriate directory (`components/`, `popup/`, `options/`)

**Service Files**
- Use camelCase: `aiService.js`, `newsEngine.js`
- Place in `lib/` directory with logical subdirectories

**Store Files**
- Use camelCase: `settings.js`, `subscription.js`
- Place in `lib/stores/`
- Export store instance and related functions

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass (if applicable)
- [ ] Documentation updated
- [ ] Commit messages follow conventional format
- [ ] Branch is up to date with `develop`
- [ ] No console errors or warnings
- [ ] Tested in both popup and side panel modes

### PR Description Template

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Commented complex code
- [ ] Documentation updated
- [ ] No new warnings
```

### Review Process

1. Submit PR to `develop` branch
2. Automated checks will run (if configured)
3. Maintainers will review your code
4. Address any requested changes
5. Once approved, PR will be merged

## Reporting Bugs

### Before Reporting

1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/newslens-ai/issues)
2. Ensure you're using the latest version
3. Check the [troubleshooting guide](docs/USER_GUIDE.md#troubleshooting)

### Bug Report Template

```markdown
**Describe the Bug**
Clear description of what the bug is

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen

**Screenshots**
Add screenshots if applicable

**Environment**
- OS: [e.g., Windows 11]
- Chrome Version: [e.g., 120.0.6099.109]
- Extension Version: [e.g., 1.0.0]
- AI Provider: [e.g., Chrome AI]

**Additional Context**
Any other relevant information
```

## Suggesting Features

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
Clear description of the problem

**Describe the solution you'd like**
What you want to happen

**Describe alternatives you've considered**
Other solutions you've thought about

**Additional context**
Screenshots, mockups, or examples
```

### Feature Development Process

1. Create feature request issue
2. Discuss with maintainers
3. Get approval before starting work
4. Follow development workflow
5. Submit PR with feature

## Community

### Getting Help

- **Documentation**: Check [docs/](docs/) first
- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and general discussion

### Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- Special recognition for major features

## Additional Resources

- [Svelte 5 Documentation](https://svelte.dev/docs/svelte/overview)
- [Chrome Extension API](https://developer.chrome.com/docs/extensions/reference/)
- [Chrome AI Documentation](https://developer.chrome.com/docs/ai)
- [Vite Documentation](https://vitejs.dev/)

---

Thank you for contributing to Deconstruct Feed! Your efforts help make news consumption better for everyone. 🎉
