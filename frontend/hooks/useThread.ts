'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'web_agency_ai_thread_id';

function generateThreadId(): string {
  const hex = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return `client_${hex}`;
}

export function useThread() {
  const [threadId, setThreadIdState] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setThreadIdState(stored);
      } else {
        const created = generateThreadId();
        localStorage.setItem(STORAGE_KEY, created);
        setThreadIdState(created);
      }
    } catch {
      setThreadIdState(generateThreadId());
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const resetThread = useCallback(() => {
    const newId = generateThreadId();
    try {
      localStorage.setItem(STORAGE_KEY, newId);
    } catch {
      // storage unavailable
    }
    setThreadIdState(newId);
    return newId;
  }, []);

  const setThreadId = useCallback((id: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // storage unavailable
    }
    setThreadIdState(id);
  }, []);

  return { threadId, isLoaded, resetThread, setThreadId };
}
