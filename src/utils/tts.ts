let activeUtterance: SpeechSynthesisUtterance | null = null;
let keepAliveTimer: any = null;

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
 * Speaks text using window.speechSynthesis in Ukrainian language.
 * Features rate customization, automatic voice detection, cancellation safety, and Chrome keep-alive.
 */
export const speakText = (
  text: string, 
  onStart?: () => void, 
  onEnd?: () => void
) => {
  if (!text || !text.trim()) {
    if (onEnd) onEnd();
    return;
  }

  // If SpeechSynthesis is not supported in browser
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn("TTS: SpeechSynthesis is not supported in this browser.");
    if (onEnd) onEnd();
    return;
  }

  // Stop any active speech and clear previous callbacks
  stopSpeaking();

  // Clean up text format: replace symbols, arrows, collapse spaces
  const cleanText = text
    .replace(/->|→/g, ', далі, ')
    .replace(/[«»"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  try {
    // Unpause if speech synthesis is in a paused state (Chromium bug workaround)
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const savedSpeed = localStorage.getItem('accessibility-tts-speed');
    const speed = savedSpeed ? parseFloat(savedSpeed) : 1.0;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = Math.max(0.5, Math.min(2.0, speed));
    utterance.pitch = 1.0;
    utterance.lang = 'uk-UA';

    // Pick best available voice (Ukrainian preferred)
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const ukVoice = voices.find(v => 
        (v.lang && (v.lang.toLowerCase().startsWith('uk') || v.lang.toLowerCase().includes('ukr'))) ||
        (v.name && (v.name.toLowerCase().includes('ukrain') || v.name.toLowerCase().includes('україн')))
      );
      if (ukVoice) {
        utterance.voice = ukVoice;
        utterance.lang = ukVoice.lang;
      }
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
      // 'canceled' and 'interrupted' are expected when user stops speech or navigates
      if (event.error === 'canceled' || event.error === 'interrupted') {
        if (onEnd) onEnd();
        return;
      }
      console.warn("TTS: SpeechSynthesis event error:", event.error);
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

    // Brief timeout prevents immediate cancellation bug in Chromium
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


