/**
 * Browser-based Whisper Speech-to-Text using @xenova/transformers
 * Runs entirely client-side with no API costs
 */

// Dynamic import to avoid SSR issues
let pipelinePromise: Promise<any> | null = null;

async function getPipeline() {
    if (typeof window === 'undefined') {
        throw new Error('Whisper client can only be used in browser environment');
    }

    if (!pipelinePromise) {
        pipelinePromise = import('@xenova/transformers').then(mod => {
            mod.env.allowLocalModels = false;
            mod.env.useBrowserCache = false;
            return mod.pipeline;
        });
    }

    return pipelinePromise;
}

type Pipeline = any; // Will be properly typed when loaded

export type WhisperModel = 'whisper-tiny' | 'whisper-base';

export interface TranscriptionOptions {
    language?: string;
    task?: 'transcribe' | 'translate';
    chunk_length_s?: number;
    stride_length_s?: number;
}

export interface TranscriptionResult {
    text: string;
    chunks?: Array<{
        text: string;
        timestamp: [number, number];
    }>;
}

class WhisperClient {
    private pipeline: Pipeline | null = null;
    private modelName: WhisperModel = 'whisper-tiny';
    private isLoading = false;
    private loadProgress = 0;

    /**
     * Load the Whisper model
     * @param modelName - 'whisper-tiny' (~40MB, faster) or 'whisper-base' (~74MB, more accurate)
     */
    async loadModel(
        modelName: WhisperModel = 'whisper-tiny',
        onProgress?: (progress: number) => void
    ): Promise<void> {
        if (this.pipeline && this.modelName === modelName) {
            return; // Already loaded
        }

        this.isLoading = true;
        this.modelName = modelName;

        try {
            const pipelineFn = await getPipeline();
            this.pipeline = await pipelineFn('automatic-speech-recognition', `Xenova/${modelName}`, {
                progress_callback: (progress: any) => {
                    if (progress.status === 'progress') {
                        const percent = Math.round((progress.loaded / progress.total) * 100);
                        this.loadProgress = percent;
                        onProgress?.(percent);
                    }
                },
            });
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Transcribe an audio blob to text
     * @param audioBlob - Audio blob (webm, wav, mp3, etc.)
     * @param options - Transcription options
     */
    async transcribe(
        audioBlob: Blob,
        options: TranscriptionOptions = {}
    ): Promise<TranscriptionResult> {
        if (!this.pipeline) {
            throw new Error('Whisper model not loaded. Call loadModel() first.');
        }

        // Convert blob to ArrayBuffer
        const arrayBuffer = await audioBlob.arrayBuffer();

        // Transcribe
        const result = await this.pipeline(arrayBuffer, {
            language: options.language,
            task: options.task || 'transcribe',
            chunk_length_s: options.chunk_length_s || 30,
            stride_length_s: options.stride_length_s || 5,
            return_timestamps: true,
        });

        return {
            text: result.text.trim(),
            chunks: result.chunks,
        };
    }

    /**
     * Transcribe audio with streaming updates
     * Useful for real-time transcription display
     */
    async *transcribeStream(
        audioBlob: Blob,
        options: TranscriptionOptions = {}
    ): AsyncGenerator<string> {
        if (!this.pipeline) {
            throw new Error('Whisper model not loaded. Call loadModel() first.');
        }

        const arrayBuffer = await audioBlob.arrayBuffer();

        const result = await this.pipeline(arrayBuffer, {
            language: options.language,
            task: options.task || 'transcribe',
            chunk_length_s: options.chunk_length_s || 30,
            stride_length_s: options.stride_length_s || 5,
            return_timestamps: true,
        });

        // Yield chunks as they become available
        if (result.chunks) {
            for (const chunk of result.chunks) {
                yield chunk.text;
            }
        } else {
            yield result.text;
        }
    }

    /**
     * Check if model is currently loading
     */
    get loading(): boolean {
        return this.isLoading;
    }

    /**
     * Get current load progress (0-100)
     */
    get progress(): number {
        return this.loadProgress;
    }

    /**
     * Check if model is ready
     */
    get ready(): boolean {
        return this.pipeline !== null && !this.isLoading;
    }

    /**
     * Unload the model to free memory
     */
    async unload(): Promise<void> {
        this.pipeline = null;
        this.loadProgress = 0;
    }
}

// Singleton instance
let whisperInstance: WhisperClient | null = null;

/**
 * Get the singleton Whisper client instance
 */
export function getWhisperClient(): WhisperClient {
    if (!whisperInstance) {
        whisperInstance = new WhisperClient();
    }
    return whisperInstance;
}

export default WhisperClient;
