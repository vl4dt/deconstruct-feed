
import { getCachedAIResult, setCachedAIResult, hashContent } from '../cache/aiCache';
import { getLanguageName } from '../i18n/languageMap';
import { get } from 'svelte/store';
import { settings } from '../stores/settings';

async function initDefaults() {
    const defaults = await LanguageModel.params();
    console.log('Model default:', defaults);
    if (!('LanguageModel' in self)) {
        return;
    }
}

initDefaults();


export async function isChromeAIAvailable() {
    console.log('Checking Chrome AI availability...');
    const availability = await LanguageModel.availability();

    console.log('Chrome AI is:', availability);

    if (availability !== 'available') {
        console.log('Chrome AI is unavailable');

        try {
            console.log('AI model needs download. Attempting to trigger download via empty session creation...');
            // Attempt to trigger download
            try {
                const session = await LanguageModel.create({
                    monitor(m) {
                        m.addEventListener('downloadprogress', (e) => {
                            console.log(`Downloaded ${e.loaded * 100}%`);
                        });
                    },
                });
            } catch (downloadError) {
                console.error('Failed to download model:', downloadError);
                return false;
            }

            return true;
        } catch (e) {
            console.error('Error downloading model:', e);
            return false;
        }
    } else {
        return true;
    }
}

export async function summarize(text, apiKey = null, forceRefresh = false) {
    return generateContent(
        `Summarize this news article in Markdown format:\n\n${text}`,
        'You are a helpful news assistant. Summarize the following article concisely in Markdown format.',
        'summary',
        forceRefresh
    );
}

async function summarizeWithGemini(text, apiKey, model = 'gemini-1.5-flash') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: `Summarize this news article in Markdown format:\n\n${text}` }]
            }]
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API Error: ${response.statusText} - ${err}`);
    }

    const data = await response.json();
    if (data.candidates && data.candidates.length > 0) {
        return data.candidates[0].content.parts[0].text;
    }
    throw new Error('No response from Gemini');
}

async function generateWithLocalAI(prompt, systemPrompt, config) {
    const url = config.localAIUrl || 'http://localhost:11434/v1/chat/completions';
    const model = config.localAIModel || 'llama3';

    const messages = [];
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: model,
            messages: messages,
            stream: false
        })
    });

    if (!response.ok) {
        throw new Error(`Local AI Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

async function generateWithOpenAI(prompt, systemPrompt, config) {
    if (!config.openaiKey) throw new Error('OpenAI API Key is missing');

    const messages = [];
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.openaiKey}`
        },
        body: JSON.stringify({
            model: config.openaiModel || 'gpt-4o-mini',
            messages: messages
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI Error: ${err}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

async function generateWithAnthropic(prompt, systemPrompt, config) {
    if (!config.anthropicKey) throw new Error('Anthropic API Key is missing');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.anthropicKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true' // Required for browser usage
        },
        body: JSON.stringify({
            model: config.anthropicModel || 'claude-3-5-sonnet-latest',
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }]
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Anthropic Error: ${err}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

async function generateContent(prompt, systemPrompt, cacheKey, forceRefresh = false) {
    // Check cache
    const contentHash = hashContent(prompt);
    if (!forceRefresh) {
        const cached = await getCachedAIResult(contentHash, cacheKey);
        if (cached) return cached;
    }

    const config = get(settings);
    const provider = config.aiProvider || 'chrome';
    let result = '';

    console.log(`Generating content with provider: ${provider}`);

    try {
        switch (provider) {
            case 'local':
                result = await generateWithLocalAI(prompt, systemPrompt, config);
                break;
            case 'openai':
                result = await generateWithOpenAI(prompt, systemPrompt, config);
                break;
            case 'anthropic':
                result = await generateWithAnthropic(prompt, systemPrompt, config);
                break;
            case 'gemini':
                // Use key from settings if available, otherwise fallback to passed key (not passed here yet)
                // We'll update summarizeWithGemini to take key from settings
                const key = config.geminiKey;
                if (!key) throw new Error('Gemini API Key is missing in settings');
                const model = config.geminiModel || 'gemini-1.5-flash';
                result = await summarizeWithGemini(prompt, key, model);
                break;
            case 'chrome':
            default:
                // Chrome AI Logic
                const chromeAvailable = await isChromeAIAvailable();
                if (!chromeAvailable) throw new Error('Chrome AI is not available');

                const session = await LanguageModel.create({
                    initialPrompts: systemPrompt ? [{ role: 'system', content: systemPrompt }] : [],
                });
                result = await session.prompt(prompt);
                session.destroy();
                break;
        }

        await setCachedAIResult(contentHash, cacheKey, result);
        return result;

    } catch (e) {
        console.error(`AI Generation failed with ${provider}:`, e);
        throw e;
    }
}

export async function generateScript(articles, apiKey = null, forceRefresh = false) {
    const combinedText = articles.map(a => `Title: ${a.title}\nContent: ${a.description}`).join('\n\n');
    const prompt = `Create a YouTube video script covering these stories in Markdown format. Include an engaging hook, transition between topics, and a call to action.\n\n${combinedText}`;

    return generateContent(
        prompt,
        'You are a creative scriptwriter for a tech news YouTube channel.',
        'script',
        forceRefresh
    );
}

export async function generatePodcastScript(articles, apiKey = null, forceRefresh = false) {
    const combinedText = articles.map(a => `Title: ${a.title}\nContent: ${a.description}`).join('\n\n');
    const prompt = `Create a podcast script for two hosts (Alex and Sam) discussing these news stories. Include engaging banter, an intro with music cue, smooth transitions between topics, and an outro. Format in Markdown with **Host:** prefixes.\n\n${combinedText}`;

    return generateContent(
        prompt,
        'You are a creative podcast producer writing a script for two engaging hosts.',
        'podcast',
        forceRefresh
    );
}

export async function deepDive(articles, apiKey = null, forceRefresh = false) {
    const combinedText = articles.map(a => `Title: ${a.title}\nContent: ${a.description}`).join('\n\n');
    const prompt = `Analyze these articles in Markdown format. Identify common themes, contradictions, and causal relationships.\n\n${combinedText}`;

    return generateContent(
        prompt,
        'You are an expert news analyst.',
        'deepdive',
        forceRefresh
    );
}

export async function checkBias(text, apiKey = null, forceRefresh = false) {
    const prompt = `Analyze this text for potential bias, emotional language, and framing. Rate the objectivity on a scale of 1-10 and explain why. Format the response in Markdown.\n\n${text}`;

    return generateContent(
        prompt,
        'You are an objective media analyst.',
        'bias',
        forceRefresh
    );
}

export async function translate(text, targetLangCode, apiKey = null, forceRefresh = false) {
    // Convert language code to full name (e.g., 'fr' -> 'French')
    const targetLanguage = getLanguageName(targetLangCode);
    const prompt = `Translate the following text to ${targetLanguage}. Maintain the original tone and formatting. Return ONLY the translated text.\n\n${text}`;

    return generateContent(
        prompt,
        `You are a professional translator. Translate text to ${targetLanguage}.`,
        'translate',
        forceRefresh
    );
}
