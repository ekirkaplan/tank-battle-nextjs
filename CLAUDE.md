# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev              # Start both Next.js (port 3000) and Socket.IO server (port 3001) concurrently
npm run dev:next         # Start only Next.js development server
npm run dev:socket       # Start only Socket.IO server with nodemon
```

### Production
```bash
npm run build            # Build Next.js application for production
npm start                # Start both servers in production mode
npm run start:next       # Start only Next.js in production
npm run start:socket     # Start only Socket.IO server in production
```

### Code Quality
```bash
npm run lint             # Run Next.js linting (ESLint)
```

## Architecture Overview

This is a real-time multiplayer tank battle game with the following architecture:

### Frontend (Next.js App Router)
- **Authentication Flow**: `/app/api/auth/*` endpoints handle login/register/logout with JWT tokens stored in httpOnly cookies
- **Game Canvas**: `/components/GameCanvas.tsx` renders the game using HTML5 Canvas API, handling tank movements, projectiles, and visual effects
- **Protected Routes**: `/middleware.ts` ensures only authenticated users can access `/game`

### Backend (Socket.IO Server)
- **Real-time Game Loop**: `/server/socket-server.ts` runs at 30 FPS, managing game state and broadcasting updates
- **Player State Management**: Tracks positions, rotations, health, and projectiles for all connected players
- **Database Integration**: Updates player statistics (kills, deaths, damage) in MongoDB after each game event

### Key Design Patterns
- **JWT Authentication**: Using `jose` for Next.js API routes and `jsonwebtoken` for Socket.IO server
- **Concurrent Servers**: Next.js and Socket.IO run as separate processes, communicating via WebSocket
- **Canvas Rendering**: Client-side prediction with server reconciliation for smooth gameplay
- **MongoDB Models**: Player schema in `/models/Player.ts` with bcrypt password hashing

### Important Notes
- Socket.IO server must be running on port 3001 for the game to function
- Environment variables needed: `MONGODB_URI`, `JWT_SECRET`
- Game controls: WASD for movement, mouse for aiming, click to shoot
- Tanks have 100 health, bullets deal 20 damage