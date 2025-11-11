'use client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatHistoryProps {
  messages: Message[];
  isLoading?: boolean;
}

export default function ChatHistory({
  messages,
  isLoading,
}: ChatHistoryProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 max-h-[calc(100vh-120px)] overflow-y-auto p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            } animate-fade-in`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 shadow-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/95 text-black backdrop-blur-sm'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {message.content}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="max-w-[80%] rounded-lg px-4 py-3 bg-white/95 text-black backdrop-blur-sm shadow-lg">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                </div>
                <span className="text-sm text-gray-500">考え中...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

