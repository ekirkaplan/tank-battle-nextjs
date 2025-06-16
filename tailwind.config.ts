import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // BLITZCORE Color Palette
        'blitz-bg': '#181D22',      // Charcoal background
        'blitz-neon': '#00EBD7',    // Lightning bolt/neon cyan
        'blitz-copper': '#AF5A29',  // Tank/copper orange
        'blitz-white': '#FFFFFF',   // Text white
        
        // Legacy colors for gradual migration
        'game-bg': '#181D22',
        'game-border': '#00EBD7',
        'tank-red': '#AF5A29',
        'tank-blue': '#00EBD7',
        'tank-green': '#00EBD7',
        'tank-yellow': '#AF5A29',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
export default config