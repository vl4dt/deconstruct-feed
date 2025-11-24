
interface LanguageModel {
    prompt(text: string): Promise<string>;
    promptStreaming(text: string): ReadableStream;
    countPromptTokens(text: string): Promise<number>;
    maxTokens: number;
    tokensSoFar: number;
    tokensLeft: number;
    topK: number;
    temperature: number;
    destroy(): void;
}

interface LanguageModelCreateOptions {
    monitor?: (monitor: any) => void;
    initialPrompts?: { role: string; content: string }[];
    expectedInputs?: { type: string; languages: string[] }[];
    expectedOutputs?: { type: string; languages: string[] }[];
}

interface LanguageModelFactory {
    create(options?: LanguageModelCreateOptions): Promise<LanguageModel>;
    capabilities(): Promise<any>;
    availability(): Promise<'available' | 'no-gpu' | 'readily' | 'after-download'>;
    params(): Promise<any>;
}

interface Window {
    ai: {
        languageModel: LanguageModelFactory;
    };
}

declare var LanguageModel: LanguageModelFactory;
