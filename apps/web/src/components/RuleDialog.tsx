import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createRule, deleteRule, fetchBuckets, fetchRules } from '@/lib/api'
import { Separator } from './ui/separator'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Checkbox } from './ui/checkbox'

type Rule = {
  id: string
  type: string
  pattern: string
  priority: number
  bucket: { name: string }
}

export function RuleDialog({ onCreated }: { onCreated?: () => void }) {
  const qc = useQueryClient()
  const { data: buckets } = useQuery({
    queryKey: ['buckets'],
    queryFn: fetchBuckets,
  })
  const { data: rules } = useQuery<Rule[]>({
    queryKey: ['rules'],
    queryFn: fetchRules,
  })
  const [bucketId, setBucketId] = useState<string>('')
  const [type, setType] = useState<
    'FROM_EQUALS' | 'FROM_DOMAIN' | 'SUBJECT_CONTAINS' | 'HAS_LIST_UNSUBSCRIBE'
  >('FROM_DOMAIN')
  const [pattern, setPattern] = useState('')
  const [isHighPriority, setIsHighPriority] = useState(false)
  const [open, setOpen] = useState(false)

  const createMutation = useMutation({
    mutationFn: () => createRule({ bucketId, type, pattern, isHighPriority }),
    onSuccess: () => {
      setPattern('')
      setIsHighPriority(false)
      qc.invalidateQueries({ queryKey: ['rules'] })
      toast.success('Rule created successfully.')
      onCreated?.()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rules'] })
      toast.success('Rule deleted successfully.')
      onCreated?.()
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Manage Rules</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create new rule</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Bucket</Label>
            <Select value={bucketId} onValueChange={setBucketId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose bucket" />
              </SelectTrigger>
              <SelectContent>
                {buckets?.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Rule type</Label>
            <Select
              value={type}
              onValueChange={(
                v:
                  | 'FROM_EQUALS'
                  | 'FROM_DOMAIN'
                  | 'SUBJECT_CONTAINS'
                  | 'HAS_LIST_UNSUBSCRIBE'
              ) => setType(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FROM_EQUALS">
                  From equals (full address)
                </SelectItem>
                <SelectItem value="FROM_DOMAIN">From domain equals</SelectItem>
                <SelectItem value="SUBJECT_CONTAINS">
                  Subject contains
                </SelectItem>
                <SelectItem value="HAS_LIST_UNSUBSCRIBE">
                  Has List-Unsubscribe header
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Pattern</Label>
            <Input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="e.g. stripe.com"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="high-priority"
              checked={isHighPriority}
              onCheckedChange={(checked) => setIsHighPriority(!!checked)}
            />
            <Label
              htmlFor="high-priority"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Make this a high-priority rule (overrides other rules)
            </Label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={
              createMutation.isPending ||
              !bucketId ||
              (!pattern && type !== 'HAS_LIST_UNSUBSCRIBE')
            }
          >
            Create
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="text-lg font-medium">Existing Rules</h3>
          {(rules || []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              No rules created yet.
            </p>
          )}
          <div className="space-y-2">
            {rules?.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50"
              >
                <div>
                  {rule.priority === 1 && (
                    <span className="font-bold text-yellow-500 mr-2">
                      [High Priority]
                    </span>
                  )}
                  <span className="font-mono bg-white/50 px-1 py-0.5 rounded text-xs">
                    {rule.type}
                  </span>
                  :<span className="font-semibold ml-1">{rule.pattern}</span> →{' '}
                  <span className="font-semibold">{rule.bucket.name}</span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => deleteMutation.mutate(rule.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
