# Testing Guide for Deconstruct Feed

This document describes the automated testing setup for the Deconstruct Feed Chrome extension.

## Overview

The project uses a comprehensive testing strategy with three levels of tests:

1. **Unit Tests** - Test individual functions and modules in isolation
2. **Integration Tests** - Test how components work together
3. **E2E Tests** - Test the full extension in a real Chrome browser

## Test Stack

- **Vitest** - Fast unit test runner with native ESM support
- **@testing-library/svelte** - Component testing utilities
- **happy-dom** - Lightweight DOM implementation for tests
- **Playwright** - End-to-end testing framework
- **Sinon** - Mocking and stubbing utilities

## Running Tests

### All Tests
```bash
npm test
```

### Run Tests Once (CI Mode)
```bash
npm test -- --run
```

### Watch Mode
```bash
npm test
```

### With UI
```bash
npm run test:ui
```

### Coverage Report
```bash
npm run test:coverage
```

 Open `coverage/index.html` to view detailed coverage report.

### E2E Tests
```bash
# Build extension first
npm run build

# Run E2E tests
npm run test:e2e
```

## Test Structure

```
tests/
├── setup.js                 # Global test configuration & Chrome API mocks
├── lib/
│   ├── cache/
│   │   ├── aiCache.test.js      # AI cache tests
│   │   └── feedCache.test.js    # Feed cache tests
│   ├── i18n/
│   │   └── languageMap.test.js  # Language utilities tests
│   └── stores/
│       ├── settings.test.js     # Settings store tests
│       └── savedItems.test.js   # Saved items store tests
└── e2e/
    ├── fixtures.js          # Playwright Chrome extension fixture
    └── popup.test.js        # Popup E2E tests
```

## Writing Tests

### Unit Test Example

```javascript
import { describe, it, expect } from 'vitest';
import { hashContent } from '../../../src/lib/cache/aiCache';

describe('hashContent', () => {
  it('should generate consistent hashes', () => {
    const hash1 = hashContent('test');
    const hash2 = hashContent('test');
    expect(hash1).toBe(hash2);
  });
});
```

### Component Test Example

```javascript
import { render, fireEvent } from '@testing-library/svelte';
import MyComponent from '../components/MyComponent.svelte';

it('should handle click event', async () => {
  const { getByText } = render(MyComponent);
  await fireEvent.click(getByText('Click Me'));
  // assertions...
});
```

### E2E Test Example

```javascript
import { test, expect } from './fixtures';

test('should load extension', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(page.locator('.popup-container')).toBeVisible();
});
```

## Mocking Chrome APIs

Chrome APIs are automatically mocked in `tests/setup.js`. You can override mocks in individual tests:

```javascript
import { vi } from 'vitest';

it('should save to storage', async () => {
  const mockSet = vi.fn();
  global.chrome.storage.local.set = mockSet;
  
  await myFunction();
  
  expect(mockSet).toHaveBeenCalled();
});
```

## Coverage Goals

- **Unit Tests**: 80%+ for `/src/lib`
- **Component Tests**: 70%+ for major components
- **Integration Tests**: Critical paths covered
- **E2E Tests**: Core user workflows

## Current Test Coverage

Run `npm run test:coverage` to see current coverage statistics.

## Continuous Integration

Tests run automatically on every push via GitHub Actions (if configured).

Example CI configuration:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
```

## Debugging Tests

### Vitest UI
```bash
npm run test:ui
```

Opens a browser interface for debugging tests.

### Playwright Debug Mode
```bash
npx playwright test --debug
```

Opens Playwright Inspector for step-by-step debugging.

### VS Code Integration

Install the Vitest extension for VS Code for inline test running and debugging.

## Common Issues

### "Cannot find module" errors
- Ensure paths in vitest.config.js are correct
- Check import statements use correct file extensions

### Chrome API not mocked
- Add mock to `tests/setup.js`
- Verify `beforeEach` is called

### E2E tests failing
- Build extension first: `npm run build`
- Check dist folder exists
- Ensure Chrome/Chromium is installed

## Best Practices

1. **Keep tests focused** - One assertion per test when possible
2. **Use descriptive names** - Test names should describe behavior
3. **Mock external dependencies** - Don't make real network requests
4. **Clean up after tests** - Use beforeEach/afterEach
5. **Test edge cases** - Empty arrays, null values, errors
6. **Avoid testing implementation details** - Test behavior, not internals

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Chrome Extension Testing Guide](https://developer.chrome.com/docs/extensions/mv3/tut_testing/)
