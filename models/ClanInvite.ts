import mongoose, { Document, Model } from 'mongoose'

export interface IClanInvite extends Document {
  clan: mongoose.Types.ObjectId
  invitedBy: mongoose.Types.ObjectId
  invitedUser: mongoose.Types.ObjectId
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  createdAt: Date
  expiresAt: Date
}

const clanInviteSchema = new mongoose.Schema<IClanInvite>({
  clan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clan',
    required: true,
    index: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  invitedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    index: true
  }
})

// Compound index for efficient queries
clanInviteSchema.index({ invitedUser: 1, status: 1 })
clanInviteSchema.index({ clan: 1, status: 1 })

// Auto-expire old invites
clanInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Static method to create invite
clanInviteSchema.statics.createInvite = async function(
  clanId: string, 
  invitedById: string, 
  invitedUserId: string
) {
  // Check if there's already a pending invite
  const existingInvite = await this.findOne({
    clan: clanId,
    invitedUser: invitedUserId,
    status: 'pending'
  })

  if (existingInvite) {
    throw new Error('User already has a pending invite to this clan')
  }

  return this.create({
    clan: clanId,
    invitedBy: invitedById,
    invitedUser: invitedUserId
  })
}

// Static method to get pending invites for a user
clanInviteSchema.statics.getPendingInvites = async function(userId: string) {
  return this.find({
    invitedUser: userId,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  })
  .populate('clan', 'name tag description')
  .populate('invitedBy', 'username')
  .sort('-createdAt')
}

const ClanInvite: Model<IClanInvite> = mongoose.models.ClanInvite || mongoose.model<IClanInvite>('ClanInvite', clanInviteSchema)

export default ClanInvite