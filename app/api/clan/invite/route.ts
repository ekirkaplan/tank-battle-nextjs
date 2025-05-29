import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'
import Clan from '@/models/Clan'
import ClanInvite from '@/models/ClanInvite'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
)

// POST - Send clan invite
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const userId = payload.userId as string
    
    const { username } = await request.json()
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }
    
    await dbConnect()
    
    // Get inviter's data
    const inviter = await Player.findById(userId)
    if (!inviter || !inviter.clan?.id) {
      return NextResponse.json({ error: 'You are not in a clan' }, { status: 400 })
    }
    
    // Check if inviter has permission to invite (leader or officer)
    if (inviter.clan.role === 'member') {
      return NextResponse.json({ error: 'Only leaders and officers can invite' }, { status: 403 })
    }
    
    // Find user to invite
    const userToInvite = await Player.findOne({ username })
    if (!userToInvite) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    if (userToInvite.clan?.id) {
      return NextResponse.json({ error: 'User is already in a clan' }, { status: 400 })
    }
    
    // Get clan details
    const clan = await Clan.findById(inviter.clan.id)
    if (!clan) {
      return NextResponse.json({ error: 'Clan not found' }, { status: 404 })
    }
    
    // Check clan requirements
    if (userToInvite.level.current < clan.requirements.minLevel) {
      return NextResponse.json({ 
        error: `User needs to be at least level ${clan.requirements.minLevel}` 
      }, { status: 400 })
    }
    
    if (userToInvite.stats.totalKills < clan.requirements.minKills) {
      return NextResponse.json({ 
        error: `User needs at least ${clan.requirements.minKills} kills` 
      }, { status: 400 })
    }
    
    // Create invite
    try {
      const invite = await ClanInvite.createInvite(
        inviter.clan.id.toString(),
        userId,
        userToInvite._id.toString()
      )
      
      return NextResponse.json({ 
        success: true,
        message: `Invite sent to ${username}`
      })
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  } catch (error) {
    console.error('Clan invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Get pending invites
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const userId = payload.userId as string
    
    await dbConnect()
    
    const invites = await ClanInvite.getPendingInvites(userId)
    
    return NextResponse.json({ invites })
  } catch (error) {
    console.error('Get invites error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}