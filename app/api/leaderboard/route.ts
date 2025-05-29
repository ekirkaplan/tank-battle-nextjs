import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'score'
    const limit = parseInt(searchParams.get('limit') || '10')
    
    let sortField = 'stats.highestScore'
    let projection = {
      username: 1,
      'stats.highestScore': 1,
      'level.current': 1,
      tankColor: 1
    }
    
    // Different leaderboard types
    switch (type) {
      case 'score':
        sortField = 'stats.highestScore'
        break
      case 'level':
        sortField = 'level.current'
        projection = {
          username: 1,
          'level.current': 1,
          'level.totalExperience': 1,
          tankColor: 1
        }
        break
      case 'kills':
        sortField = 'stats.totalKills'
        projection = {
          username: 1,
          'stats.totalKills': 1,
          'stats.totalDeaths': 1,
          tankColor: 1
        }
        break
      case 'kd':
        // Kill/Death ratio requires aggregation
        const kdLeaderboard = await Player.aggregate([
          {
            $project: {
              username: 1,
              tankColor: 1,
              'stats.totalKills': 1,
              'stats.totalDeaths': 1,
              kdRatio: {
                $cond: {
                  if: { $eq: ['$stats.totalDeaths', 0] },
                  then: '$stats.totalKills',
                  else: { $divide: ['$stats.totalKills', '$stats.totalDeaths'] }
                }
              }
            }
          },
          { $sort: { kdRatio: -1 } },
          { $limit: limit }
        ])
        
        return NextResponse.json({ leaderboard: kdLeaderboard })
      case 'damage':
        sortField = 'stats.totalDamageDealt'
        projection = {
          username: 1,
          'stats.totalDamageDealt': 1,
          'stats.totalDamageTaken': 1,
          tankColor: 1
        }
        break
      case 'games':
        sortField = 'stats.totalGamesPlayed'
        projection = {
          username: 1,
          'stats.totalGamesPlayed': 1,
          lastSeen: 1,
          tankColor: 1
        }
        break
    }
    
    // Regular sorting query
    const leaderboard = await Player
      .find({}, projection)
      .sort({ [sortField]: -1 })
      .limit(limit)
      .lean()
    
    return NextResponse.json({ leaderboard })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}