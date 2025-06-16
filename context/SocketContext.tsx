'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Socket } from 'socket.io-client'

interface SocketContextType {
  socket: Socket | null
  levelUpdateTrigger: number
}

const SocketContext = createContext<SocketContextType>({ 
  socket: null,
  levelUpdateTrigger: 0 
})

export const useSocket = () => useContext(SocketContext)

export function SocketProvider({ 
  children,
  socket 
}: { 
  children: React.ReactNode
  socket: Socket | null 
}) {
  const [levelUpdateTrigger, setLevelUpdateTrigger] = useState(0)

  useEffect(() => {
    if (!socket) return

    const handleLevelUp = () => {
      setLevelUpdateTrigger(prev => prev + 1)
    }

    const handleStatsUpdate = () => {
      setLevelUpdateTrigger(prev => prev + 1)
    }

    socket.on('levelUp', handleLevelUp)
    socket.on('statsUpdate', handleStatsUpdate)

    return () => {
      socket.off('levelUp', handleLevelUp)
      socket.off('statsUpdate', handleStatsUpdate)
    }
  }, [socket])

  return (
    <SocketContext.Provider value={{ socket, levelUpdateTrigger }}>
      {children}
    </SocketContext.Provider>
  )
}