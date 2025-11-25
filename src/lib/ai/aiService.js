
import { getCachedAIResult, setCachedAIResult, hashContent } from '../cache/aiCache';
import { getLanguageName } from '../i18n/languageMap';

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

export async function summarize(text, apiKey = null) {
    // Check cache first
    const contentHash = hashContent(text);
    const cached = await getCachedAIResult(contentHash, 'summary');
    if (cached) {
        return cached;
    }

    const chromeAvailable = await isChromeAIAvailable();

    if (chromeAvailable) {
        try {
            console.log('Attempting to summarize with Chrome AI...');
            // Create a session with a system prompt if supported, or just prompt
            const session = await LanguageModel.create({
                initialPrompts: [{
                    role: 'system',
                    content: 'You are a helpful news assistant. Summarize the following article concisely in Markdown format.',
                }],
                expectedInputs: [
                    { type: "text", languages: ["en"] }
                ],
                expectedOutputs: [
                    { type: "text", languages: ["en"] }
                ]
            });
            const result = await session.prompt(text);
            session.destroy();

            // Cache the result
            await setCachedAIResult(contentHash, 'summary', result);
            return result;
        } catch (e) {
            console.warn('Chrome AI failed, falling back to Gemini if key provided', e);
        }
    } else {
        console.log('Chrome AI not available, skipping local generation.');
    }

    if (apiKey) {
        console.log('Attempting to summarize with Gemini...');
        const result = await summarizeWithGemini(text, apiKey);
        // Cache the result
        await setCachedAIResult(contentHash, 'summary', result);
        return result;
    }

    throw new Error(chromeAvailable ? 'Chrome AI failed and no API key provided' : 'Chrome AI unavailable and no API key provided');
}

