# Deconstruct Feed User Guide

Welcome to Deconstruct Feed! This comprehensive guide will help you get the most out of your intelligent news companion.

## Table of Contents

- [Chrome AI Setup](#chrome-ai-setup-gemini-nano)
- [Getting Started](#getting-started)
- [News Feed Management](#news-feed-management)
- [AI Analysis Features](#ai-analysis-features)
- [Content Creation](#content-creation)
- [Page Analysis](#page-analysis)
- [Translation Features](#translation-features)
- [Collections & Saved Items](#collections--saved-items)
- [Settings & Configuration](#settings--configuration)
- [Pro Features](#pro-features)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Troubleshooting](#troubleshooting)

## Chrome AI Setup (Gemini Nano)

Chrome AI (powered by Gemini Nano) provides free, privacy-focused AI capabilities that run entirely on your device. This section covers how to enable Chrome AI for use with Deconstruct Feed.

### Hardware Requirements

Before setting up Chrome AI, ensure your system meets these requirements:

| Requirement | Minimum |
|-------------|---------|
| **GPU VRAM** | 4GB or more |
| **Free Storage** | 22GB in Chrome profile directory |
| **Operating System** | Windows 10/11, macOS 13+, Linux, or ChromeOS (Chromebook Plus) |
| **Chrome Version** | 127 or higher |

> **Note**: Chrome AI runs on-device using your GPU. Performance varies based on hardware capability.

### Step 1: Install or Update Chrome

You need Chrome version 127 or higher. For the latest AI features, consider using:

- **Chrome Stable** (v127+): [Download Chrome](https://www.google.com/chrome/)
- **Chrome Dev**: [Download Chrome Dev](https://www.google.com/chrome/dev/)
- **Chrome Canary** (latest features): [Download Chrome Canary](https://www.google.com/chrome/canary/)

To check your Chrome version:
1. Open Chrome
2. Go to `chrome://version`
3. Look for the version number (should be 127 or higher)

### Step 2: Enable Chrome Developer Mode & Flags

Chrome AI requires enabling specific experimental flags:

#### Enable Prompt API for Gemini Nano
1. Open Chrome and navigate to: `chrome://flags/#prompt-api-for-gemini-nano`
2. Find "Prompt API for Gemini Nano"
3. Set the dropdown to **"Enabled"** (or "Enabled multilingual" for multi-language support)
4. **Do not restart yet** - continue to the next flag

#### Enable On-Device Model
1. Navigate to: `chrome://flags/#optimization-guide-on-device-model`
2. Find "Enables optimization guide on device model"
3. Set the dropdown to **"Enabled BypassPerfRequirement"**
   - The "BypassPerfRequirement" option helps ensure the model downloads even if Chrome thinks your hardware may be insufficient

#### Restart Chrome
1. Click the **"Relaunch"** button at the bottom of the page
2. Chrome will restart with the new flags enabled

### Step 3: Download the Chrome AI Model

After enabling the flags, you need to trigger the model download:

1. Navigate to: `chrome://components`
2. Scroll down to find **"Optimization Guide On Device Model"**
3. Click **"Check for update"**
4. The model will begin downloading (~2GB)
   - Download time depends on your internet connection
   - The model downloads in the background
5. Wait for the "Status" to show a version number (e.g., "2024.x.x.x")

> **Tip**: You may need to click "Check for update" multiple times and wait a few minutes between attempts. The download happens in the background.

### Step 4: Verify Chrome AI is Working

There are several ways to verify Chrome AI is properly installed:

#### Method 1: DevTools Console
1. Open any webpage in Chrome
2. Press **F12** to open DevTools
3. Go to the **Console** tab
4. Type: `await LanguageModel.availability();`
5. Press Enter
6. Expected result: `"available"`

#### Method 2: On-Device Internals
1. Navigate to: `chrome://on-device-internals`
2. Check the **Model Status** tab
3. Look for any error messages

#### Method 3: Test in Deconstruct Feed
1. Open Deconstruct Feed
2. Go to Settings → AI Provider
3. Select "Chrome Built-in AI"
4. Try summarizing an article
5. If it works, Chrome AI is configured correctly!

### Troubleshooting Chrome AI Setup

**Model Not Downloading**
- Ensure you have at least 22GB free storage
- Try clicking "Check for update" multiple times in `chrome://components`
- Restart Chrome completely and try again
- Check your internet connection

**"Not Available" Status**
- Verify both flags are enabled correctly
- Ensure Chrome version is 127+
- Check hardware requirements (especially GPU VRAM)
- Try Chrome Canary if using stable Chrome

**Performance Issues**
- Close other GPU-intensive applications
- First use may be slower while the model initializes
- Consider using a cloud AI provider if your hardware struggles

---

## Getting Started

### First Launch

When you first open Deconstruct Feed:

1. **Choose Your Interface**
   - Click the extension icon for popup mode
   - Or click "Open in side panel" for a persistent panel alongside your browsing

2. **Initial Setup**
   - The extension will check for Chrome AI availability
   - You'll be prompted to add your first topics

3. **Add News Topics**
   - Click Settings (⚙️ icon)
   - Navigate to "Manage News Sources & Topics"
   - Click "Add Topic" and enter a topic (e.g., "Technology", "Science")
   - Deconstruct Feed will automatically discover relevant sources

### Understanding the Interface

**Main Views:**
- **Feed** - Your personalized news feed organized by topics
- **Trending** - Real-time trending topics (Pro feature)
- **Settings** - Configuration and topic management
- **My Feed** - Saved articles and collections

**Navigation Bar:**
- 🏠 Feed - Return to main news feed
- 🔥 Trending - View trending topics (Pro)
- 📑 My Feed - Access saved articles
- ⚙️ Settings - Configure the extension
- 🔄 Refresh - Reload news

## News Feed Management

### Adding and Managing Topics

**Add a New Topic**
1. Click Settings → "Manage News Sources & Topics"
2. Scroll to "Add New Topic" section
3. Enter topic name (e.g., "Artificial Intelligence")
4. Click "Add Topic"
5. Sources are automatically discovered and added

**Remove a Topic**
1. Go to Settings → "Manage News Sources & Topics"
2. Find the topic you want to remove
3. Click the "Delete" button next to the topic
4. Confirm deletion

**Customize Sources**
1. In topic settings, click "Show Sources"
2. Add custom RSS feeds by clicking "Add RSS Feed"
3. Enter the feed URL and description
4. Remove unwanted sources by clicking the × button

### Organizing Your Feed

**Collapse/Expand Topics**
- Click any topic header to collapse or expand that section
- Collapsed topics show a count of unread articles
- Your preferences are saved automatically

**Sort Topics**
Topics are displayed in the order you've configured in Settings. To reorder:
1. Go to Settings → "Manage News Sources & Topics"
2. Topics appear in the order they were created
3. Delete and re-add to change order (drag-and-drop coming soon)

**Search News**
- Use the search box at the top of Feed or Trending view
- Search filters articles by title and description
- Results update in real-time as you type
- Clear search to return to full feed

### Refreshing News

**Manual Refresh**
- Click the refresh button (🔄) in the navigation bar
- This forces a fresh fetch from all sources
- Loading indicator shows progress

**Auto-Refresh**
- News automatically refreshes in the background
- Cached articles load instantly on app open
- Fresh news fetches in the background

## AI Analysis Features

### Summarization

**Summarize Individual Articles**
1. Click any article to view details
2. Click the "Summarize" button
3. AI generates a concise summary in seconds
4. Summary appears in Markdown format
5. Click "Summarize" again to hide/refresh

**Auto-Summarize** (Settings)
- Enable "Auto-summarize articles" in Settings
- Articles are automatically summarized when opened
- Reduces reading time significantly

**Copy Summary**
- Click the copy icon next to the summary
- Summary is copied to clipboard
- Toast notification confirms success

### Bias Detection (Pro)

**Check Article Bias**
1. Open article details
2. Click "Bias" button
3. AI analyzes the text for:
   - Emotional language
   - Framing and perspective
   - Objectivity rating (1-10 scale)
   - Specific examples of bias

**Auto-Bias Check** (Settings)
- Enable in Settings → "Auto-bias check"
- Bias analysis runs automatically when opening articles
- Only available for Pro users

**Understanding Bias Scores**
- **9-10**: Highly objective, minimal bias
- **7-8**: Generally objective with minor framing
- **5-6**: Moderate bias or emotional language
- **3-4**: Significant bias or strong framing
- **1-2**: Highly biased or propaganda

### Deep Dive Analysis (Pro)

**Single Article Deep Dive**
1. Open article details
2. Click "Deep Dive" button
3. AI provides comprehensive analysis:
   - Context and background
   - Implications and consequences
   - Related topics and connections

**Multi-Article Deep Dive**
1. Click "Select" button to enter selection mode
2. Select multiple related articles (checkbox appears on each)
3. Click "Deep Dive" at the bottom
4. AI analyzes:
   - Common themes across articles
   - Contradictions and differing perspectives
   - Causal relationships
   - Comprehensive insights

**Best Practices**
- Select 2-5 related articles for best results
- Choose articles on the same topic or event
- Use for complex stories requiring multiple perspectives

## Content Creation

### YouTube Script Generation (Pro)

**Create Video Scripts**
1. Enter selection mode (click "Select")
2. Choose articles to include (1-10 articles recommended)
3. Click "Script" button
4. AI generates a complete YouTube script with:
   - Engaging hook
   - Topic transitions
   - Call to action
   - Estimated video length

**Script Format**
- **Intro**: Attention-grabbing opening
- **Content**: Story coverage with smooth transitions
- **Outro**: Summary and call to action
- Formatted in Markdown for easy editing

**Copy and Use**
- Click copy icon to copy entire script
- Paste into your video editing software
- Edit and customize as needed

### Podcast Script Generation (Pro)

**Create Podcast Scripts**
1. Select articles (selection mode)
2. Click "Podcast" button
3. AI generates a two-host dialogue script:
   - Natural banter between hosts
   - Music cues
   - Smooth topic transitions
   - Engaging discussion format

**Script Features**
- Host names: Alex and Sam (customizable in your editor)
- Conversational tone
- Natural segues between topics
- Intro and outro segments

### Export to Markdown

**Export Article with Summary**
1. Open article details
2. Summarize the article (if not already done)
3. Click "Export" or copy button
4. Complete Markdown file copied to clipboard including:
   - Article title and metadata
   - Original article link
   - AI-generated summary
   - Article description

## Page Analysis

Analyze any webpage you're currently viewing:

### Analyze Current Page

1. **Navigate to Any Webpage**
   - Open any article, blog post, or news page in Chrome

2. **Open Deconstruct Feed**
   - Click the extension icon

3. **Start Page Analysis**
   - Click "Analyze Current Page" button
   - Extension extracts main content from the page

4. **Use AI Features**
   - **Summarize**: Get a summary of the page
   - **Bias**: Check bias in the content
   - **Deep Dive**: Comprehensive analysis (Pro)

### Supported Content

- News articles
- Blog posts  
- Wikipedia pages
- Documentation
- Any text-heavy content

### Context Menu Integration

Right-click on any webpage and look for Deconstruct Feed options:
- "Analyze this page" - Quick analysis
- "Search for..." - Search selected text in trending topics

## Translation Features

### Translate Articles

**Manual Translation**
1. Open article details
2. Click the translate icon (🌐) at the top
3. Content translates to your preferred language
4. Click again to return to original

**What Gets Translated**
- Article title
- Article description
- AI-generated summary (if available)
- Bias analysis (if generated)
- Deep dive results (if generated)

### Auto-Translate AI Content

**Enable Auto-Translation**
1. Go to Settings → General
2. Enable "Auto-translate AI content"
3. All AI-generated content automatically translates
4. Based on your browser's language preference

**Supported Languages**
- English (en)
- Spanish (es)
- More languages coming soon

### Language Settings

**Change UI Language**
**Auto-Features**
- **Auto-summarize**: Automatically summarize articles when opened
- **Auto-bias check** (Pro): Automatically check bias
- **Auto-translate AI content**: Translate AI results to your language

**Theme**
- **Light**: Light color scheme
- **Dark**: Dark color scheme
- **System**: Follow system preference

**Language**
- Change UI language
- Currently supports English and Spanish

### AI Provider Configuration

**Choose AI Provider**
1. Go to Settings → AI Provider
2. Select from dropdown:
   - Chrome Built-in AI (recommended)
   - Google Gemini
   - Local LLM
   - OpenAI
   - Anthropic Claude

**Chrome AI** (Default)
- No setup required
- Completely free
- Privacy-focused (on-device)
- Requires Chrome 127+ with AI features

**Google Gemini**
1. Select "Gemini" from dropdown
2. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
3. Enter API key in settings
4. Choose model (gemini-1.5-flash recommended)

**Local LLM**
1. Install [Ollama](https://ollama.ai) or LM Studio
2. Start local server (default: http://localhost:11434)
3. Select "Local LLM" in Deconstruct Feed
4. Configure server URL and model name
5. Completely private, no data leaves your device

**OpenAI**
1. Get API key from [OpenAI Platform](https://platform.openai.com)
2. Select "OpenAI" provider
3. Enter API key
4. Choose model (gpt-4o-mini recommended for cost-efficiency)

**Anthropic Claude**
1. Get API key from [Anthropic Console](https://console.anthropic.com)
2. Select "Anthropic" provider
3. Enter API key
4. Choose model (claude-3-5-sonnet-latest recommended)

### News Source Management

**Add Custom RSS Feed**
1. Go to Settings → "Manage News Sources & Topics"
2. Select a topic
3. Click "Add RSS Feed"
4. Enter feed URL
5. Add description
6. Click "Add"

**Remove Sources**
- Click × next to any source to remove it
- Changes save automatically

**Add Topics**
- Enter topic name in "Add New Topic" section
- Sources auto-discovered via search APIs
- Can add custom feeds after topic creation

### Trending Keywords (Pro)

**Configure Trending Search**
1. Go to Settings → "Trending Keywords"
2. Enter keywords to monitor (comma-separated)
3. Examples: "breaking news", "tech news", "AI"
4. Trending view uses these for real-time search

### Advanced Settings (Pro)

**Preload Analysis**
- **Preload scripts**: Pre-generate scripts in background
- **Preload podcasts**: Pre-generate podcast scripts
- Improves performance for frequently-used features

**Cache Management**
- View cache size
- Clear AI analysis cache
- Clear news cache
- Reset all data

## Pro Features

### Upgrading to Pro

1. Click "Upgrade to Pro" from any Pro feature
2. Choose subscription plan:
   - Monthly: $4.99/month
   - Annual: $49/year (save 17%)
   - Lifetime: $79 one-time
3. Complete checkout via Paddle
4. Activate license in extension

### Pro Feature List

✅ **Trending Topics** - Real-time trending news analysis  
✅ **Bias Detection** - Detailed bias reports with objectivity scores  
✅ **YouTube Scripts** - AI-generated video scripts  
✅ **Podcast Scripts** - Two-host dialogue scripts  
✅ **Deep Dive Analysis** - Multi-article comprehensive analysis  
✅ **Collections** - Organize saved articles  
✅ **Preloading** - Background analysis for faster access  
✅ **Auto-Bias Check** - Automatic bias analysis  

### License Management

**Activate License**
1. After purchase, you receive a license key
2. Go to Settings → License
3. Enter license key
4. Click "Activate"
5. Pro features unlock immediately

**Check License Status**
- View in Settings → License section
- Shows expiration date (if subscription)
- Shows renewal status

## Keyboard Shortcuts

*Coming in future update*

Planned shortcuts:
- `Ctrl+Shift+N` - Open Deconstruct Feed
- `R` - Refresh feed
- `S` - Toggle search
- `Esc` - Go back/close panels

## Troubleshooting

### Chrome AI Issues

**Chrome AI Not Available**
- **Solution**: Update to Chrome 127+ or use Chrome Dev/Canary
- **Check**: Go to `chrome://components` and look for "Optimization Guide On Device Model"
- **Download**: Component may need to download on first use (100-500MB)

**Chrome AI Download Stuck**
- **Solution 1**: Restart Chrome
- **Solution 2**: Check internet connection
- **Solution 3**: Try again in a few hours (Google servers may be busy)

### News Loading Issues

**No Articles Loading**
- **Check**: Internet connection
- **Check**: RSS feeds are accessible (some may be blocked by CORS)
- **Try**: Refresh with the refresh button
- **Try**: Remove and re-add the topic

**Articles Are Old**
- **Solution**: Click refresh button to force fresh fetch
- **Check**: RSS feeds may not be updating frequently

**Some Topics Empty**
- **Reason**: Auto-discovered sources may not have recent content
- **Solution**: Add custom RSS feeds manually for that topic

### AI Analysis Errors

**"Error: API Key Missing"**
- **Solution**: Enter API key in Settings → AI Provider
- **Check**: Correct provider selected
- **Check**: API key is valid

**"Error: Chrome AI Not Available"**
- **Solution**: Switch to different AI provider (Gemini, Local LLM)
- **Check**: Chrome version supports AI features

**"Error: Rate Limit Exceeded"**
- **Gemini/OpenAI**: You've exceeded API quota
- **Solution**: Wait for quota reset or switch to Chrome AI
- **Check**: API billing and limits in provider dashboard

**Analysis Takes Too Long**
- **Chrome AI**: First run may be slower (model download)
- **Cloud APIs**: Check internet speed
- **Local LLM**: Check if server is running and responsive

### Translation Issues

**Translation Not Working**
- **Check**: AI provider is configured correctly
- **Try**: Switch to different AI provider
- **Note**: Translation quality varies by provider

**Translated Text Looks Wrong**
- **Note**: AI translation may not be perfect
- **Try**: Click translate again to return to original
- **Try**: Different AI provider may give better results

### Extension Performance

**Extension Feels Slow**
- **Solution**: Clear cache in Settings → Advanced
- **Solution**: Reduce number of topics
- **Solution**: Disable preloading features
- **Check**: Chrome has sufficient memory

**High Memory Usage**
- **Solution**: Close and reopen extension
- **Solution**: Reduce number of active topics
- **Solution**: Clear news cache

### Saved Items Issues

**Saved Articles Disappearing**
- **Check**: Chrome sync is enabled (if using across devices)
- **Check**: Storage quota not exceeded
- **Solution**: Export important articles to Markdown

**Collections Not Saving**
- **Check**: Pro license is active
- **Try**: Refresh extension
- **Report**: If persistent, report as bug

### General Issues

**Extension Not Loading**
1. Check Chrome extensions page (`chrome://extensions/`)
2. Ensure Deconstruct Feed is enabled
3. Click refresh icon on extension
4. Try reloading Chrome
5. Reinstall extension if needed

**Settings Not Saving**
- **Check**: Chrome storage permissions
- **Try**: Refresh extension
- **Check**: Not in incognito mode without permission

**White Screen / Blank Page**
- **Solution**: Check browser console for errors (F12)
- **Solution**: Reload extension
- **Report**: Submit bug report with console errors

### Getting Further Help

**Console Errors**
1. Open extension
2. Right-click and select "Inspect"
3. Go to Console tab
4. Copy any error messages
5. Include in bug report

**Support Channels**
- Documentation: Check [other docs](../README.md) for more info
- Internal: Contact the development team for assistance

---

## Tips & Best Practices

### Maximize Your Workflow

1. **Use Side Panel Mode**
   - Keeps Deconstruct Feed  always accessible
   - Browse articles while reading in main tab

2. **Enable Auto-Features**
   - Auto-summarize saves time
   - Auto-translate for multilingual content

3. **Organize with Collections** (Pro)
   - "Read Later" for articles to save
   - "Research" for deep work
   - Topic-specific collections

4. **Leverage Selection Mode** (Pro)
   - Generate scripts from multiple articles
   - Deep dive into complex topics
   - Compare different perspectives

5. **Choose the Right AI Provider**
   - Chrome AI: Best for privacy and speed
   - Gemini: Best for quality and cost
   - Local LLM: Best for complete privacy
   - GPT-4: Best for complex analysis
   - Claude: Best for nuanced understanding

---

**Enjoy using Deconstruct Feed! Stay informed, analyze smartly, and create brilliantly.** 🚀
