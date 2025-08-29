import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Outlet } from 'react-router-dom'
import { useUser } from './hooks/useUser'
import { LoginPage } from './pages/LoginPage'
// import { InboxPage } from './pages/InboxPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthHandler />
    </QueryClientProvider>
  )
}

function AuthHandler() {
  const { data: user, isLoading } = useUser()
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    )
  }
  return user ? <Outlet /> : <LoginPage />
}

export default App
