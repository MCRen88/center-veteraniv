let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeAudio: HTMLAudioElement | null = null;
let audioChunks: string[] = [];
let currentChunkIndex = 0;
let ttsOnStartCallback: (() => void) | null = null;
let ttsOnEndCallback: (() => void) | null = null;

/**
 * Splits text into safe chunks under a maximum character length, preserving sentences.
 */
const splitTextIntoChunks = (text: string, maxLength: number = 180): string[] => {
  const chunks: string[] = [];
  // Split by common sentence terminal punctuation
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
        // Split by words if the sentence itself is too long
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
 * Plays the next chunk in the fallback audio queue.
 */
const playNextAudioChunk = () => {
  if (currentChunkIndex >= audioChunks.length) {
    console.log("TTS Fallback: Finished playing all audio chunks");
    if (ttsOnEndCallback) ttsOnEndCallback();
    activeAudio = null;
    return;
  }
  
  const chunkText = audioChunks[currentChunkIndex];
  console.log(`TTS Fallback: Playing chunk ${currentChunkIndex + 1}/${audioChunks.length}: "${chunkText}"`);
  
  const encodedText = encodeURIComponent(chunkText);
  const savedSpeed = localStorage.getItem('accessibility-tts-speed');
  const speed = savedSpeed ? parseFloat(savedSpeed) : 1.0;
  
  const url = `/api/tts?ie=UTF-8&tl=uk&client=tw-ob&q=${encodedText}`;
  
  activeAudio = document.createElement('audio');
  activeAudio.setAttribute('referrerpolicy', 'no-referrer');
  activeAudio.preload = "auto";
  
  activeAudio.onended = () => {
    currentChunkIndex++;
    playNextAudioChunk();
  };
  
  activeAudio.onerror = (e) => {
    console.error("TTS Fallback: Audio load or play failed on chunk index:", currentChunkIndex, e);
    currentChunkIndex++;
    playNextAudioChunk();
  };
  
  activeAudio.src = url;
  activeAudio.playbackRate = speed;
  
  activeAudio.play().catch((err) => {
    console.error("TTS Fallback: play() promise rejected:", err);
    if (ttsOnEndCallback) ttsOnEndCallback();
    activeAudio = null;
  });
};

/**
 * Triggers speech via Google Translate translation TTS API as an online fallback.
 */
const speakWithAudioFallback = (text: string, onStart?: () => void, onEnd?: () => void) => {
  console.log("TTS Fallback: Starting fallback player");
  stopAudioFallback();
  
  ttsOnStartCallback = onStart || null;
  ttsOnEndCallback = onEnd || null;
  
  audioChunks = splitTextIntoChunks(text, 150);
  currentChunkIndex = 0;
  
  console.log(`TTS Fallback: Text split into ${audioChunks.length} chunks`);
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
    console.log("TTS Fallback: Stopping current audio playing");
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
 * Cleans the input from specific control marks and configures speed.
 * Automatically falls back to Google Translate Audio TTS if system voices are unavailable.
 */
export const speakText = (
  text: string, 
  onStart?: () => void, 
  onEnd?: () => void
) => {
  console.log("TTS: speakText called with text length:", text.length);
  
  // Clean up text format: replace arrows, collapse whitespace
  const cleanText = text
    .replace(/->|→/g, ', далі, ')
    .replace(/\s+/g, ' ')
    .trim();

  // If SpeechSynthesis is not supported, or getVoices is empty, use fallback immediately
  if (!('speechSynthesis' in window)) {
    console.warn("TTS: SpeechSynthesis is not supported. Redirecting to Audio fallback.");
    speakWithAudioFallback(cleanText, onStart, onEnd);
    return;
  }
  
  const voices = window.speechSynthesis.getVoices();
  console.log("TTS: Available system voices count:", voices.length);
  if (voices.length === 0) {
    console.warn("TTS: No system voices available. Redirecting to Audio fallback.");
    speakWithAudioFallback(cleanText, onStart, onEnd);
    return;
  }

  // Cancel any ongoing system speech and stop audio fallback
  window.speechSynthesis.cancel();
  stopAudioFallback();
  
  console.log("TTS: Initializing SpeechSynthesisUtterance for clean text:", cleanText);
  activeUtterance = new SpeechSynthesisUtterance(cleanText);
  activeUtterance.lang = 'uk-UA';
  
  // Retrieve custom speed from localStorage
  const savedSpeed = localStorage.getItem('accessibility-tts-speed');
  const speed = savedSpeed ? parseFloat(savedSpeed) : 1.0;
  activeUtterance.rate = speed;
  console.log("TTS: System voice rate set to:", speed);
  
  const ukVoice = voices.find(voice => voice.lang.includes('uk-UA') || voice.lang.includes('uk'));
  if (ukVoice) {
    console.log("TTS: Found system Ukrainian voice:", ukVoice.name, ukVoice.lang);
    activeUtterance.voice = ukVoice;
  } else {
    console.warn("TTS: Ukrainian system voice not found. Using default browser system voice.");
  }
  
  if (onStart) {
    activeUtterance.onstart = () => {
      console.log("TTS: SpeechSynthesis started playing");
      onStart();
    };
  }
  
  const handleEnd = () => {
    console.log("TTS: SpeechSynthesis ending handler called");
    if (onEnd) onEnd();
    activeUtterance = null;
  };
  
  activeUtterance.onend = () => {
    console.log("TTS: SpeechSynthesis ended normally");
    handleEnd();
  };
  
  activeUtterance.onerror = (event) => {
    console.error("TTS: SpeechSynthesis error:", event.error, event);
    if (event.error === 'synthesis-failed' || event.error === 'network') {
      console.warn("TTS: SpeechSynthesis failed to play. Attempting Audio fallback...");
      speakWithAudioFallback(cleanText, onStart, onEnd);
    } else {
      handleEnd();
    }
  };
  
  // Tiny timeout to bypass the Chrome/Chromium cancel-speak bug
  setTimeout(() => {
    console.log("TTS: Triggering window.speechSynthesis.speak");
    window.speechSynthesis.speak(activeUtterance!);
  }, 50);
};

/**
 * Stops any active speech synthesis.
 */
export const stopSpeaking = () => {
  console.log("TTS: stopSpeaking called");
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  stopAudioFallback();
  activeUtterance = null;
};

/**
 * Checks if the speech synthesis is currently speaking.
 */
export const isSpeakingActive = (): boolean => {
  const isSpeechSynthesisSpeaking = ('speechSynthesis' in window) && window.speechSynthesis.speaking;
  const isAudioPlaying = activeAudio !== null && !activeAudio.paused;
  return isSpeechSynthesisSpeaking || isAudioPlaying;
};


