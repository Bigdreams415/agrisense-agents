import { useState, useEffect, useCallback } from 'react';
import { TYPING_PHRASES } from '../utils/workspaceConstants';
import { AnalysisModel } from '../types/workspace';

export const useTypingAnimation = (currentModel: AnalysisModel) => {
  const [typingText, setTypingText] = useState('');

  const startTypingAnimation = useCallback(() => {
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingInterval: NodeJS.Timeout;

    const type = () => {
      const phrases = TYPING_PHRASES[currentModel];
      const phrase = phrases[phraseIndex];

      if (isDeleting) {
        setTypingText(phrase.substring(0, charIndex - 1));
        charIndex--;
      } else {
        setTypingText(phrase.substring(0, charIndex + 1));
        charIndex++;
      }

      let speed = isDeleting ? 50 : 100;

      if (!isDeleting && charIndex === phrase.length) {
        speed = 2000;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        speed = 500;
      }

      typingInterval = setTimeout(type, speed);
    };

    type();

    return () => {
      if (typingInterval) {
        clearTimeout(typingInterval);
      }
    };
  }, [currentModel]);

  useEffect(() => {
    const cleanup = startTypingAnimation();
    return cleanup;
  }, [startTypingAnimation]);

  return typingText;
};