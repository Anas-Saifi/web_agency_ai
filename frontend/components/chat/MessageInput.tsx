'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface MessageInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
}: MessageInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }

  return (
    <div className="p-4 border-t border-white/[0.06] bg-[#080810]">
      <div
        className={cn(
          'flex items-end gap-3 rounded-2xl border px-4 py-3 transition-all duration-200',
          disabled
            ? 'border-white/[0.05] bg-white/[0.02]'
            : 'border-white/[0.10] bg-white/[0.04] focus-within:border-indigo-500/50 focus-within:bg-indigo-500/[0.03]'
        )}
      >
        <textarea
          ref={textareaRef}
          id="chat-input"
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled}
          placeholder={disabled ? 'Agent is working...' : placeholder}
          className={cn(
            'flex-1 resize-none bg-transparent text-sm text-white/90 placeholder-white/25',
            'outline-none leading-relaxed max-h-40 overflow-y-auto',
            'disabled:cursor-not-allowed disabled:text-white/30'
          )}
        />

        <motion.button
          id="send-button"
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          whileTap={{ scale: 0.92 }}
          className={cn(
            'flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200',
            !value.trim() || disabled
              ? 'bg-white/[0.04] text-white/20 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
          )}
        >
          {disabled ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </motion.button>
      </div>
      <p className="mt-2 text-center text-[11px] text-white/15">
        Press Enter to send · Shift+Enter for newline
      </p>
    </div>
  );
}
