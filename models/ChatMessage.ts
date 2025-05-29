import mongoose, { Document, Model } from 'mongoose'

export interface IChatMessage extends Document {
  playerId: string
  username: string
  message: string
  type: 'global' | 'system' | 'kill'
  timestamp: Date
  createdAt: Date
}

const chatMessageSchema = new mongoose.Schema<IChatMessage>({
  playerId: {
    type: String,
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 200
  },
  type: {
    type: String,
    enum: ['global', 'system', 'kill'],
    default: 'global',
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Auto-delete after 24 hours
  }
})

// Compound index for efficient queries
chatMessageSchema.index({ timestamp: -1, type: 1 })

// Static method to get recent messages
chatMessageSchema.statics.getRecentMessages = async function(limit: number = 50) {
  return this.find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean()
}

// Static method to clean old messages
chatMessageSchema.statics.cleanOldMessages = async function(hoursToKeep: number = 24) {
  const cutoffTime = new Date(Date.now() - hoursToKeep * 60 * 60 * 1000)
  return this.deleteMany({ timestamp: { $lt: cutoffTime } })
}

const ChatMessage: Model<IChatMessage> = mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema)

export default ChatMessage