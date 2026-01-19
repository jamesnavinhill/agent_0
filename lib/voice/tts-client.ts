/**
 * Browser-based Text-to-Speech using Web Speech API
 * Free, built into all modern browsers
 */

export interface TTSOptions {
    rate?: number; // 0.1 to 10, default 1
    pitch?: number; // 0 to 2, default 1
    volume?: number; // 0 to 1, default 1
    voice?: SpeechSynthesisVoice;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
}

class TTSClient {
    private synthesis: SpeechSynthesis;
    private currentUtterance: SpeechSynthesisUtterance | null = null;
    private voices: SpeechSynthesisVoice[] = [];
    private voicesLoaded = false;

    constructor() {
        if (typeof window === 'undefined') {
            throw new Error('TTSClient can only be used in browser environment');
        }

        this.synthesis = window.speechSynthesis;
        this.loadVoices();

        // Voices may load asynchronously
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => {
                this.loadVoices();
            };
        }
    }

    private loadVoices(): void {
        this.voices = this.synthesis.getVoices();
        this.voicesLoaded = this.voices.length > 0;
    }

    /**
     * Get all available voices
     */
    getVoices(): SpeechSynthesisVoice[] {
        if (!this.voicesLoaded) {
            this.loadVoices();
        }
        return this.voices;
    }

    /**
     * Get voices filtered by language
     * @param lang - Language code (e.g., 'en-US', 'en-GB')
     */
    getVoicesByLanguage(lang: string): SpeechSynthesisVoice[] {
        return this.getVoices().filter(voice => voice.lang.startsWith(lang));
    }

    /**
     * Get the default voice for a language
     */
    getDefaultVoice(lang: string = 'en'): SpeechSynthesisVoice | undefined {
        const voices = this.getVoicesByLanguage(lang);
        return voices.find(voice => voice.default) || voices[0];
    }

    /**
     * Speak text with optional configuration
     * @param text - Text to speak
     * @param options - Speech options
     */
    speak(text: string, options: TTSOptions = {}): void {
        // Stop any ongoing speech
        this.stop();

        const utterance = new SpeechSynthesisUtterance(text);

        // Apply options
        utterance.rate = options.rate ?? 1;
        utterance.pitch = options.pitch ?? 1;
        utterance.volume = options.volume ?? 1;

        if (options.voice) {
            utterance.voice = options.voice;
        } else {
            // Use default English voice
            const defaultVoice = this.getDefaultVoice('en');
            if (defaultVoice) {
                utterance.voice = defaultVoice;
            }
        }

        // Event handlers
        utterance.onstart = () => {
            options.onStart?.();
        };

        utterance.onend = () => {
            this.currentUtterance = null;
            options.onEnd?.();
        };

        utterance.onerror = (event) => {
            this.currentUtterance = null;
            options.onError?.(new Error(event.error));
        };

        this.currentUtterance = utterance;
        this.synthesis.speak(utterance);
    }

    /**
     * Stop current speech
     */
    stop(): void {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
        }
        this.currentUtterance = null;
    }

    /**
     * Pause current speech
     */
    pause(): void {
        if (this.synthesis.speaking && !this.synthesis.paused) {
            this.synthesis.pause();
        }
    }

    /**
     * Resume paused speech
     */
    resume(): void {
        if (this.synthesis.paused) {
            this.synthesis.resume();
        }
    }

    /**
     * Check if currently speaking
     */
    get isSpeaking(): boolean {
        return this.synthesis.speaking;
    }

    /**
     * Check if currently paused
     */
    get isPaused(): boolean {
        return this.synthesis.paused;
    }

    /**
     * Check if voices are loaded
     */
    get ready(): boolean {
        return this.voicesLoaded;
    }
}

// Singleton instance
let ttsInstance: TTSClient | null = null;

/**
 * Get the singleton TTS client instance
 */
export function getTTSClient(): TTSClient {
    if (!ttsInstance) {
        ttsInstance = new TTSClient();
    }
    return ttsInstance;
}

export default TTSClient;
