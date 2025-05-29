import ChatMessageModel from '../models/ChatMessage'

export interface ChatMessage {
  id: string
  playerId: string
  username: string
  message: string
  timestamp: number
  type: 'global' | 'system' | 'kill'
}

export class ChatManager {
  constructor() {
    // Load initial messages from database on startup
    this.loadInitialMessages()
  }
  
  private async loadInitialMessages() {
    try {
      const messages = await this.getRecentMessages(this.MAX_MESSAGES)
      console.log(`Loaded ${messages.length} chat messages from database`)
    } catch (error) {
      console.error('Failed to load initial chat messages:', error)
    }
  }
  private messages: ChatMessage[] = []
  private messageIdCounter = 0
  private readonly MAX_MESSAGES = 50
  private readonly MESSAGE_RATE_LIMIT = 3 // messages per 10 seconds
  private playerMessageCounts: Map<string, { count: number; resetTime: number }> = new Map()

  async addMessage(playerId: string, username: string, message: string, type: 'global' | 'system' | 'kill' = 'global'): Promise<ChatMessage | null> {
    // Rate limiting for player messages
    if (type === 'global') {
      const now = Date.now()
      const playerLimit = this.playerMessageCounts.get(playerId) || { count: 0, resetTime: now + 10000 }
      
      if (now > playerLimit.resetTime) {
        playerLimit.count = 0
        playerLimit.resetTime = now + 10000
      }
      
      if (playerLimit.count >= this.MESSAGE_RATE_LIMIT) {
        return null // Rate limit exceeded
      }
      
      playerLimit.count++
      this.playerMessageCounts.set(playerId, playerLimit)
    }

    // Sanitize message
    const sanitizedMessage = this.sanitizeMessage(message)
    if (!sanitizedMessage) return null

    const chatMessage: ChatMessage = {
      id: `msg_${this.messageIdCounter++}`,
      playerId,
      username,
      message: sanitizedMessage,
      timestamp: Date.now(),
      type
    }

    this.messages.push(chatMessage)
    
    // Keep only recent messages in memory
    if (this.messages.length > this.MAX_MESSAGES) {
      this.messages = this.messages.slice(-this.MAX_MESSAGES)
    }

    // Save to MongoDB
    try {
      await ChatMessageModel.create({
        playerId,
        username,
        message: sanitizedMessage,
        type,
        timestamp: new Date(chatMessage.timestamp)
      })
    } catch (error) {
      console.error('Failed to save chat message to DB:', error)
    }

    return chatMessage
  }

  private sanitizeMessage(message: string): string {
    // Remove excessive whitespace
    message = message.trim().replace(/\s+/g, ' ')
    
    // Limit message length
    if (message.length > 200) {
      message = message.substring(0, 200)
    }
    
    // Basic profanity filter (can be expanded)
    const bannedWords = ['spam', 'hack', 'cheat'] // Add more as needed
    const lowerMessage = message.toLowerCase()
    for (const word of bannedWords) {
      if (lowerMessage.includes(word)) {
        return ''
      }
    }
    
    return message
  }

  async getRecentMessages(count: number = 20): Promise<ChatMessage[]> {
    // If we have enough messages in memory, return them
    if (this.messages.length >= count) {
      return this.messages.slice(-count)
    }
    
    // Otherwise, load from database
    try {
      const dbMessages = await ChatMessageModel.getRecentMessages(count)
      const formattedMessages: ChatMessage[] = dbMessages.map((msg: any) => ({
        id: msg._id.toString(),
        playerId: msg.playerId,
        username: msg.username,
        message: msg.message,
        timestamp: msg.timestamp.getTime(),
        type: msg.type
      }))
      
      // Update memory cache
      this.messages = formattedMessages
      return formattedMessages
    } catch (error) {
      console.error('Failed to load chat history from DB:', error)
      return this.messages.slice(-count)
    }
  }

  async addSystemMessage(message: string): Promise<ChatMessage> {
    return (await this.addMessage('system', 'System', message, 'system'))!
  }

  async addKillMessage(killerName: string, victimName: string): Promise<ChatMessage> {
    const message = `${killerName} destroyed ${victimName}`
    return (await this.addMessage('system', 'System', message, 'kill'))!
  }

  async clearOldMessages() {
    const oneHourAgo = Date.now() - 3600000
    this.messages = this.messages.filter(msg => msg.timestamp > oneHourAgo)
    
    // Also clean database
    try {
      await ChatMessageModel.cleanOldMessages(1) // Keep only last hour
    } catch (error) {
      console.error('Failed to clean old messages from DB:', error)
    }
  }

  removePlayerMessages(playerId: string) {
    this.messages = this.messages.filter(msg => msg.playerId !== playerId)
    this.playerMessageCounts.delete(playerId)
  }
}