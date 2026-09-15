'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '@/types/agent';
import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';

interface MessageProps {
  message: ChatMessage;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    try {
      setTimeStr(
        new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch {
      setTimeStr('');
    }
  }, [message.timestamp]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5',
          isUser
            ? 'bg-indigo-600/80 border border-indigo-500/40 text-white'
            : 'bg-slate-800 border border-slate-700/80 text-indigo-400'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'flex flex-col gap-1 max-w-[85%] sm:max-w-[78%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm',
            isUser
              ? 'bg-indigo-600 text-white rounded-tr-sm border border-indigo-500/30'
              : 'bg-slate-800/80 text-slate-100 rounded-tl-sm border border-slate-700/60 backdrop-blur-sm'
          )}
        >
          {message.isStreaming ? (
            <span className="flex items-center gap-1.5 py-1">
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </span>
          ) : isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="agent-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        {timeStr && (
          <span
            suppressHydrationWarning
            className="text-[11px] text-slate-500 px-1 font-mono"
          >
            {timeStr}
          </span>
        )}
      </div>
    </motion.div>
  );
}
