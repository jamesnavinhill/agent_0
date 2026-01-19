/**
 * React hook for Text-to-Speech functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getTTSClient, TTSOptions } from '@/lib/voice/tts-client';

export interface UseTTSReturn {
    speak: (text: string, options?: TTSOptions) => void;
    stop: () => void;
    pause: () => void;
    resume: () => void;
    isSpeaking: boolean;
    isPaused: boolean;
    voices: SpeechSynthesisVoice[];
    selectedVoice: SpeechSynthesisVoice | null;
    setVoice: (voice: SpeechSynthesisVoice) => void;
    ready: boolean;
}

export function useTTS(): UseTTSReturn {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
    const [ready, setReady] = useState(false);

    const ttsClientRef = useRef(getTTSClient());
    const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);

    // Load voices on mount
    useEffect(() => {
        const client = ttsClientRef.current;

        // Initial load
        const loadedVoices = client.getVoices();
        setVoices(loadedVoices);
        setReady(client.ready);

        // Set default voice (prefer English)
        if (loadedVoices.length > 0 && !selectedVoice) {
            const defaultVoice = client.getDefaultVoice('en');
            setSelectedVoice(defaultVoice || loadedVoices[0]);
        }

        // Poll for voices if not loaded yet
        const checkVoices = setInterval(() => {
            const currentVoices = client.getVoices();
            if (currentVoices.length > 0) {
                setVoices(currentVoices);
                setReady(true);
                if (!selectedVoice) {
                    const defaultVoice = client.getDefaultVoice('en');
                    setSelectedVoice(defaultVoice || currentVoices[0]);
                }
                clearInterval(checkVoices);
            }
        }, 100);

        return () => {
            clearInterval(checkVoices);
            if (statusCheckInterval.current) {
                clearInterval(statusCheckInterval.current);
            }
        };
    }, []);

    // Poll speaking status
    useEffect(() => {
        statusCheckInterval.current = setInterval(() => {
            const client = ttsClientRef.current;
            setIsSpeaking(client.isSpeaking);
            setIsPaused(client.isPaused);
        }, 100);

        return () => {
            if (statusCheckInterval.current) {
                clearInterval(statusCheckInterval.current);
            }
        };
    }, []);

    const speak = useCallback((text: string, options: TTSOptions = {}) => {
        const client = ttsClientRef.current;

        const mergedOptions: TTSOptions = {
            ...options,
            voice: options.voice || selectedVoice || undefined,
            onStart: () => {
                setIsSpeaking(true);
                setIsPaused(false);
                options.onStart?.();
            },
            onEnd: () => {
                setIsSpeaking(false);
                setIsPaused(false);
                options.onEnd?.();
            },
            onError: (error) => {
                setIsSpeaking(false);
                setIsPaused(false);
                options.onError?.(error);
            },
        };

        client.speak(text, mergedOptions);
    }, [selectedVoice]);

    const stop = useCallback(() => {
        ttsClientRef.current.stop();
        setIsSpeaking(false);
        setIsPaused(false);
    }, []);

    const pause = useCallback(() => {
        ttsClientRef.current.pause();
        setIsPaused(true);
    }, []);

    const resume = useCallback(() => {
        ttsClientRef.current.resume();
        setIsPaused(false);
    }, []);

    const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
        setSelectedVoice(voice);
    }, []);

    return {
        speak,
        stop,
        pause,
        resume,
        isSpeaking,
        isPaused,
        voices,
        selectedVoice,
        setVoice,
        ready,
    };
}
