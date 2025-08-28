import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/axios'

interface User {
  id: string
  email: string
}

export function useUser() {
  return useQuery<User | null>({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/auth/me')
        return data
      } catch {
        return null // 401 => not logged in
      }
    },
    retry: false, // do not retry 401
  })
}
