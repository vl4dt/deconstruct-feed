# AI Providers Setup Guide

NewsLens AI supports multiple AI providers, giving you flexibility in choosing the best option for your needs. This guide covers setup, features, costs, and recommendations for each provider.

## Quick Comparison

| Provider | Cost | Privacy | Speed | Quality | Setup Difficulty |
|----------|------|---------|-------|---------|------------------|
| **Chrome AI** | Free | ⭐⭐⭐⭐⭐ On-device | Fast | Good | Easy |
| **Gemini** | $$$  | ⭐⭐⭐ API | Fast | Excellent | Easy |
| **Local LLM** | Free | ⭐⭐⭐⭐⭐ Local | Medium | Good-Excellent | Medium |
| **OpenAI** | $$$$ | ⭐⭐⭐ API | Fast | Excellent | Easy |
| **Claude** | $$$ | ⭐⭐⭐ API | Fast | Excellent | Easy |

## Chrome Built-in AI (Recommended for Most Users)

### Overview

- **Cost**: Completely free
- **Privacy**: 100% on-device, no data leaves your computer
- **Model**: Gemini Nano
- **Best For**: Privacy-conscious users, everyday use, no API costs

### Requirements

- Chrome 127+ (Stable), or Chrome Dev/Canary
- Supported operating system (Windows, maclinux, Chrome OS)
- ~500MB disk space for model download

### Setup

