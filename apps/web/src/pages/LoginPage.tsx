import { Button } from '@/components/ui/button'

export function LoginPage() {
  const handleLogin = () => {
    window.location.href = 'http://localhost:4000/api/auth/google'
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gray-50 overflow-hidden font-['Inter',_sans-serif]">
      <div
        className="absolute top-0 left-0 w-full h-full text-gray-200 pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute top-8 left-0 text-[10rem] md:text-[16rem] lg:text-[20rem] font-black leading-none tracking-tighter transform">
          TENEX
        </div>
        <div className="absolute bottom-8 right-0 text-[10rem] md:text-[16rem] lg:text-[20rem] font-black leading-none tracking-tighter transform">
          INBOX
        </div>
      </div>

      <div className="relative z-10 p-8 bg-white rounded-lg shadow-md w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-2">Inbox Concierge</h1>
        <p className="text-muted-foreground mb-6">
          Log in to manage your inbox with AI.
        </p>
        <Button onClick={handleLogin} className="w-full">
          Login with Google
        </Button>
      </div>
    </div>
  )
}
