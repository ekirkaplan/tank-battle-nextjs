import mongoose, { Document, Model } from 'mongoose'

export interface IClan extends Document {
  name: string
  tag: string
  description: string
  leader: mongoose.Types.ObjectId
  members: Array<{
    player: mongoose.Types.ObjectId
    role: 'leader' | 'officer' | 'member'
    joinedAt: Date
  }>
  stats: {
    totalKills: number
    totalWins: number
    totalScore: number
  }
  maxMembers: number
  isPublic: boolean
  requirements: {
    minLevel: number
    minKills: number
  }
  createdAt: Date
  updatedAt: Date
}

const clanSchema = new mongoose.Schema<IClan>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  tag: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 5,
    uppercase: true,
    match: /^[A-Z0-9]+$/
  },
  description: {
    type: String,
    maxlength: 200,
    default: ''
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  members: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true
    },
    role: {
      type: String,
      enum: ['leader', 'officer', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  stats: {
    totalKills: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 }
  },
  maxMembers: {
    type: Number,
    default: 50
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  requirements: {
    minLevel: { type: Number, default: 1 },
    minKills: { type: Number, default: 0 }
  }
}, {
  timestamps: true
})

// Indexes
clanSchema.index({ name: 1 })
clanSchema.index({ tag: 1 })
clanSchema.index({ leader: 1 })
clanSchema.index({ 'members.player': 1 })

// Methods
clanSchema.methods.addMember = async function(playerId: string, role: string = 'member') {
  if (this.members.length >= this.maxMembers) {
    throw new Error('Clan is full')
  }
  
  const existingMember = this.members.find(m => m.player.toString() === playerId)
  if (existingMember) {
    throw new Error('Player is already a member')
  }
  
  this.members.push({
    player: playerId,
    role,
    joinedAt: new Date()
  })
  
  return this.save()
}

clanSchema.methods.removeMember = async function(playerId: string) {
  const memberIndex = this.members.findIndex(m => m.player.toString() === playerId)
  if (memberIndex === -1) {
    throw new Error('Player is not a member')
  }
  
  if (this.members[memberIndex].role === 'leader') {
    throw new Error('Cannot remove the leader')
  }
  
  this.members.splice(memberIndex, 1)
  return this.save()
}

clanSchema.methods.changeMemberRole = async function(playerId: string, newRole: string) {
  const member = this.members.find(m => m.player.toString() === playerId)
  if (!member) {
    throw new Error('Player is not a member')
  }
  
  if (newRole === 'leader') {
    // Change current leader to officer
    const currentLeader = this.members.find(m => m.role === 'leader')
    if (currentLeader) {
      currentLeader.role = 'officer'
    }
    this.leader = playerId
  }
  
  member.role = newRole
  return this.save()
}

clanSchema.methods.updateStats = async function(stats: any) {
  this.stats.totalKills += stats.kills || 0
  this.stats.totalWins += stats.wins || 0
  this.stats.totalScore += stats.score || 0
  return this.save()
}

const Clan: Model<IClan> = mongoose.models.Clan || mongoose.model<IClan>('Clan', clanSchema)

export default Clan