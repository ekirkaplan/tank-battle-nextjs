import mongoose, { Document, Model } from 'mongoose'
import bcrypt from 'bcrypt'

export interface IPlayer extends Document {
  username: string
  password: string
  stats: {
    totalKills: number
    totalDeaths: number
    highestScore: number
    totalGamesPlayed: number
    totalDamageDealt: number
    totalDamageTaken: number
  }
  level: {
    current: number
    experience: number
    experienceToNext: number
    totalExperience: number
  }
  attributes: {
    health: number
    speed: number
    damage: number
    regeneration: number
    attackSpeed: number
    availablePoints: number
  }
  clan?: {
    id: mongoose.Types.ObjectId
    name: string
    tag: string
    role: 'leader' | 'officer' | 'member'
  }
  tankColor: string
  createdAt: Date
  lastSeen: Date
  comparePassword(candidatePassword: string): Promise<boolean>
  updateStats(gameStats: any): Promise<IPlayer>
  addExperience(amount: number): Promise<{ leveledUp: boolean; newLevel: number }>
  assignAttributePoint(attribute: 'health' | 'speed' | 'damage' | 'regeneration' | 'attackSpeed'): Promise<IPlayer>
}

const playerSchema = new mongoose.Schema<IPlayer>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
    match: /^[a-zA-Z0-9_-]+$/,
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  stats: {
    totalKills: { type: Number, default: 0 },
    totalDeaths: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    totalGamesPlayed: { type: Number, default: 0 },
    totalDamageDealt: { type: Number, default: 0 },
    totalDamageTaken: { type: Number, default: 0 }
  },
  level: {
    current: { type: Number, default: 1 },
    experience: { type: Number, default: 0 },
    experienceToNext: { type: Number, default: 100 },
    totalExperience: { type: Number, default: 0 }
  },
  attributes: {
    health: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
    damage: { type: Number, default: 0 },
    regeneration: { type: Number, default: 0 },
    attackSpeed: { type: Number, default: 0 },
    availablePoints: { type: Number, default: 0 }
  },
  clan: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'Clan' },
    name: { type: String },
    tag: { type: String },
    role: { type: String, enum: ['leader', 'officer', 'member'] }
  },
  tankColor: {
    type: String,
    default: function() {
      return `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
})

// Hash password before saving
playerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error: any) {
    next(error)
  }
})

// Compare password method
playerSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password)
}

// Update stats method
playerSchema.methods.updateStats = async function(gameStats: any) {
  this.stats.totalKills += gameStats.kills || 0
  this.stats.totalDeaths += gameStats.deaths || 0
  this.stats.totalGamesPlayed += 1
  this.stats.totalDamageDealt += gameStats.damageDealt || 0
  this.stats.totalDamageTaken += gameStats.damageTaken || 0
  
  if (gameStats.score > this.stats.highestScore) {
    this.stats.highestScore = gameStats.score
  }
  
  // Calculate experience gained
  const expGained = (gameStats.kills || 0) * 50 + 
                    (gameStats.damageDealt || 0) * 0.5 + 
                    (gameStats.score || 0) * 10
  
  if (expGained > 0) {
    await this.addExperience(expGained)
  }
  
  this.lastSeen = new Date()
  return this.save()
}

// Add experience and handle leveling
playerSchema.methods.addExperience = async function(amount: number) {
  this.level.experience += amount
  this.level.totalExperience += amount
  
  let leveledUp = false
  let levelsGained = 0
  
  // Check for level up
  while (this.level.experience >= this.level.experienceToNext) {
    this.level.experience -= this.level.experienceToNext
    this.level.current += 1
    levelsGained += 1
    
    // Calculate next level requirement (exponential growth)
    this.level.experienceToNext = Math.floor(100 * Math.pow(1.5, this.level.current - 1))
    
    // Award attribute points (2 per level)
    this.attributes.availablePoints += 2
    
    leveledUp = true
  }
  
  await this.save()
  
  return {
    leveledUp,
    newLevel: this.level.current,
    levelsGained,
    attributePoints: levelsGained * 2
  }
}

// Assign attribute point
playerSchema.methods.assignAttributePoint = async function(attribute: string) {
  if (this.attributes.availablePoints <= 0) {
    throw new Error('No available attribute points')
  }
  
  const validAttributes = ['health', 'speed', 'damage', 'regeneration', 'attackSpeed']
  if (!validAttributes.includes(attribute)) {
    throw new Error('Invalid attribute')
  }
  
  this.attributes[attribute] += 1
  this.attributes.availablePoints -= 1
  
  return this.save()
}

// Remove password from JSON responses
playerSchema.methods.toJSON = function() {
  const obj = this.toObject()
  delete obj.password
  return obj
}

const Player: Model<IPlayer> = mongoose.models.Player || mongoose.model<IPlayer>('Player', playerSchema)

export default Player