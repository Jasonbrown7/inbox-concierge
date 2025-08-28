import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Chrome } from 'lucide-react'

export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Inbox Concierge</CardTitle>
          <CardDescription>
            Log in to manage your inbox with AI.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Button asChild className="w-full">
            <a href="http://localhost:4000/api/auth/google">
              <Chrome className="mr-2 w-4 h-4" />
              Login with Google
            </a>
          </Button>
        </CardContent>

        <CardFooter />
      </Card>
    </div>
  )
}