async function summarizeWithGemini(text, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
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

export async function generateScript(articles, apiKey = null) {
    const combinedText = articles.map(a => `Title: ${a.title}\nContent: ${a.description}`).join('\n\n');
    const prompt = `Create a YouTube video script covering these stories in Markdown format. Include an engaging hook, transition between topics, and a call to action.\n\n${combinedText}`;

    // Check cache
    const contentHash = hashContent(prompt);
    const cached = await getCachedAIResult(contentHash, 'script');
    if (cached) {
        return cached;
    }

    const chromeAvailable = await isChromeAIAvailable();

    if (chromeAvailable) {
        try {
            console.log('Attempting to generate script with Chrome AI...');
            const session = await LanguageModel.create({
                initialPrompts: [{
                    role: 'system',
                    content: 'You are a creative scriptwriter for a tech news YouTube channel.',
                }],
                expectedInputs: [
                    { type: "text", languages: ["en"] }
                ],
                expectedOutputs: [
                    { type: "text", languages: ["en"] }
                ]
            });
            const result = await session.prompt(prompt);
            session.destroy();

            // Cache the result
            await setCachedAIResult(contentHash, 'script', result);
            return result;
        } catch (e) {
            console.warn('Chrome AI failed, falling back to Gemini if key provided', e);
        }
    }

    if (apiKey) {
        console.log('Attempting to generate script with Gemini...');
        const result = await summarizeWithGemini(prompt, apiKey); // Reusing summarizeWithGemini as it's just a generic prompt function
        // Cache the result
        await setCachedAIResult(contentHash, 'script', result);
        return result;
    }

    throw new Error(chromeAvailable ? 'Chrome AI failed and no API key provided' : 'Chrome AI unavailable and no API key provided');
}

export async function generatePodcastScript(articles, apiKey = null) {
    const combinedText = articles.map(a => `Title: ${a.title}\nContent: ${a.description}`).join('\n\n');
    const prompt = `Create a podcast script for two hosts (Alex and Sam) discussing these news stories. Include engaging banter, an intro with music cue, smooth transitions between topics, and an outro. Format in Markdown with **Host:** prefixes.\n\n${combinedText}`;

    // Check cache
    const contentHash = hashContent(prompt);
    const cached = await getCachedAIResult(contentHash, 'podcast');
    if (cached) {
        return cached;
    }

    const chromeAvailable = await isChromeAIAvailable();

    if (chromeAvailable) {
        try {
            console.log('Attempting to generate podcast script with Chrome AI...');
            const session = await LanguageModel.create({
                initialPrompts: [{
                    role: 'system',
                    content: 'You are a creative podcast producer writing a script for two engaging hosts.',
                }],
                expectedInputs: [
                    { type: "text", languages: ["en"] }
                ],
                expectedOutputs: [
                    { type: "text", languages: ["en"] }
                ]
            });
            const result = await session.prompt(prompt);
            session.destroy();

            // Cache the result
            await setCachedAIResult(contentHash, 'podcast', result);
            return result;
        } catch (e) {
            console.warn('Chrome AI failed, falling back to Gemini if key provided', e);
        }
    }

    if (apiKey) {
        console.log('Attempting to generate podcast script with Gemini...');
        const result = await summarizeWithGemini(prompt, apiKey);
        // Cache the result
        await setCachedAIResult(contentHash, 'podcast', result);
        return result;
    }

    throw new Error(chromeAvailable ? 'Chrome AI failed and no API key provided' : 'Chrome AI unavailable and no API key provided');
}

export async function deepDive(articles, apiKey = null) {
    const combinedText = articles.map(a => `Title: ${a.title}\nContent: ${a.description}`).join('\n\n');
    const prompt = `Analyze these articles in Markdown format. Identify common themes, contradictions, and causal relationships.\n\n${combinedText}`;

    // Check cache
    const contentHash = hashContent(prompt);
    const cached = await getCachedAIResult(contentHash, 'deepdive');
    if (cached) {
        return cached;
    }

    const chromeAvailable = await isChromeAIAvailable();

    if (chromeAvailable) {
        try {
            console.log('Attempting to deep dive with Chrome AI...');
            const session = await LanguageModel.create({
                initialPrompts: [{
                    role: 'system',
                    content: 'You are an expert news analyst.',
                }],
                expectedInputs: [
                    { type: "text", languages: ["en"] }
                ],
                expectedOutputs: [
                    { type: "text", languages: ["en"] }
                ]
            });
            const result = await session.prompt(prompt);
            session.destroy();

            // Cache the result
            await setCachedAIResult(contentHash, 'deepdive', result);
            return result;
        } catch (e) {
            console.warn('Chrome AI failed, falling back to Gemini if key provided', e);
        }
    }

    if (apiKey) {
        console.log('Attempting to deep dive with Gemini...');
        const result = await summarizeWithGemini(prompt, apiKey);
        // Cache the result
        await setCachedAIResult(contentHash, 'deepdive', result);
        return result;
    }

    throw new Error(chromeAvailable ? 'Chrome AI failed and no API key provided' : 'Chrome AI unavailable and no API key provided');
}

export async function checkBias(text, apiKey = null) {
    const prompt = `Analyze this text for potential bias, emotional language, and framing. Rate the objectivity on a scale of 1-10 and explain why. Format the response in Markdown.\n\n${text}`;

    // Check cache
    const contentHash = hashContent(text);
    const cached = await getCachedAIResult(contentHash, 'bias');
    if (cached) {
        return cached;
    }

    const chromeAvailable = await isChromeAIAvailable();

    if (chromeAvailable) {
        try {
            console.log('Attempting to check bias with Chrome AI...');
            const session = await LanguageModel.create({
                initialPrompts: [{
                    role: 'system',
                    content: 'You are an objective media analyst.',
                }],
                expectedInputs: [
                    { type: "text", languages: ["en"] }
                ],
                expectedOutputs: [
                    { type: "text", languages: ["en"] }
                ]
            });
            const result = await session.prompt(prompt);
            session.destroy();

            // Cache the result
            await setCachedAIResult(contentHash, 'bias', result);
            return result;
        } catch (e) {
            console.warn('Chrome AI failed, falling back to Gemini if key provided', e);
        }
    }

    if (apiKey) {
        console.log('Attempting to check bias with Gemini...');
        const result = await summarizeWithGemini(prompt, apiKey);
        // Cache the result
        await setCachedAIResult(contentHash, 'bias', result);
        return result;
    }

    throw new Error(chromeAvailable ? 'Chrome AI failed and no API key provided' : 'Chrome AI unavailable and no API key provided');
}

export async function translate(text, targetLangCode, apiKey = null) {
    // Convert language code to full name (e.g., 'fr' -> 'French')
    const targetLanguage = getLanguageName(targetLangCode);
    const prompt = `Translate the following text to ${targetLanguage}. Maintain the original tone and formatting. Return ONLY the translated text.\n\n${text}`;

    // Check cache
    const contentHash = hashContent(prompt);
    const cached = await getCachedAIResult(contentHash, 'translate');
    if (cached) {
        return cached;
    }

    const chromeAvailable = await isChromeAIAvailable();

    if (chromeAvailable) {
        try {
            console.log(`Attempting to translate to ${targetLanguage} with Chrome AI...`);
            const session = await LanguageModel.create({
                initialPrompts: [{
                    role: 'system',
                    content: `You are a professional translator. Translate text to ${targetLanguage}.`,
                }],
                expectedInputs: [
                    { type: "text", languages: ["en"] }
                ],
                expectedOutputs: [
                    { type: "text", languages: ["en"] } // Chrome AI currently mostly supports EN I/O, but can generate other langs
                ]
            });
            const result = await session.prompt(prompt);
            session.destroy();

            // Cache the result
            await setCachedAIResult(contentHash, 'translate', result);
            return result;
        } catch (e) {
            console.warn('Chrome AI failed, falling back to Gemini if key provided', e);
        }
    }

    if (apiKey) {
        console.log(`Attempting to translate to ${targetLanguage} with Gemini...`);
        const result = await summarizeWithGemini(prompt, apiKey);
        // Cache the result
        await setCachedAIResult(contentHash, 'translate', result);
        return result;
    }

    throw new Error(chromeAvailable ? 'Chrome AI failed and no API key provided' : 'Chrome AI unavailable and no API key provided');
}
