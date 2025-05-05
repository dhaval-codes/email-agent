"use client";
import React, { useState } from "react";
import { useSession } from "next-auth/react";
import ChatWithAIAgent from "@/lib/agent";

export default function ChatPage() {
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>(
    []
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();

  const handleSend = async () => {
    if (!input.trim()) return; // Prevent sending empty messages
    setLoading(true);

    const messageToSend: string = input.trim();
    if (!messageToSend) return;

    setMessages((prev) => [...prev, { sender: "user", text: messageToSend }]);
    setInput("");

    try {
      const response = await ChatWithAIAgent({ input: messageToSend, session });
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: response || "No response." },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen min-w-full py-6 pt-24 flex flex-col bg-blue-50">
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 my-8">
            <p className="mb-4">Welcome to Email AI Assistant!</p>
            <p>Ask questions about your emails or get insights</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs md:max-w-md p-3 rounded-lg text-white ${
                message.sender === "user" ? "bg-blue-500" : "bg-blue-400"
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-blue-300 text-white">
              AI is analyzing your emails...
            </div>
          </div>
        )}
      </div>

      <div className="py-4 md:py-6 px-4 sm:px-8">
        {!session ? (
          <div className="text-center p-4 bg-red-600 rounded-lg text-black-300">
            Please sign in with Google to access your emails
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-grow p-2 border border-blue-400 placeholder-blue-200 text-blue-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                placeholder="Ex: What is the last month spending on food?"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                disabled={loading}
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
