
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
    const chromeAvailable = await isChromeAIAvailable();

    if (chromeAvailable) {
        try {
            console.log('Attempting to summarize with Chrome AI...');
            // Create a session with a system prompt if supported, or just prompt
            const session = await LanguageModel.create({
                initialPrompts: [{
                    role: 'system',
                    content: 'You are a helpful news assistant. Summarize the following article concisely.',
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
            return result;
        } catch (e) {
            console.warn('Chrome AI failed, falling back to Gemini if key provided', e);
        }
    } else {
        console.log('Chrome AI not available, skipping local generation.');
    }

    if (apiKey) {
        console.log('Attempting to summarize with Gemini...');
        return summarizeWithGemini(text, apiKey);
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
                parts: [{ text: `Summarize this news article:\n\n${text}` }]
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
