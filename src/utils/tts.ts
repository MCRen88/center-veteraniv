let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeAudio: HTMLAudioElement | null = null;
let keepAliveTimer: any = null;
let audioChunks: string[] = [];
let currentChunkIndex = 0;
let ttsOnStartCallback: (() => void) | null = null;
let ttsOnEndCallback: (() => void) | null = null;

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
 * Splits text into safe chunks under a maximum character length, preserving sentences.
 */
const splitTextIntoChunks = (text: string, maxLength: number = 180): string[] => {
  const chunks: string[] = [];
  const sentences = text.split(/([.?!]+)/);
  let currentChunk = "";
  
  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = sentences[i] + (sentences[i + 1] || "");
    if (!sentence.trim()) continue;
    
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += (currentChunk ? " " : "") + sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      if (sentence.length > maxLength) {
        const words = sentence.split(/\s+/);
        let wordChunk = "";
        for (const word of words) {
          if ((wordChunk + word).length <= maxLength) {
            wordChunk += (wordChunk ? " " : "") + word;
          } else {
            if (wordChunk) chunks.push(wordChunk);
            wordChunk = word;
          }
        }
        currentChunk = wordChunk;
      } else {
        currentChunk = sentence;
      }
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk);
  }
  
  return chunks;
};

/**
 * Plays the next chunk in the fallback audio queue using direct Google Translate TTS.
 */
const playNextAudioChunk = () => {
  if (currentChunkIndex >= audioChunks.length) {
    if (ttsOnEndCallback) ttsOnEndCallback();
    activeAudio = null;
    return;
  }
  
  const chunkText = audioChunks[currentChunkIndex];
  const encodedText = encodeURIComponent(chunkText);
  const savedSpeed = localStorage.getItem('accessibility-tts-speed');
  const speed = savedSpeed ? parseFloat(savedSpeed) : 1.0;
  
  // Use direct public Google Translate TTS endpoint
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=uk&client=tw-ob&q=${encodedText}`;
  
  activeAudio = new Audio();
  activeAudio.preload = "auto";
  
  activeAudio.onended = () => {
    currentChunkIndex++;
    playNextAudioChunk();
  };
  
  activeAudio.onerror = (e) => {
    console.warn("TTS Audio Fallback error:", e);
    currentChunkIndex++;
    if (currentChunkIndex < audioChunks.length) {
      playNextAudioChunk();
    } else {
      if (ttsOnEndCallback) ttsOnEndCallback();
      activeAudio = null;
    }
  };
  
  activeAudio.src = url;
  activeAudio.playbackRate = speed;
  
  activeAudio.play().catch((err) => {
    console.warn("TTS Audio Fallback play() prevented:", err);
    if (ttsOnEndCallback) ttsOnEndCallback();
    activeAudio = null;
  });
};

/**
 * Fallback speech player when SpeechSynthesis is unavailable.
 */
const speakWithAudioFallback = (text: string, onStart?: () => void, onEnd?: () => void) => {
  stopAudioFallback();
  
  ttsOnStartCallback = onStart || null;
  ttsOnEndCallback = onEnd || null;
  
  audioChunks = splitTextIntoChunks(text, 150);
  currentChunkIndex = 0;
  
  if (audioChunks.length === 0) {
    if (onEnd) onEnd();
    return;
  }
  
  if (ttsOnStartCallback) ttsOnStartCallback();
  playNextAudioChunk();
};

/**
 * Stops any ongoing fallback audio playback.
 */
const stopAudioFallback = () => {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.onended = null;
    activeAudio.onerror = null;
    activeAudio = null;
  }
  audioChunks = [];
  currentChunkIndex = 0;
  ttsOnStartCallback = null;
  ttsOnEndCallback = null;
};

/**
 * Speaks text using window.speechSynthesis in Ukrainian language.
 * Features rate customization, automatic voice detection, and Chrome keep-alive.
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

  // Clean up text format: replace symbols, arrows, collapse spaces
  const cleanText = text
    .replace(/->|→/g, ', далі, ')
    .replace(/[«»"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If SpeechSynthesis is not supported in browser, try audio fallback
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    speakWithAudioFallback(cleanText, onStart, onEnd);
    return;
  }

  // Reset any active state
  stopSpeaking();

  try {
    // Unpause if in paused state (browser glitch workaround)
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const savedSpeed = localStorage.getItem('accessibility-tts-speed');
    const speed = savedSpeed ? parseFloat(savedSpeed) : 1.0;

    activeUtterance = new SpeechSynthesisUtterance(cleanText);
    activeUtterance.lang = 'uk-UA';
    activeUtterance.rate = speed;
    activeUtterance.pitch = 1.0;

    // Pick best available voice (Ukrainian preferred)
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const ukVoice = voices.find(v => 
        (v.lang && (v.lang.toLowerCase().startsWith('uk') || v.lang.toLowerCase().includes('ukr'))) ||
        (v.name && (v.name.toLowerCase().includes('ukrain') || v.name.toLowerCase().includes('україн')))
      );
      if (ukVoice) {
        activeUtterance.voice = ukVoice;
      }
    }

    let hasStarted = false;

    activeUtterance.onstart = () => {
      hasStarted = true;
      if (onStart) onStart();
    };

    const cleanup = () => {
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
      activeUtterance = null;
    };

    activeUtterance.onend = () => {
      cleanup();
      if (onEnd) onEnd();
    };

    activeUtterance.onerror = (event) => {
      cleanup();
      console.warn("SpeechSynthesis utterance event error:", event);
      if (!hasStarted) {
        // If system speech failed before start, attempt fallback
        speakWithAudioFallback(cleanText, onStart, onEnd);
      } else {
        if (onEnd) onEnd();
      }
    };

    // Chrome 15-second utterance pause workaround (keep alive)
    keepAliveTimer = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        if (keepAliveTimer) {
          clearInterval(keepAliveTimer);
          keepAliveTimer = null;
        }
      } else {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);

    window.speechSynthesis.speak(activeUtterance);
  } catch (err) {
    console.error("SpeechSynthesis execution error:", err);
    speakWithAudioFallback(cleanText, onStart, onEnd);
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
    window.speechSynthesis.cancel();
  }
  stopAudioFallback();
  activeUtterance = null;
};

/**
 * Checks if the speech synthesis is currently speaking.
 */
export const isSpeakingActive = (): boolean => {
  const isSpeechSynthesisSpeaking = typeof window !== 'undefined' && ('speechSynthesis' in window) && window.speechSynthesis.speaking;
  const isAudioPlaying = activeAudio !== null && !activeAudio.paused;
  return Boolean(isSpeechSynthesisSpeaking || isAudioPlaying);
};


