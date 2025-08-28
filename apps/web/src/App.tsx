import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import axios from 'axios'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <HealthCheck />
      </div>
    </QueryClientProvider>
  )
}

function HealthCheck() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:4000/api/health')
      return response.data
    },
  })
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Inbox Concierge</h1>
      <p>
        API Status:{' '}
        {isLoading && <span className="text-yellow-500">Loading...</span>}
        {isError && <span className="text-red-500">Error</span>}
        {data && (
          <span className="text-green-500 font-semibold uppercase">
            {data.status}
          </span>
        )}
      </p>
    </div>
  )
}

export default App
