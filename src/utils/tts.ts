let activeUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Speaks text using window.speechSynthesis in Ukrainian language.
 * Cleans the input from specific control marks.
 */
export const speakText = (text: string) => {
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Clean up text format slightly for cleaner reading (e.g. remove raw parentheses)
    const cleanText = text
      .replace(/\s+/g, ' ')
      .trim();

    activeUtterance = new SpeechSynthesisUtterance(cleanText);
    activeUtterance.lang = 'uk-UA';
    activeUtterance.rate = 0.95; // Slightly slower for better comprehension
    
    // Retrieve voices
    const voices = window.speechSynthesis.getVoices();
    const ukVoice = voices.find(voice => voice.lang.includes('uk-UA') || voice.lang.includes('uk'));
    if (ukVoice) {
      activeUtterance.voice = ukVoice;
    }
    
    window.speechSynthesis.speak(activeUtterance);
  }
};

/**
 * Stops any active speech synthesis.
 */
export const stopSpeaking = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    activeUtterance = null;
  }
};

/**
 * Checks if the speech synthesis is currently speaking.
 */
export const isSpeakingActive = (): boolean => {
  if ('speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
};
