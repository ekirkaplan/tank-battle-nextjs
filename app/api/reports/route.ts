import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { connectDB } from '@/lib/db'
import Report from '@/models/Report'
import Player from '@/models/Player'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
const secret = new TextEncoder().encode(JWT_SECRET)

export async function POST(request: NextRequest) {
  try {
    // Get auth token from Authorization header or cookies
    const authHeader = request.headers.get('authorization')
    let token: string | undefined
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else {
      const cookieStore = cookies()
      const cookieToken = cookieStore.get('token')
      token = cookieToken?.value
    }
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify token
    const { payload } = await jwtVerify(token, secret)
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    await connectDB()
    
    // Get player info
    const player = await Player.findById(payload.userId)
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    
    // Parse request body
    const { type, title, description } = await request.json()
    
    // Validate input
    if (!type || !title || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    if (!['bug', 'suggestion', 'development'].includes(type)) {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }
    
    if (title.length > 100) {
      return NextResponse.json({ error: 'Title too long (max 100 characters)' }, { status: 400 })
    }
    
    if (description.length > 1000) {
      return NextResponse.json({ error: 'Description too long (max 1000 characters)' }, { status: 400 })
    }
    
    // Determine priority based on type
    let priority = 'medium'
    if (type === 'bug') {
      priority = 'high'
    } else if (type === 'development') {
      priority = 'low'
    }
    
    // Create report
    const report = new Report({
      userId: player._id,
      username: player.username,
      type,
      title,
      description,
      priority
    })
    
    await report.save()
    
    return NextResponse.json({
      message: 'Report submitted successfully',
      reportId: report._id
    }, { status: 201 })
    
  } catch (error) {
    console.error('Report submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get auth token from Authorization header or cookies
    const authHeader = request.headers.get('authorization')
    let token: string | undefined
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else {
      const cookieStore = cookies()
      const cookieToken = cookieStore.get('token')
      token = cookieToken?.value
    }
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify token
    const { payload } = await jwtVerify(token, secret)
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    await connectDB()
    
    // Get user's reports
    const reports = await Report.find({ userId: payload.userId })
      .sort({ createdAt: -1 })
      .limit(50)
    
    return NextResponse.json({ reports })
    
  } catch (error) {
    console.error('Get reports error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}