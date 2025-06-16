import mongoose from 'mongoose'
import Player from '../models/Player'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tank-battle-nextjs'

async function addPositionField() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')
    
    // Add position field to all players that don't have it
    const result = await Player.updateMany(
      { position: { $exists: false } },
      { $set: { position: { x: -1, y: -1 } } }
    )
    
    console.log(`Updated ${result.modifiedCount} players with position field`)
    
    // Verify the update
    const samplePlayer = await Player.findOne()
    if (samplePlayer) {
      console.log('Sample player position:', samplePlayer.position)
    }
    
    process.exit(0)
  } catch (error) {
    console.error('Migration error:', error)
    process.exit(1)
  }
}

addPositionField()