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
export const speakText = async (
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

    // Await available voices so we never query an uninitialized voice list
    const voices = await getAvailableVoices();

    const savedSpeed = localStorage.getItem('accessibility-tts-speed');
    const speed = savedSpeed ? parseFloat(savedSpeed) : 1.0;
    const preferredVoiceURI = localStorage.getItem('accessibility-tts-voice-uri');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = Math.max(0.5, Math.min(2.0, speed));
    utterance.pitch = 1.0;

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

      // If online synthesis failed (common when cloud voice fails in Chromium), retry once with local fallback
      if (event.error === 'synthesis-failed' && !isRetry && voices.length > 0) {
        console.warn("TTS: synthesis-failed on primary voice, attempting local fallback...");
        speakText(text, onStart, onEnd, true);
        return;
      }

      console.warn("TTS: SpeechSynthesis error:", event.error, "- attempting Audio MP3 fallback...");
      
      // Since the user is on Vivaldi (Arch Linux) without compiled Speech Dispatcher support,
      // fallback to Google Translate unofficial TTS MP3 endpoint which will play now that ffmpeg codecs are installed.
      playAudioFallback(text, onStart, onEnd);
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
        // If voices is completely empty, it means Chromium TTS engine is totally dead/disabled.
        // Skip straight to the audio fallback instead of letting it fail silently.
        if (voices.length === 0) {
          stopSpeaking(); // clear any pending state
          console.log("TTS: No voices found in browser. Jumping directly to Audio MP3 fallback.");
          playAudioFallback(text, onStart, onEnd);
        } else {
          window.speechSynthesis.speak(utterance);
        }
      }
    }, 60);

  } catch (err) {
    console.error("TTS: SpeechSynthesis execution error:", err);
    playAudioFallback(text, onStart, onEnd);
  }
};

let activeAudio: HTMLAudioElement | null = null;

const playAudioFallback = (text: string, onStart?: () => void, onEnd?: () => void) => {
  try {
    if (activeAudio) {
      activeAudio.pause();
      if (activeAudio.parentNode) activeAudio.parentNode.removeChild(activeAudio);
      activeAudio.src = '';
      activeAudio = null;
    }

    const safeText = text.length > 200 ? text.substring(0, 197) + '...' : text;
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=uk&client=tw-ob&q=${encodeURIComponent(safeText)}`;
    
    // Create an audio element and append it to the body to prevent "removed from document" abort errors
    const audio = document.createElement('audio');
    audio.style.display = 'none';
    audio.src = url;
    audio.crossOrigin = 'anonymous'; // helps with some CORS policies
    document.body.appendChild(audio);
    
    activeAudio = audio;

    audio.onplay = () => {
      if (onStart) onStart();
    };

    audio.onended = () => {
      if (activeAudio === audio) activeAudio = null;
      if (audio.parentNode) audio.parentNode.removeChild(audio);
      if (onEnd) onEnd();
    };

    audio.onerror = (e) => {
      console.error("TTS: Audio Fallback Error:", e);
      if (activeAudio === audio) activeAudio = null;
      if (audio.parentNode) audio.parentNode.removeChild(audio);
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tts-error', { 
          detail: { 
            message: "Неможливо відтворити аудіо. Браузер не підтримує формат MP3, або запит заблоковано.",
            error: "audio-fallback-failed"
          } 
        }));
      }
      if (onEnd) onEnd();
    };

    // Browsers require play() to be caught if prevented by autoplay policies
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.error("TTS: Audio play() prevented by browser policy:", err);
        if (activeAudio === audio) activeAudio = null;
        if (audio.parentNode) audio.parentNode.removeChild(audio);
        if (onEnd) onEnd();
      });
    }

  } catch (e) {
    console.error("TTS: Failed to setup Audio fallback", e);
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
  
  if (activeAudio) {
    activeAudio.pause();
    if (activeAudio.parentNode) activeAudio.parentNode.removeChild(activeAudio);
    activeAudio.src = '';
    activeAudio = null;
  }
};

/**
 * Checks if the speech synthesis is currently speaking.
 */
export const isSpeakingActive = (): boolean => {
  const isWebSpeechActive = typeof window !== 'undefined' && ('speechSynthesis' in window) && Boolean(window.speechSynthesis.speaking);
  const isAudioActive = activeAudio !== null && !activeAudio.paused && !activeAudio.ended;
  return isWebSpeechActive || isAudioActive;
};


