import mongoose, { Document, Model } from 'mongoose'

export interface IReport extends Document {
  userId: mongoose.Types.ObjectId
  username: string
  type: 'bug' | 'suggestion' | 'development'
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'resolved' | 'rejected'
  priority: 'low' | 'medium' | 'high' | 'critical'
  createdAt: Date
  updatedAt: Date
  response?: string
  resolvedAt?: Date
}

const reportSchema = new mongoose.Schema<IReport>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['bug', 'suggestion', 'development'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved', 'rejected'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  response: {
    type: String,
    maxlength: 500
  },
  resolvedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Update the updatedAt timestamp on save
reportSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

const Report: Model<IReport> = mongoose.models.Report || mongoose.model<IReport>('Report', reportSchema)

export default Report