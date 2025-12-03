# Deconstruct Feed

**Deconstruct your news feed with AI analysis, bias detection, and smart curation.**

Deconstruct Feed is a powerful Chrome extension that curates personalized news feeds based on your interests and leverages advanced AI to help you understand, analyze, and repurpose content. Whether you're a news enthusiast, content creator, or just staying informed, Deconstruct Feed is your intelligent news companion.

## ✨ Key Features

### 📰 Smart News Curation
- **Personalized Feed**: Follow topics that matter to you
- **Multi-Source Aggregation**: Get news from diverse, trustworthy sources
- **Automatic Categorization**: News organized by topic with collapsible sections
- **Trending Topics**: Stay ahead with real-time trending news analysis (Pro)
- **Search Integration**: Quick search across all your news or trending topics

### 🤖 AI-Powered Analysis
- **Smart Summarization**: Get concise summaries of any article
- **Bias Detection**: Uncover hidden biases and emotional language with objectivity ratings
- **Deep Dive Analysis**: Multi-article analysis to identify themes, contradictions, and connections (Pro)
- **Page Analysis**: Analyze any web page directly from your browser
- **Privacy-First**: Uses Chrome's built-in on-device AI when available

### ⚡ Offline & Performance
- **Offline Support**: Read saved articles and cached feeds even without internet
- **Smart Caching**: Automatically caches news and AI analysis for instant access
- **Background Sync**: Keeps your feed updated efficiently

### 🎬 Content Creation Tools
- **YouTube Script Generator**: Transform articles into engaging video scripts (Pro)
- **Podcast Script Generator**: Create two-host podcast scripts with natural banter (Pro)
- **Markdown Export**: Export articles with summaries in clean markdown format
- **Multi-Article Selection**: Combine multiple stories into comprehensive scripts

### 🌍 Smart Translation
- **Context-Aware Translation**: Translate articles while preserving tone and context
- **Auto-Translate AI Results**: Automatically translate AI analysis to your preferred language
- **Multi-Language Support**: Full internationalization (i18n) support

### 🎨 Modern User Experience
- **Beautiful UI**: Clean, minimalist design with dark/light theme support
- **Side Panel Mode**: Open NewsLens in Chrome's side panel for seamless browsing
- **Collections**: Save and organize articles into custom collections
- **Responsive Design**: Works perfectly as popup or side panel

### ⚙️ Flexible AI Providers
Choose the AI provider that works best for you:
- **Chrome Built-in AI** (Free, Privacy-focused, On-device)
- **Google Gemini** (Powerful, Requires API key)
- **Local LLM** (Ollama, LM Studio - Complete privacy)
- **OpenAI** (GPT-4, Requires API key)
- **Anthropic Claude** (Claude 3.5, Requires API key)

## 🚀 Quick Start

### Installation

#### From Source (Development)
```powershell
# Clone the repository
git clone https://github.com/yourusername/newslens-ai.git
cd newslens-ai

# Install dependencies
npm install

# Build the extension
npm run build

# Load in Chrome
# 1. Open Chrome and navigate to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the 'dist' folder
```

#### From Chrome Web Store (Coming Soon)
*Extension will be available on the Chrome Web Store soon*

### First-Time Setup

1. **Configure Topics**
   - Click the extension icon
   - Go to Settings (⚙️ icon)
   - Add topics you're interested in (e.g., "Technology", "Science", "Business")
   - Sources will be automatically discovered for each topic

