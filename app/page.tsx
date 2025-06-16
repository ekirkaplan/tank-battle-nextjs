'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import AuthForm from '@/components/AuthForm'
import toast from 'react-hot-toast'

export default function Home() {
  const router = useRouter()
  const [showAuth, setShowAuth] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem('authToken')
    setIsAuthenticated(!!token)
  }, [])

  const handlePlayClick = () => {
    if (isAuthenticated) {
      router.push('/game')
    } else {
      setShowAuth(true)
    }
  }

  const handleAuthSuccess = () => {
    setShowAuth(false)
    setIsAuthenticated(true)
    toast.success('Authentication successful!')
    router.push('/game')
  }

  return (
    <div className="min-h-screen bg-blitz-bg text-blitz-white">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-blitz-bg via-blitz-bg/90 to-blitz-bg"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-96 h-96 bg-blitz-neon/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blitz-copper/10 rounded-full blur-3xl animate-pulse delay-300"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8">
            <Image 
              src="/logo.png" 
              alt="BLITZCORE" 
              width={200} 
              height={80} 
              className="mx-auto"
              priority
            />
          </div>

          {/* Title */}
          <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-blitz-neon to-blitz-copper bg-clip-text text-transparent">
            BLITZCORE
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-gray-300">
            Engage in epic multiplayer tank warfare
          </p>

          {/* Play Button */}
          <button
            onClick={handlePlayClick}
            className="group relative px-12 py-6 text-2xl font-bold bg-gradient-to-r from-blitz-neon to-blitz-copper rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 shadow-[0_0_30px_rgba(0,235,215,0.5)]"
          >
            <span className="relative z-10 text-blitz-bg">PLAY NOW</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blitz-copper to-blitz-neon opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>

          {/* Social Link */}
          <div className="mt-8">
            <a 
              href="https://x.com/blitzcore_sol" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blitz-neon hover:text-blitz-copper transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              @blitzcore_sol
            </a>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-8 h-8 text-blitz-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-blitz-neon">
            Game Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-blitz-bg/50 border border-blitz-neon/20 rounded-lg p-8 hover:border-blitz-neon/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,235,215,0.2)]">
              <div className="text-4xl mb-4">⚔️</div>
              <h3 className="text-2xl font-bold mb-4 text-blitz-copper">Real-time Combat</h3>
              <p className="text-gray-300">
                Engage in intense multiplayer battles with players from around the world. 
                Fast-paced action with smooth 30 FPS gameplay.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-blitz-bg/50 border border-blitz-neon/20 rounded-lg p-8 hover:border-blitz-neon/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,235,215,0.2)]">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-2xl font-bold mb-4 text-blitz-copper">Level & Progress</h3>
              <p className="text-gray-300">
                Gain experience, level up, and unlock attribute points. 
                Customize your tank with health, speed, damage, and more.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-blitz-bg/50 border border-blitz-neon/20 rounded-lg p-8 hover:border-blitz-neon/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,235,215,0.2)]">
              <div className="text-4xl mb-4">🏆</div>
              <h3 className="text-2xl font-bold mb-4 text-blitz-copper">Clans & Leaderboards</h3>
              <p className="text-gray-300">
                Join or create clans, compete on leaderboards, and prove your dominance 
                in the arena.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to Play Section */}
      <section className="py-20 px-4 bg-blitz-bg/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-blitz-neon">
            How to Play
          </h2>
          
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blitz-neon rounded-full flex items-center justify-center text-blitz-bg font-bold">
                1
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-blitz-copper">Movement</h3>
                <p className="text-gray-300">Use WASD keys to move your tank around the battlefield</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blitz-neon rounded-full flex items-center justify-center text-blitz-bg font-bold">
                2
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-blitz-copper">Aiming & Shooting</h3>
                <p className="text-gray-300">Move your mouse to aim and click to shoot at enemies</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blitz-neon rounded-full flex items-center justify-center text-blitz-bg font-bold">
                3
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-blitz-copper">Power-ups</h3>
                <p className="text-gray-300">Collect power-ups for health, speed, damage boosts, and more</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blitz-neon rounded-full flex items-center justify-center text-blitz-bg font-bold">
                4
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-blitz-copper">Level Up</h3>
                <p className="text-gray-300">Earn XP by defeating enemies and upgrade your tank attributes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-blitz-neon">
            Battle Stats
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold text-blitz-copper mb-2">100</div>
              <div className="text-gray-300">Base Health</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-blitz-copper mb-2">20</div>
              <div className="text-gray-300">Base Damage</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-blitz-copper mb-2">50</div>
              <div className="text-gray-300">XP per Kill</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-blitz-copper mb-2">∞</div>
              <div className="text-gray-300">Fun Factor</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-blitz-neon">
            Ready for Battle?
          </h2>
          <p className="text-xl text-gray-300 mb-12">
            Join the arena and prove your worth as the ultimate tank commander!
          </p>
          <button
            onClick={handlePlayClick}
            className="group relative px-12 py-6 text-2xl font-bold bg-gradient-to-r from-blitz-neon to-blitz-copper rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 shadow-[0_0_30px_rgba(0,235,215,0.5)]"
          >
            <span className="relative z-10 text-blitz-bg">START PLAYING</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blitz-copper to-blitz-neon opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-blitz-neon/20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-gray-400">
            © 2024 BLITZCORE. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <a 
              href="https://x.com/blitzcore_sol" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-blitz-neon transition-colors"
            >
              Twitter
            </a>
            <Link href="/privacy" className="text-gray-400 hover:text-blitz-neon transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-blitz-neon transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-blitz-bg border border-blitz-neon/20 rounded-lg p-8 max-w-md w-full relative">
            <button
              onClick={() => setShowAuth(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-blitz-neon transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <AuthForm onSuccess={handleAuthSuccess} />
          </div>
        </div>
      )}
    </div>
  )
}