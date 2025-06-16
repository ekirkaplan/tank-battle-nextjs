import Link from 'next/link'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-blitz-bg text-blitz-white p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-blitz-neon hover:text-blitz-copper transition-colors mb-8">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>
        
        <h1 className="text-4xl font-bold mb-8 text-blitz-neon">Terms of Service</h1>
        
        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-bold mb-3 text-blitz-copper">1. Game Rules</h2>
            <p>
              Players must not use cheats, exploits, or automation tools. Fair play
              is essential for an enjoyable gaming experience for all.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 text-blitz-copper">2. Account Responsibility</h2>
            <p>
              You are responsible for maintaining the security of your account.
              Do not share your login credentials with others.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 text-blitz-copper">3. Code of Conduct</h2>
            <p>
              Respect other players. Harassment, hate speech, or offensive behavior
              will result in account suspension or termination.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 text-blitz-copper">4. Service Availability</h2>
            <p>
              We strive to maintain service availability but cannot guarantee
              uninterrupted access. Maintenance and updates may cause temporary downtime.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 text-blitz-copper">5. Changes to Terms</h2>
            <p>
              We reserve the right to update these terms. Continued use of the
              service constitutes acceptance of any changes.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}