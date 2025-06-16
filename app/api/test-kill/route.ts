import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Player from '@/models/Player'

export async function POST(request: NextRequest) {
  try {
    const { killerUsername, victimUsername } = await request.json()
    
    await connectDB()
    
    // Find players
    const killer = await Player.findOne({ username: killerUsername })
    const victim = await Player.findOne({ username: victimUsername })
    
    if (!killer || !victim) {
      return NextResponse.json({ error: 'Players not found' }, { status: 404 })
    }
    
    console.log('Before update:')
    console.log(`${killer.username}: ${killer.stats.totalKills} kills`)
    console.log(`${victim.username}: ${victim.stats.totalDeaths} deaths`)
    
    // Update killer
    const updatedKiller = await Player.findByIdAndUpdate(
      killer._id,
      { 
        $inc: { 
          'stats.totalKills': 1,
          'stats.totalDamageDealt': 20
        },
        $set: { lastSeen: new Date() }
      },
      { new: true }
    )
    
    // Update victim
    const updatedVictim = await Player.findByIdAndUpdate(
      victim._id,
      { 
        $inc: { 
          'stats.totalDeaths': 1,
          'stats.totalDamageTaken': 20
        },
        $set: { lastSeen: new Date() }
      },
      { new: true }
    )
    
    // Add experience to killer
    await updatedKiller.addExperience(50)
    
    console.log('After update:')
    console.log(`${updatedKiller.username}: ${updatedKiller.stats.totalKills} kills`)
    console.log(`${updatedVictim.username}: ${updatedVictim.stats.totalDeaths} deaths`)
    
    return NextResponse.json({
      success: true,
      killer: {
        username: updatedKiller.username,
        stats: updatedKiller.stats,
        level: updatedKiller.level
      },
      victim: {
        username: updatedVictim.username,
        stats: updatedVictim.stats,
        level: updatedVictim.level
      }
    })
  } catch (error) {
    console.error('Test kill error:', error)
    return NextResponse.json({ error: 'Failed to test kill' }, { status: 500 })
  }
}