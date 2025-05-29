import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'
import Clan from '@/models/Clan'
import ClanInvite from '@/models/ClanInvite'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
)

// POST - Respond to clan invite
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const userId = payload.userId as string
    
    const { inviteId, response } = await request.json()
    if (!inviteId || !response) {
      return NextResponse.json({ error: 'Invite ID and response are required' }, { status: 400 })
    }
    
    if (!['accept', 'reject'].includes(response)) {
      return NextResponse.json({ error: 'Invalid response' }, { status: 400 })
    }
    
    await dbConnect()
    
    // Find invite
    const invite = await ClanInvite.findOne({
      _id: inviteId,
      invitedUser: userId,
      status: 'pending'
    }).populate('clan')
    
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found or expired' }, { status: 404 })
    }
    
    // Check if invite is expired
    if (invite.expiresAt < new Date()) {
      invite.status = 'expired'
      await invite.save()
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
    }
    
    if (response === 'reject') {
      invite.status = 'rejected'
      await invite.save()
      return NextResponse.json({ success: true, message: 'Invite rejected' })
    }
    
    // Accept invite
    const player = await Player.findById(userId)
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    
    if (player.clan?.id) {
      return NextResponse.json({ error: 'You are already in a clan' }, { status: 400 })
    }
    
    const clan = await Clan.findById(invite.clan)
    if (!clan) {
      return NextResponse.json({ error: 'Clan not found' }, { status: 404 })
    }
    
    // Check if clan is full
    if (clan.members.length >= clan.maxMembers) {
      return NextResponse.json({ error: 'Clan is full' }, { status: 400 })
    }
    
    // Add player to clan
    await clan.addMember(userId, 'member')
    
    // Update player
    player.clan = {
      id: clan._id,
      name: clan.name,
      tag: clan.tag,
      role: 'member'
    }
    await player.save()
    
    // Update invite status
    invite.status = 'accepted'
    await invite.save()
    
    // Reject all other pending invites for this user
    await ClanInvite.updateMany(
      {
        invitedUser: userId,
        status: 'pending',
        _id: { $ne: inviteId }
      },
      { status: 'rejected' }
    )
    
    return NextResponse.json({ 
      success: true,
      message: `You have joined ${clan.name}!`
    })
  } catch (error) {
    console.error('Respond to invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}