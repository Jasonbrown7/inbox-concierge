import { Button } from '@/components/ui/button'

export function LoginPage() {
  const handleLogin = () => {
    window.location.href = 'http://localhost:4000/api/auth/google'
  }

  return (
    <div className="relative min-h-screen bg-neutral-50 p-4 flex items-center justify-center overflow-hidden">
      <span className="absolute top-8 left-8 hidden md:block text-[16rem] font-extrabold text-black -tracking-wider leading-none">
        TENEX
      </span>
      <div className="relative z-10 bg-white p-8 rounded-xl shadow-md w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-2">Inbox Concierge</h1>
        <p className="text-neutral-600 mb-6">
          Log in to manage your inbox with AI.
        </p>
        <Button onClick={handleLogin} className="w-full">
          Login with Google
        </Button>
      </div>
      <span className="absolute bottom-8 right-8 hidden md:block text-[16rem] font-extrabold text-black -tracking-wider leading-none">
        INBOX
      </span>
    </div>
  )
}
