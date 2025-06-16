import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'
import Clan from '@/models/Clan'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
)

// POST - Promote/demote a player's role
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
    
    const { playerId, newRole } = await request.json()
    
    if (!playerId || !newRole) {
      return NextResponse.json({ error: 'Player ID and new role are required' }, { status: 400 })
    }
    
    if (!['member', 'officer', 'leader'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    
    await dbConnect()
    
    // Get current user's player data
    const currentPlayer = await Player.findById(userId)
    if (!currentPlayer || !currentPlayer.clan?.id) {
      return NextResponse.json({ error: 'You are not in a clan' }, { status: 400 })
    }
    
    // Get the clan
    const clan = await Clan.findById(currentPlayer.clan.id)
    if (!clan) {
      return NextResponse.json({ error: 'Clan not found' }, { status: 404 })
    }
    
    // Check if current user is the leader
    const currentMember = clan.members.find(m => m.player.toString() === userId)
    if (!currentMember || currentMember.role !== 'leader') {
      return NextResponse.json({ error: 'Only clan leaders can change roles' }, { status: 403 })
    }
    
    // Find the target member
    const targetMember = clan.members.find(m => m.player.toString() === playerId)
    if (!targetMember) {
      return NextResponse.json({ error: 'Player is not a member of this clan' }, { status: 400 })
    }
    
    // Cannot change your own role to non-leader
    if (playerId === userId && newRole !== 'leader') {
      return NextResponse.json({ error: 'Cannot demote yourself from leader' }, { status: 400 })
    }
    
    // Get target player for username
    const targetPlayer = await Player.findById(playerId)
    if (!targetPlayer) {
      return NextResponse.json({ error: 'Target player not found' }, { status: 404 })
    }
    
    // If promoting to leader, demote current leader
    if (newRole === 'leader') {
      currentMember.role = 'officer'
      clan.leader = playerId
      
      // Update current leader's player record
      currentPlayer.clan.role = 'officer'
      await currentPlayer.save()
      
      // Update new leader's player record
      targetPlayer.clan.role = 'leader'
      await targetPlayer.save()
    } else {
      // Update target player's role in clan record
      targetPlayer.clan.role = newRole
      await targetPlayer.save()
    }
    
    // Update role in clan members array
    targetMember.role = newRole
    await clan.save()
    
    const roleNames = {
      'leader': 'Leader',
      'officer': 'Officer', 
      'member': 'Member'
    }
    
    return NextResponse.json({ 
      success: true,
      message: `${targetPlayer.username} has been ${newRole === 'leader' ? 'promoted to' : 'set as'} ${roleNames[newRole as keyof typeof roleNames]}`
    })
  } catch (error) {
    console.error('Role change error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}