2. **Choose AI Provider**
   - In Settings → AI Provider
   - Select your preferred provider:
     - **Chrome AI**: No setup needed (recommended for most users)
     - **Gemini**: Add your [Gemini API key](https://makersuite.google.com/app/apikey)
     - **Local LLM**: Configure your [Ollama](https://ollama.ai) or LM Studio server
     - **OpenAI**: Add your OpenAI API key
     - **Anthropic**: Add your Anthropic API key

3. **Start Reading**
   - Browse your personalized feed
   - Click any article to view details and AI analysis
   - Use analysis buttons: Summarize, Bias Check, Script, etc.

## 📖 Usage Guide

### News Feed Management

**Adding Topics**
1. Open Settings → "Manage News Sources & Topics"
2. Click "Add Topic"
3. Enter topic name (e.g., "Artificial Intelligence")
4. Sources are automatically discovered and added

**Organizing Your Feed**
- Collapse/expand topics by clicking the topic header
- Reorder topics in Settings (drag and drop coming soon)
- Refresh feed anytime with the refresh button

### AI Analysis Features

**Summarize an Article**
- Click an article to view details
- Click the "Summarize" button
- Get a concise AI-generated summary in seconds

**Check for Bias**
- View article details
- Click "Bias" button
- Receive objectivity rating (1-10) with detailed analysis

**Generate YouTube Script**
- Select multiple articles (click "Select" button)
- Choose articles to include
- Click "Script" to generate a YouTube video script

**Deep Dive Analysis**
- Select multiple related articles
- Click "Deep Dive"
- Get comprehensive analysis of themes, contradictions, and insights

### Page Analysis

Analyze any web page you're reading:
1. Navigate to any webpage
2. Open NewsLens AI extension
3. Click "Analyze Current Page"
4. Use Summarize, Bias, or Deep Dive on the page content

### Translation

**Translate Articles**
- Open article details
- Click the translate icon (🌐)
- Content automatically translates to your preferred language

**Auto-Translate AI Results**
- Enable in Settings → General → "Auto-translate AI content"
- All AI analysis results will be translated automatically

### Collections (Pro)

**Save Articles**
- Click the bookmark icon on any article
- Article is saved to "Saved Items"

**Create Collections**
- Go to "My Feed" → "Collections"
- Create custom collections (e.g., "Read Later", "Research")
- Move articles between collections

## 🔧 Configuration

### Settings Overview

**General**
- Auto-summarize: Automatically summarize articles when opened
- Auto-bias check: Automatically check bias (Pro)
- Auto-translate: Translate AI content to your language
- Theme: Light/Dark/System

**AI Provider**
Configure your preferred AI service with API keys and model selection

**News Sources**
- Manage topics and sources
- Add/remove RSS feeds
- Configure trending keywords (Pro)

**Advanced**
- Preload analyses for faster access (Pro)
- Cache management
- Clear data

## 🏗️ Development

### Tech Stack
- **Frontend**: Svelte 5, Vite
- **Styling**: Vanilla CSS with CSS Variables
- **AI Integration**: Chrome AI, Gemini API, OpenAI, Anthropic, Local LLMs
- **Storage**: Chrome Storage API
- **Build**: Vite with Chrome Extension support

### Project Structure
```
newslens-ai/
├── src/
│   ├── popup/          # Main popup/side panel UI
│   ├── options/        # Settings page
│   ├── background/     # Background service worker
│   ├── components/     # Reusable Svelte components
│   ├── lib/
│   │   ├── ai/        # AI service integrations
│   │   ├── news/      # News fetching and parsing
│   │   ├── cache/     # Caching system
│   │   ├── stores/    # Svelte stores
│   │   └── i18n/      # Internationalization
│   └── styles/        # Global styles
├── public/            # Static assets
│   ├── icons/        # Extension icons
│   └── manifest.json # Extension manifest
└── docs/             # Documentation
```

### Development Commands
```powershell
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Building & Testing
1. Run `npm run build` to create production build
2. Load `dist` folder as unpacked extension in Chrome
3. Test all features thoroughly
4. Check browser console for any errors

For detailed development documentation, see [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md).

## 📚 Documentation

> **[📖 View Complete User Guide](https://newslens-ai.vercel.app/docs/)**  
> Access our comprehensive documentation online for detailed guides and support.

### Quick Links
- **[User Guide](https://newslens-ai.vercel.app/docs/USER_GUIDE)** - Comprehensive feature walkthrough

- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Architecture and development
- **[API Documentation](docs/API.md)** - Service APIs and interfaces
- **[Architecture](docs/ARCHITECTURE.md)** - System design and data flow
- **[AI Providers Guide](docs/AI_PROVIDERS.md)** - AI integration setup
- **[Contributing](CONTRIBUTING.md)** - Contribution guidelines


## 💎 Pro Features

Upgrade to Pro to unlock:
- ✅ Trending Topics with real-time analysis
- ✅ Bias Detection with detailed reports
- ✅ YouTube Script Generation
- ✅ Podcast Script Generation
- ✅ Deep Dive Multi-Article Analysis
- ✅ Collections & Advanced Organization
- ✅ Pre-loading & Performance Enhancements

## 🔒 Privacy

- **Privacy-First Design**: Chrome AI runs completely on-device
- **No Data Collection**: We don't collect or store your personal data
- **API Keys**: Your API keys are stored locally in your browser only

## 📄 License

Copyright © 2025 NewsLens AI. All Rights Reserved. See the [LICENSE](LICENSE) file for details.

## 🐛 Troubleshooting

**Chrome AI Not Available?**
- Ensure you're using Chrome 127+ or Chrome Dev/Canary
- Chrome AI may need to download models on first use
- Check chrome://components for "Optimization Guide On Device Model"

**News Not Loading?**
- Check your internet connection
- Verify RSS feeds are accessible
- Try refreshing with the refresh button

**AI Analysis Errors?**
- Verify your API key is correct (for Gemini/OpenAI/Anthropic)
- Check API usage limits
- Try switching to Chrome AI as fallback

**Extension Not Loading?**
- Clear the extension cache
- Reinstall the extension
- Check browser console for specific errors

For more help, see our detailed [troubleshooting guide](docs/USER_GUIDE.md#troubleshooting).

## 🙏 Acknowledgments

Built with:
- [Svelte](https://svelte.dev) - Reactive UI framework
- [Vite](https://vitejs.dev) - Next-generation build tool
- [Marked](https://marked.js.org) - Markdown parser
- [Chrome AI](https://developer.chrome.com/docs/ai) - On-device AI

---

**Made with ❤️ for news enthusiasts and content creators**
