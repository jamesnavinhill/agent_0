/**
 * React hook for Text-to-Speech functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getTTSClient, TTSOptions } from '@/lib/voice/tts-client';
import type TTSClient from '@/lib/voice/tts-client';

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

    const ttsClientRef = useRef<TTSClient | null>(null);
    const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);

    // Initialize client on mount (client-side only)
    useEffect(() => {
        const client = getTTSClient();
        if (!client) return;

        ttsClientRef.current = client;

        // Initial load
        const loadedVoices = client.getVoices();
        setVoices(loadedVoices);
        setReady(client.ready);

        // Set default voice (prefer English)
        if (loadedVoices.length > 0) {
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
            if (client) {
                setIsSpeaking(client.isSpeaking);
                setIsPaused(client.isPaused);
            }
        }, 100);

        return () => {
            if (statusCheckInterval.current) {
                clearInterval(statusCheckInterval.current);
            }
        };
    }, []);

    const speak = useCallback((text: string, options: TTSOptions = {}) => {
        const client = ttsClientRef.current;
        if (!client) return;

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
        const client = ttsClientRef.current;
        if (client) {
            client.stop();
        }
        setIsSpeaking(false);
        setIsPaused(false);
    }, []);

    const pause = useCallback(() => {
        const client = ttsClientRef.current;
        if (client) {
            client.pause();
        }
        setIsPaused(true);
    }, []);

    const resume = useCallback(() => {
        const client = ttsClientRef.current;
        if (client) {
            client.resume();
        }
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

