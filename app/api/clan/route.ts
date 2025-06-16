import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'
import Clan from '@/models/Clan'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
)

// GET - List clans or get player's clan
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const onlyPublic = searchParams.get('public') === 'true'
    
    // Get token to check if user wants their clan info
    let token = request.cookies.get('authToken')?.value
    
    if (!token) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }
    if (token && !search) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET)
        const userId = payload.userId as string
        
        const player = await Player.findById(userId)
        if (player?.clan?.id) {
          const clan = await Clan.findById(player.clan.id)
            .populate('members.player', 'username level stats.totalKills')
          return NextResponse.json({ clan })
        }
      } catch (error) {
        // Continue to list clans
      }
    }
    
    // List clans
    const query: any = {}
    if (onlyPublic) {
      query.isPublic = true
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tag: { $regex: search, $options: 'i' } }
      ]
    }
    
    const clans = await Clan.find(query)
      .select('name tag description members stats requirements isPublic')
      .sort('-stats.totalScore')
      .limit(20)
      .lean()
    
    // Add member count
    const clansWithCount = clans.map(clan => ({
      ...clan,
      memberCount: clan.members.length
    }))
    
    return NextResponse.json({ clans: clansWithCount })
  } catch (error) {
    console.error('Get clans error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new clan
export async function POST(request: NextRequest) {
  try {
    let token = request.cookies.get('authToken')?.value
    
    if (!token) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const userId = payload.userId as string
    
    const { name, tag, description, isPublic, requirements } = await request.json()
    
    // Validate input
    if (!name || !tag) {
      return NextResponse.json({ error: 'Name and tag are required' }, { status: 400 })
    }
    
    await dbConnect()
    
    // Check if player is already in a clan
    const player = await Player.findById(userId)
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    
    if (player.clan?.id) {
      return NextResponse.json({ error: 'You are already in a clan' }, { status: 400 })
    }
    
    // Check if player meets level requirement
    if (player.level.current < 5) {
      return NextResponse.json({ error: 'You need to be at least level 5 to create a clan' }, { status: 400 })
    }
    
    // Check if clan name/tag already exists
    const existingClan = await Clan.findOne({
      $or: [{ name }, { tag: tag.toUpperCase() }]
    })
    
    if (existingClan) {
      return NextResponse.json({ error: 'Clan name or tag already exists' }, { status: 400 })
    }
    
    // Create clan
    const clan = new Clan({
      name,
      tag: tag.toUpperCase(),
      description: description || '',
      leader: userId,
      members: [{
        player: userId,
        role: 'leader',
        joinedAt: new Date()
      }],
      isPublic: isPublic !== false,
      requirements: {
        minLevel: requirements?.minLevel || 1,
        minKills: requirements?.minKills || 0
      }
    })
    
    await clan.save()
    
    // Update player with clan info
    player.clan = {
      id: clan._id,
      name: clan.name,
      tag: clan.tag,
      role: 'leader'
    }
    await player.save()
    
    return NextResponse.json({ 
      success: true,
      clan: {
        _id: clan._id,
        name: clan.name,
        tag: clan.tag
      }
    })
  } catch (error) {
    console.error('Create clan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}