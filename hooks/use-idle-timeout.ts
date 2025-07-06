import { useState, useEffect, useRef } from 'react';

interface IdleTimeoutProps {
  onIdle: () => void;
  idleTime?: number;
}

export function useIdleTimeout({ onIdle, idleTime = 15 }: IdleTimeoutProps) {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutId = useRef<number | null>(null);

  const resetTimeout = () => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    timeoutId.current = window.setTimeout(() => {
      setIsIdle(true);
      onIdle();
    }, idleTime * 60 * 1000); // Convert minutes to milliseconds
  };

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];

    const handleEvent = () => {
      setIsIdle(false);
      resetTimeout();
    };

    events.forEach(event => {
      window.addEventListener(event, handleEvent);
    });

    resetTimeout(); // Initial setup

    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleEvent);
      });
    };
  }, [idleTime, onIdle]);

  return isIdle;
} 