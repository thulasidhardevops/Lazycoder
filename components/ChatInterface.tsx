import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { ChatMessage } from '../types';

interface ChatInterfaceProps {
  history: ChatMessage[];
  onSendMessage: (msg: string) => void;
  isProcessing: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ history, onSendMessage, isProcessing }) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-primary-200">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50">
        {history.length === 0 && (
           <div className="text-center text-gray-500 mt-10">
              <h3 className="font-semibold text-lg text-gray-700">Refine Agent</h3>
              <p>Ask me to change variables, add resources, or explain the code.</p>
           </div>
        )}
        {history.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`
                max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm
                ${msg.role === 'user' 
                  ? 'bg-primary-600 text-white rounded-br-none' 
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                }
              `}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-primary-100 bg-white rounded-b-lg">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 border border-primary-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
            placeholder="e.g. Change the instance type to t3.micro..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
          />
          <Button type="submit" disabled={isProcessing || !input.trim()}>
            {isProcessing ? 'Thinking...' : 'Send'}
          </Button>
        </div>
      </form>
    </div>
  );
};