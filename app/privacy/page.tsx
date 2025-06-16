import Link from 'next/link'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-blitz-bg text-blitz-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-blitz-neon hover:text-blitz-copper transition-colors mb-8">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>
        
        <h1 className="text-4xl font-bold mb-8 text-blitz-neon">Privacy Policy</h1>
        
        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-bold mb-3 text-blitz-copper">1. Information We Collect</h2>
            <p>
              We collect minimal information necessary to provide the gaming experience:
              username, hashed password, and game statistics.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 text-blitz-copper">2. How We Use Your Information</h2>
            <p>
              Your information is used solely for authentication, gameplay, and displaying
              statistics on leaderboards.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 text-blitz-copper">3. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data.
              Passwords are hashed using bcrypt and never stored in plain text.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 text-blitz-copper">4. Contact</h2>
            <p>
              For privacy concerns, reach out to us on Twitter: 
              <a href="https://x.com/blitzcore_sol" className="text-blitz-neon hover:text-blitz-copper ml-1">
                @blitzcore_sol
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}