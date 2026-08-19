let activeUtterance: SpeechSynthesisUtterance | null = null;
let keepAliveTimer: any = null;

/**
 * Returns available voices from SpeechSynthesis, handling asynchronous loading.
 */
export const getAvailableVoices = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      resolve(voices);
      return;
    }

    const onVoicesChanged = () => {
      const v = window.speechSynthesis.getVoices();
      if (window.speechSynthesis.removeEventListener) {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      }
      resolve(v || []);
    };

    window.speechSynthesis.onvoiceschanged = onVoicesChanged;

    // Safety timeout in case onvoiceschanged does not fire
    setTimeout(() => {
      resolve(window.speechSynthesis.getVoices() || []);
    }, 200);
  });
};

// Pre-load voices on module load
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
}

/**
 * Speaks text using window.speechSynthesis.
 * Automatically resolves the best matching voice with graceful local fallback and synthesis-failed recovery.
 */
export const speakText = (
  text: string, 
  onStart?: () => void, 
  onEnd?: () => void,
  isRetry: boolean = false
) => {
  if (!text || !text.trim()) {
    if (onEnd) onEnd();
    return;
  }

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn("TTS: SpeechSynthesis is not supported in this browser.");
    if (onEnd) onEnd();
    return;
  }

  // Stop previous speech
  stopSpeaking();

  // Clean up text: replace arrows, symbols, redundant spaces
  const cleanText = text
    .replace(/->|→/g, ', далі, ')
    .replace(/[«»"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const savedSpeed = localStorage.getItem('accessibility-tts-speed');
    const speed = savedSpeed ? parseFloat(savedSpeed) : 1.0;
    const preferredVoiceURI = localStorage.getItem('accessibility-tts-voice-uri');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = Math.max(0.5, Math.min(2.0, speed));
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices() || [];
    let selectedVoice: SpeechSynthesisVoice | null = null;

    if (!isRetry && preferredVoiceURI) {
      selectedVoice = voices.find(v => v.voiceURI === preferredVoiceURI) || null;
    }

    if (!selectedVoice && !isRetry) {
      // 1. Try finding Ukrainian voice
      selectedVoice = voices.find(v => 
        (v.lang && (v.lang.toLowerCase() === 'uk-ua' || v.lang.toLowerCase() === 'uk_ua' || v.lang.toLowerCase().startsWith('uk'))) ||
        (v.name && (v.name.toLowerCase().includes('ukrain') || v.name.toLowerCase().includes('україн') || v.name.toLowerCase().includes('ukr')))
      ) || null;
    }

    // 2. If no Ukrainian voice, or during retry after synthesis-failed, use local default voice
    if (!selectedVoice && voices.length > 0) {
      selectedVoice = voices.find(v => v.default) || voices.find(v => v.localService) || voices[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang || 'uk-UA';
    } else {
      utterance.lang = 'uk-UA';
    }

    const cleanup = () => {
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
      if (activeUtterance === utterance) {
        activeUtterance = null;
      }
    };

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      cleanup();
      if (onEnd) onEnd();
    };

    utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
      cleanup();
      if (event.error === 'canceled' || event.error === 'interrupted') {
        if (onEnd) onEnd();
        return;
      }

      // If online synthesis failed (common when cloud voice fails in Chromium), retry once with local voice
      if (event.error === 'synthesis-failed' && !isRetry && voices.length > 0) {
        console.warn("TTS: Primary voice failed, falling back to local system voice...");
        speakText(text, onStart, onEnd, true);
        return;
      }

      console.warn("TTS: SpeechSynthesis error:", event.error);
      if (onEnd) onEnd();
    };

    activeUtterance = utterance;

    // Chrome 15-second utterance pause workaround (keep alive)
    keepAliveTimer = setInterval(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (!window.speechSynthesis.speaking) {
          if (keepAliveTimer) {
            clearInterval(keepAliveTimer);
            keepAliveTimer = null;
          }
        } else {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }
    }, 10000);

    setTimeout(() => {
      if (activeUtterance === utterance && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.speak(utterance);
      }
    }, 60);

  } catch (err) {
    console.error("TTS: SpeechSynthesis execution error:", err);
    if (onEnd) onEnd();
  }
};

/**
 * Stops any active speech synthesis immediately.
 */
export const stopSpeaking = () => {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    if (activeUtterance) {
      activeUtterance.onstart = null;
      activeUtterance.onend = null;
      activeUtterance.onerror = null;
    }
    window.speechSynthesis.cancel();
  }
  activeUtterance = null;
};

/**
 * Checks if the speech synthesis is currently speaking.
 */
export const isSpeakingActive = (): boolean => {
  return typeof window !== 'undefined' && ('speechSynthesis' in window) && Boolean(window.speechSynthesis.speaking);
};


