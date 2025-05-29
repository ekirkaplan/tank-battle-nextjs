'use client'

import { useEffect, useRef, useState } from 'react'
import { Socket } from 'socket.io-client'

interface ChatMessage {
  id: string
  playerId: string
  username: string
  message: string
  timestamp: number
  type: 'global' | 'system' | 'kill'
}

interface ChatBoxProps {
  socket: Socket | null
  isConnected: boolean
}

export default function ChatBox({ socket, isConnected }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!socket) return

    const handleChatMessage = (message: ChatMessage) => {
      setMessages(prev => [...prev.slice(-49), message])
    }

    const handleInit = (data: any) => {
      if (data.chatHistory) {
        setMessages(data.chatHistory)
      }
    }

    socket.on('chatMessage', handleChatMessage)
    socket.on('init', handleInit)

    return () => {
      socket.off('chatMessage', handleChatMessage)
      socket.off('init', handleInit)
    }
  }, [socket])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (!socket || !inputValue.trim() || !isConnected) return

    socket.emit('chatMessage', inputValue.trim())
    setInputValue('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getMessageColor = (type: ChatMessage['type']) => {
    switch (type) {
      case 'system': return 'text-blue-400'
      case 'kill': return 'text-red-400'
      default: return 'text-gray-300'
    }
  }

  return (
    <div className={`fixed bottom-4 left-4 bg-gray-900 bg-opacity-90 rounded-lg shadow-lg transition-all ${
      isMinimized ? 'w-48 h-10' : 'w-80 h-96'
    }`}>
      <div className="flex items-center justify-between p-2 border-b border-gray-700">
        <h3 className="text-sm font-semibold">Chat</h3>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="text-gray-400 hover:text-white text-xs"
        >
          {isMinimized ? '▲' : '▼'}
        </button>
      </div>

      {!isMinimized && (
        <>
          <div className="h-72 overflow-y-auto p-2 space-y-1">
            {messages.map((msg) => (
              <div key={msg.id} className="text-xs">
                <span className="text-gray-500">[{formatTimestamp(msg.timestamp)}]</span>
                {msg.type === 'global' && (
                  <>
                    <span className="text-yellow-400 ml-1">{msg.username}:</span>
                    <span className="text-gray-300 ml-1">{msg.message}</span>
                  </>
                )}
                {(msg.type === 'system' || msg.type === 'kill') && (
                  <span className={`ml-1 ${getMessageColor(msg.type)}`}>{msg.message}</span>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-2 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isConnected ? "Type a message..." : "Disconnected"}
                className="flex-1 bg-gray-800 text-sm px-2 py-1 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                disabled={!isConnected}
                maxLength={200}
              />
              <button
                onClick={sendMessage}
                disabled={!isConnected || !inputValue.trim()}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded text-sm transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}