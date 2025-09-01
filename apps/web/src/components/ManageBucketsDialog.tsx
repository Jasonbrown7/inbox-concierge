import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { useState } from 'react'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createBucket, deleteBucket, fetchBuckets } from '@/lib/api'
import { Trash2 } from 'lucide-react'

type BucketDialogProps = {
  onCreated: () => void
  onDeleted: () => void
}

export function ManageBucketsDialog({
  onCreated,
  onDeleted,
}: BucketDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const qc = useQueryClient()

  const bucketsQuery = useQuery({
    queryKey: ['buckets'],
    queryFn: fetchBuckets,
    enabled: isOpen, // only fetch when dialog is open
  })

  const createMutation = useMutation({
    mutationFn: createBucket,
    onSuccess: () => {
      toast.success(`Bucket "${name}" created.`)
      setName('')
      setDescription('')
      qc.invalidateQueries({ queryKey: ['buckets'] })
      onCreated()
    },
    onError: (error) => {
      // @ts-expect-error - temp
      const message =
        error.response?.data?.message || 'Failed to create bucket.'
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBucket,
    onSuccess: () => {
      toast.success('Bucket deleted.')
      qc.invalidateQueries({ queryKey: ['buckets'] })
      onDeleted()
    },
    onError: (error) => {
      // @ts-expect-error - temp
      const message =
        error.response?.data?.message || 'Failed to delete bucket.'
      toast.error(message)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) {
      toast.error('Bucket name is required.')
      return
    }
    createMutation.mutate({ name, description })
  }

  const userBuckets = bucketsQuery.data?.filter((b) => !b.isDefault) || []

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Manage Buckets</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Buckets</DialogTitle>
          <DialogDescription>
            Create new buckets for the AI to use, or delete existing ones.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-2 py-2">
            <h3 className="font-semibold text-sm">Create new bucket</h3>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="e.g. Finance"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                placeholder="e.g. Emails related to financial markets or investments"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>

        {userBuckets.length > 0 && (
          <div className="space-y-2 pt-4">
            <h3 className="font-semibold text-sm">Your buckets</h3>
            {userBuckets.map((bucket) => (
              <div
                key={bucket.id}
                className="flex items-center justify-between rounded-md border p-2"
              >
                <span className="text-sm">{bucket.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(bucket.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
