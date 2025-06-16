import mongoose from 'mongoose'
import Player from '../models/Player'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tank-battle-nextjs'

async function testKillUpdate() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')
    
    // Test with a specific player
    const username = process.argv[2] || 'mergen'
    console.log(`\n=== Testing kill update for ${username} ===`)
    
    const player = await Player.findOne({ username })
    if (!player) {
      console.log('Player not found')
      process.exit(1)
    }
    
    console.log('Before update:')
    console.log(`  Total Kills: ${player.stats.totalKills}`)
    console.log(`  Total Deaths: ${player.stats.totalDeaths}`)
    console.log(`  Total Damage Dealt: ${player.stats.totalDamageDealt}`)
    console.log(`  Total Damage Taken: ${player.stats.totalDamageTaken}`)
    
    // Test the exact update that the game uses
    const updated = await Player.findByIdAndUpdate(
      player._id,
      { 
        $inc: { 
          'stats.totalKills': 1,
          'stats.totalDamageDealt': 20
        },
        $set: { lastSeen: new Date() }
      },
      { new: true }
    )
    
    if (!updated) {
      console.log('Update failed - player not found')
    } else {
      console.log('\nAfter update:')
      console.log(`  Total Kills: ${updated.stats.totalKills}`)
      console.log(`  Total Deaths: ${updated.stats.totalDeaths}`)
      console.log(`  Total Damage Dealt: ${updated.stats.totalDamageDealt}`)
      console.log(`  Total Damage Taken: ${updated.stats.totalDamageTaken}`)
      console.log('\nUpdate successful!')
    }
    
    // Verify by re-reading from database
    const verified = await Player.findById(player._id)
    console.log('\nVerification (re-read from DB):')
    console.log(`  Total Kills: ${verified.stats.totalKills}`)
    console.log(`  Total Damage Dealt: ${verified.stats.totalDamageDealt}`)
    
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

testKillUpdate()