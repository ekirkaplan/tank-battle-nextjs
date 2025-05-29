import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import dbConnect from '@/lib/mongodb'
import Player from '@/models/Player'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
)

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const userId = payload.userId as string
    
    const { attribute } = await request.json()
    
    if (!attribute) {
      return NextResponse.json({ error: 'Attribute is required' }, { status: 400 })
    }
    
    await dbConnect()
    
    const player = await Player.findById(userId)
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    
    try {
      await player.assignAttributePoint(attribute)
      return NextResponse.json({ 
        success: true,
        attributes: player.attributes 
      })
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  } catch (error) {
    console.error('Assign stat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}