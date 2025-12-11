'use client';

import { useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  name?: string;
  profileImage?: string;
}

interface ChatHistoryProps {
  messages: Message[];
}

function getAvatarColor(name: string): string {
  const colors = [
    'from-red-500 to-pink-500',
    'from-orange-500 to-yellow-500',
    'from-green-500 to-emerald-500',
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-indigo-500 to-blue-500',
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export default function ChatHistory({ messages }: ChatHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="fixed top-4 right-4 w-[380px] z-40">
      <div className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white/90 text-sm font-medium">ライブチャット</span>
          <span className="text-white/50 text-xs ml-auto">
            {messages.filter((m) => m.role === 'user').length} comments
          </span>
        </div>

        {/* Messages Container */}
        <div
          ref={scrollRef}
          className="max-h-[60vh] overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
        >
          {messages
            .filter((message) => message.role === 'user')
            .map((message, index) => (
              <div key={index} className="flex gap-3 animate-fade-in">
                {/* Avatar */}
                {message.profileImage ? (
                  <img
                    src={message.profileImage}
                    alt={message.name || 'User'}
                    className="w-8 h-8 rounded-full flex-shrink-0 shadow-lg object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(
                    message.name || 'User'
                  )} flex items-center justify-center flex-shrink-0 shadow-lg ${
                    message.profileImage ? 'hidden' : ''
                  }`}
                >
                  <span className="text-white text-xs font-bold">
                    {(message.name || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  {message.name && (
                    <span className="text-xs text-white/60 font-medium mb-1 block">
                      {message.name}
                    </span>
                  )}
                  <div className="inline-block max-w-full rounded-2xl px-4 py-2.5 bg-white/10 text-white/95 rounded-tl-sm">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

