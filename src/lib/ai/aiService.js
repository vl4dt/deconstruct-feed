
import { getCachedAIResult, setCachedAIResult, hashContent } from '../cache/aiCache';
import { getLanguageName } from '../i18n/languageMap';
import { get } from 'svelte/store';
import { settings } from '../stores/settings';
import { userSubscription } from '../stores/subscription';

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

// Helper function to get prompts (custom if Pro, default otherwise)
function getPrompts(operation) {
    const config = get(settings);
    const subscription = get(userSubscription);

    // Use custom prompts if user is Pro and custom prompts exist
    if (subscription.isPro && config.customPrompts && config.customPrompts[operation]) {
        return config.customPrompts[operation];
    }

    // Default prompts (fallback for free users or if custom prompts not set)
    const defaults = {
        summarize: {
            system: 'You are a helpful news assistant. Summarize the following article concisely in Markdown format.',
            user: 'Summarize this news article in Markdown format:\n\n{content}'
        },
        script: {
            system: 'You are a creative scriptwriter for a tech news YouTube channel.',
            user: 'Create a YouTube video script covering these stories in Markdown format. Include an engaging hook, transition between topics, and a call to action.\n\n{articles}'
        },
        podcast: {
            system: 'You are a creative podcast producer writing a script for two engaging hosts.',
            user: 'Create a podcast script for two hosts (Alex and Sam) discussing these news stories. Include engaging banter, an intro with music cue, smooth transitions between topics, and an outro. Format in Markdown with **Host:** prefixes.\n\n{articles}'
        },
        deepDive: {
            system: 'You are an expert news analyst.',
            user: 'Analyze these articles in Markdown format. Identify common themes, contradictions, and causal relationships.\n\n{articles}'
        },
        bias: {
            system: 'You are an objective media analyst.',
            user: 'Analyze this text for potential bias, emotional language, and framing. Rate the objectivity on a scale of 1-10 and explain why. Format the response in Markdown.\n\n{content}'
        }
    };

    return defaults[operation];
}

export async function summarize(text, apiKey = null, forceRefresh = false) {
    const prompts = getPrompts('summarize');
    const userPrompt = prompts.user.replace('{content}', text);

    return generateContent(
        userPrompt,
        prompts.system,
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

    let response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: model,
            messages: messages,
            stream: false
        })
    });

    // Fallback for 404 (OpenAI endpoint not found -> try native Ollama)
    if (response.status === 404 && url.includes('/v1/chat/completions')) {
        console.log('OpenAI endpoint not found, trying native Ollama endpoint...');
        const fallbackUrl = url.replace('/v1/chat/completions', '/api/chat');
        response = await fetch(fallbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: false
            })
        });
    }

    if (!response.ok) {
        if (response.status === 403) {
            throw new Error('Ollama connection forbidden. Please set OLLAMA_ORIGINS="*" environment variable. See docs.');
        }
        throw new Error(`Local AI Error: ${response.statusText}`);
    }

    const data = await response.json();

    // Handle OpenAI format
    if (data.choices && data.choices.length > 0) {
        return data.choices[0].message.content;
    }
    // Handle Native Ollama format
    if (data.message && data.message.content) {
        return data.message.content;
    }

    throw new Error('Unexpected response format from Local AI');
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
    const prompts = getPrompts('script');
    const combinedText = articles.map(a => `Title: ${a.title}\nContent: ${a.description}`).join('\n\n');
    const userPrompt = prompts.user.replace('{articles}', combinedText);

    return generateContent(
        userPrompt,
        prompts.system,
        'script',
        forceRefresh
    );
}

export async function generatePodcastScript(articles, apiKey = null, forceRefresh = false) {
    const prompts = getPrompts('podcast');
    const combinedText = articles.map(a => `Title: ${a.title}\nContent: ${a.description}`).join('\n\n');
    const userPrompt = prompts.user.replace('{articles}', combinedText);

    return generateContent(
        userPrompt,
        prompts.system,
        'podcast',
        forceRefresh
    );
}

export async function deepDive(articles, apiKey = null, forceRefresh = false) {
    const prompts = getPrompts('deepDive');
    const combinedText = articles.map(a => `Title: ${a.title}\nContent: ${a.description}`).join('\n\n');
    const userPrompt = prompts.user.replace('{articles}', combinedText);

    return generateContent(
        userPrompt,
        prompts.system,
        'deepdive',
        forceRefresh
    );
}

export async function checkBias(text, apiKey = null, forceRefresh = false) {
    const prompts = getPrompts('bias');
    const userPrompt = prompts.user.replace('{content}', text);

    return generateContent(
        userPrompt,
        prompts.system,
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
