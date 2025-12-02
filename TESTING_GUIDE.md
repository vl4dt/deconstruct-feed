# NewsLens AI - Testing Guide

## Onboarding & Progressive Disclosure Testing

This guide covers manual testing scenarios for the onboarding and progressive disclosure features.

---

## Prerequisites

Before testing, ensure:
- Extension is built successfully (`npm run build`)
- Extension is loaded in Chrome (Developer mode)
- You have access to the "Reset Onboarding" button in Settings

---

## Test Scenarios

### 1. New User Flow (First-TimeExperience)

**Steps:**
1. Install the extension for the first time OR reset onboarding via Settings
2. Open the extension popup

**Expected Behavior:**
- ✅ `WelcomeWizard` appears with Step 1 (Welcome screen)
- ✅ Can navigate through all 3 wizard steps
- ✅ Step 2: Can select topics (at least 1 required)
- ✅ Step 3: AI provider selection works
- ✅ After completing wizard, `FeatureTour` starts automatically
- ✅ Tour highlights: Feed, Search, Saved, Settings in sequence
- ✅ Can skip tour or complete it
- ✅ After tour, `OnboardingChecklist` appears in bottom-right
- ✅ Checklist shows 0/6 completed initially

### 2. Existing User Flow

**Steps:**
1. Use extension with existing data (topics, saved articles)
2. Open extension popup

**Expected Behavior:**
- ✅ NO `WelcomeWizard` appears
- ✅ NO `FeatureTour` appears
- ✅ `OnboardingChecklist` may appear if not all steps complete
- ✅ Normal feed loads immediately

### 3. Contextual Hints

Test each hint individually - Summarize, Bias Check, Translate, Select Mode buttons.

### 4. Feature Discovery Tour

Tour should highlight Feed, Search, Saved, Settings in sequence.

### 5. Onboarding Checklist

Tracks 6 tasks: Add Topics, Configure AI, Read Article, Try Summarize, Save Article, Try Translate.

### 6. Help Panel

"?" button shows contextual helps based on view.

### 7. AI Provider UI

Cards display with badges for each provider.

### 8. Reset Onboarding

Uses Svelte dialog instead of browser popup.

---

## Sign-Off Checklist

- [ ] All scenarios pass
- [ ] Accessibility checks pass
- [ ] Both themes work
- [ ] No console errors
- [ ] Build passes