1. **Update Chrome**
   - Download latest [Chrome Canary](https://www.google.com/chrome/canary/) or Chrome Dev
   - Or ensure Chrome Stable is version 127+

2. **Enable Chrome AI**
   - Open `chrome://flags/#optimization-guide-on-device-model`
   - Set to "Enabled BypassPerfRequirement"
   - Open `chrome://flags/#prompt-api-for-gemini-nano`
   - Set to "Enabled"
   - Restart Chrome

3. **Download Model**
   - Open NewsLens AI
   - Wait for model download (automatic, ~200-500MB)
   - Check progress in `chrome://components/`
   - Look for "Optimization Guide On Device Model"

4. **Select in NewsLens**
   - Go to Settings → AI Provider
   - Select "Chrome Built-in AI"
   - No API key needed!

### Troubleshooting

**Model Not Downloading**
- Check `chrome://components`
- Look for "Optimization Guide On Device Model"
- Click "Check for update"
- Wait a few minutes and refresh

**Chrome AI Not Available**
- Verify Chrome version: `chrome://version`
- Ensure flags are enabled correctly
- Restart Chrome completely
- Clear Chrome cache if persistent

**Performance Issues**
- Model runs on-device, performance varies by hardware
- Close other Chrome tabs to free resources
- First run may be slower (model initialization)

### Limitations

- May not be as powerful as cloud models (GPT-4, Claude)
- Requires modern hardware
- Output quality varies
- Still in experimental stage

---

## Google Gemini

### Overview

- **Cost**: Pay-per-use, generous free tier
- **Privacy**: Data sent to Google servers
- **Models**: gemini-1.5-flash (fast), gemini-1.5-pro (powerful)
- **Best For**: High-quality analysis, cost-effective at scale

### Pricing

- **Free Tier**: 15 requests/minute, 1500 requests/day
- **Paid**: ~$0.001-0.01 per request depending on model
- [View Pricing](https://ai.google.dev/pricing)

### Setup

1. **Get API Key**
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with Google account
   - Click "Create API Key"
   - Copy the key (starts with `AIza...`)

2. **Configure NewsLens**
   - Open NewsLens → Settings → AI Provider
   - Select "Google Gemini"
   - Paste API key
   - Choose model:
     - `gemini-1.5-flash` - Fast, cheap, good quality (recommended)
     - `gemini-1.5-pro` - Slower, more expensive, best quality

3. **Test**
   - Summarize an article
   - Check console for any errors

### Recommended Models

- **gemini-1.5-flash**: Best balance of speed, cost, and quality
- **gemini-1.5-pro**: When you need the absolute best results

### Cost Estimation

Typical usage (Pro user):
- Summarize: ~500 tokens per request
- Bias check: ~800 tokens
- Deep dive: ~1500 tokens
- Script gen: ~2000 tokens

**Example**: 100 requests/day with gemini-1.5-flash ≈ $0.10-0.30/month

### Troubleshooting

**"API Key Invalid"**
- Verify key is copied correctly (no extra spaces)
- Check API key is enabled in Google Cloud Console
- Ensure billing is set up (for paid tier)

**Rate Limit Errors**
- Free tier: 15 requests/minute
- Spread out requests or upgrade to paid tier
- Enable caching in NewsLens to reduce requests

---

## Local LLM (Ollama / LM Studio)

### Overview

- **Cost**: Free (hardware costs apply)
- **Privacy**: 100% local, no data leaves your computer
- **Models**: Llama 3, Mistral, Mixtral, many more
- **Best For**: Complete privacy, offline use, customization

### Requirements

- Modern computer (16GB+ RAM recommended)
- 10-50GB disk space (per model)
- GPU recommended but not required

### Setup with Ollama

1. **Install Ollama**
   - Download from [ollama.ai](https://ollama.ai)
   - Run installer
   - Verify installation: `ollama --version`

2. **Download Models**
   ```bash
   # Recommended: Llama 3 (4.7GB)
   ollama pull llama3
   
   # Alternative: Mistral (4.1GB)
   ollama pull mistral
   ```

3. **Start Ollama Server**
   ```bash
   ollama serve
   ```
   - Default URL: `http://localhost:11434`

4. **Configure NewsLens**
   - Settings → AI Provider → "Local LLM"
   - Server URL: `http://localhost:11434/v1/chat/completions`
   - Model: `llama3` (or your chosen model)
   - **Note**: NewsLens automatically handles CORS headers and connection issues, so no extra configuration is needed!

5. **Test**
   - Summarize an article
   - Check Ollama console for logs

### Setup with LM Studio

1. **Install LM Studio**
   - Download from [lmstudio.ai](https://lmstudio.ai)
   - Install and open

2. **Download Model**
   - Browse models in LM Studio
   - Download recommended: `llama-3-8b-instruct`
   - Or: `mistral-7b-instruct-v0.2`

3. **Start Server**
   - Click "Local Server" tab
   - Select model
   - Click "Start Server"
   - Note the URL (usually `http://localhost:1234`)

4. **Configure NewsLens**
   - Settings → AI Provider → "Local LLM"
   - Server URL: `http://localhost:1234/v1/chat/completions`
   - Model name: (check LM Studio)

### Recommended Models

**For 16GB RAM:**
- `llama3:8b` - Best overall (Ollama)
- `mistral:7b` - Faster, good quality (Ollama)

**For 32GB+ RAM:**
- `llama3:70b` - Excellent quality, slower
- `mixtral:8x7b` - Very good quality

### Performance Tips

- **Use GPU**: Enable GPU acceleration in Ollama/LM Studio
- **Adjust Context**: Smaller context = faster responses
- **Model Size**: Smaller models (7B-8B) faster than large (70B+)

### Troubleshooting

**Server Connection Failed**
- Verify server is running: visit `http://localhost:11434` in browser
- Check firewall settings
- Ensure correct port in NewsLens settings

**Slow Responses**
- Use smaller model (7B instead of 70B)
- Enable GPU acceleration
- Close other applications
- Reduce context window

**Out of Memory**
- Use smaller model
- Increase system RAM
- Close other applications

---

## OpenAI (GPT-4, GPT-4o-mini)

### Overview

- **Cost**: Pay-per-use, no free tier
- **Privacy**: Data sent to OpenAI servers
- **Models**: GPT-4o, GPT-4o-mini, GPT-4-turbo
- **Best For**: Highest quality analysis, complex tasks

### Pricing

- **GPT-4o-mini**: ~$0.001/request (recommended for NewsLens)
- **GPT-4o**: ~$0.01/request
- **GPT-4-turbo**: ~$0.03/request
- [View Pricing](https://openai.com/pricing)

### Setup

1. **Get API Key**
   - Sign up at [OpenAI Platform](https://platform.openai.com)
   - Add payment method (credit card required)
   - Go to [API Keys](https://platform.openai.com/api-keys)
   - Click "Create new secret key"
   - Copy key (starts with `sk-...`)

2. **Configure NewsLens**
   - Settings → AI Provider → "OpenAI"
   - Paste API key
   - Select model:
     - `gpt-4o-mini` - Fast, cheap, excellent (recommended)
     - `gpt-4o` - Best quality, more expensive
     - `gpt-4-turbo` - Slightly better than 4o, most expensive

3. **Set Usage Limits** (Recommended)
   - Go to [OpenAI Usage Limits](https://platform.openai.com/account/limits)
   - Set monthly budget cap
   - Enable email notifications

### Cost Estimation

Typical usage (Pro user, gpt-4o-mini):
- 50 summaries/day ≈ $1.50/month
- 20 bias checks/day ≈ $1.00/month
- 10 scripts/week ≈ $0.50/month
- **Total**: ~$3/month

### Recommended Models

- **gpt-4o-mini**: Best for NewsLens (fast, cheap, excellent)
- **gpt-4o**: When you need the absolute best

### Troubleshooting

**Insufficient Quota**
- Add payment method
- Increase usage limits in OpenAI dashboard
- Check account balance

**Rate Limits**
- Free trial: 3 requests/minute
- Paid: 500-10,000 requests/minute
- Enable caching in NewsLens

---

## Anthropic Claude

### Overview

- **Cost**: Pay-per-use, competitive pricing
- **Privacy**: Data sent to Anthropic servers
- **Models**: Claude 3.5 Sonnet, Claude 3 Opus
- **Best For**: Nuanced analysis, long-form content, ethical reasoning

### Pricing

- **Claude 3.5 Sonnet**: ~$0.003/request (recommended)
- **Claude 3 Opus**: ~$0.015/request
- [View Pricing](https://www.anthropic.com/pricing)

### Setup

1. **Get API Key**
   - Sign up at [Anthropic Console](https://console.anthropic.com)
   - Add payment method
   - Go to [API Keys](https://console.anthropic.com/account/keys)
   - Create new key
   - Copy key (starts with `sk-ant-...`)

2. **Configure NewsLens**
   - Settings → AI Provider → "Anthropic Claude"
   - Paste API key
   - Select model:
     - `claude-3-5-sonnet-latest` - Best balance (recommended)
     - `claude-3-opus-latest` - Highest quality, expensive

3. **Test**
   - Run a bias check (Claude excels at this)
   - Check console for errors

### Strengths

- **Bias Detection**: Claude is excellent at nuanced bias analysis
- **Long Context**: Handles very long articles well
- **Ethical Reasoning**: Good at analyzing ethical implications

### Cost Estimation

Typical usage (Pro user, Claude 3.5 Sonnet):
- 50 summaries/day ≈ $4.50/month
- 20 bias checks/day ≈ $3.00/month
- **Total**: ~$7-8/month

---

## Provider Recommendations

### Choose Chrome AI If:
✅ You want completely free AI  
✅ Privacy is your top priority  
✅ You don't need the absolute best quality  
✅ You're okay with experimental features

### Choose Gemini If:
✅ You want excellent quality at low cost  
✅ You need reliable, production-ready AI  
✅ You're okay with Google's privacy policy  
✅ You want the best price/performance ratio

### Choose Local LLM If:
✅ You have powerful hardware  
✅ You want 100% privacy and offline capability  
✅ You're comfortable with technical setup  
✅ You don't want ongoing costs

### Choose OpenAI If:
✅ You need the highest quality AI  
✅ Budget is not a primary concern  
✅ You're already using OpenAI elsewhere  
✅ You want the most capable models

### Choose Claude If:
✅ You need nuanced bias detection  
✅ You work with very long articles  
✅ You value ethical reasoning  
✅ You want excellent quality at competitive pricing

---

## Mixed Strategy

You can switch providers anytime in Settings. Consider:

- **Daily Use**: Chrome AI or Gemini Flash (free/cheap)
- **Important Analysis**: Claude or GPT-4o (best quality)
- **Offline**: Local LLM
- **Privacy-Critical**: Chrome AI or Local LLM

---

## Privacy Comparison

### Complete Privacy (Data Never Leaves Your Device)
- ✅ Chrome Built-in AI
- ✅ Local LLM (Ollama, LM Studio)

### Cloud-Based (Data Sent to Servers)
- ⚠️ Google Gemini - [Privacy Policy](https://policies.google.com/privacy)
- ⚠️ OpenAI - [Privacy Policy](https://openai.com/privacy/)
- ⚠️ Anthropic - [Privacy Policy](https://www.anthropic.com/privacy)

**Note**: All cloud providers encrypt data in transit and state they don't use API data to train models (verify in their privacy policies).

---

## Support & Resources

### Official Documentation
- [Chrome AI](https://developer.chrome.com/docs/ai)
- [Gemini API](https://ai.google.dev/docs)
- [Ollama](https://ollama.ai/docs)
- [OpenAI](https://platform.openai.com/docs)
- [Anthropic](https://docs.anthropic.com/)

### Getting Help
- Check NewsLens [troubleshooting guide](USER_GUIDE.md#troubleshooting)
- Browse provider documentation
- Check provider status pages for outages
- Contact the development team for NewsLens-specific issues

---

**Choose the provider that best fits your needs, budget, and privacy preferences!** 🚀
