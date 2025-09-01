import { Router } from 'express'
import { isAuthenticated } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { ensureDefaultBuckets } from '../services/classification.service.js'

export const bucketsRouter = Router()

bucketsRouter.get('/', isAuthenticated, async (req, res) => {
  const buckets = await ensureDefaultBuckets(req.user!.id)
  res.json(buckets)
})

bucketsRouter.post('/', isAuthenticated, async (req, res) => {
  const { name, description } = req.body
  const userId = req.user!.id

  if (!name) {
    return res.status(400).json({ message: 'Bucket name is required.' })
  }

  const slug = name.toLowerCase().replace(/\s+/g, '-')

  const existing = await prisma.bucket.findUnique({
    where: { userId_slug: { userId, slug } },
  })

  if (existing) {
    return res
      .status(409)
      .json({ message: 'Bucket with this name already exists.' })
  }

  try {
    const newBucket = await prisma.bucket.create({
      data: {
        userId,
        name,
        slug,
        description,
        isDefault: false,
      },
    })
    return res.status(201).json(newBucket)
  } catch (error) {
    console.error('Failed to create bucket:', error)
    return res.status(500).json({ message: 'Failed to create bucket.' })
  }
})

bucketsRouter.delete('/:id', isAuthenticated, async (req, res) => {
  const { id } = req.params
  const userId = req.user!.id

  try {
    const bucket = await prisma.bucket.findUnique({
      where: { id },
      include: { rules: true },
    })

    if (!bucket || bucket.userId !== userId) {
      return res.status(404).json({ message: 'Bucket not found.' })
    }

    if (bucket.isDefault) {
      return res
        .status(400)
        .json({ message: 'Cannot delete a default bucket.' })
    }

    if (bucket.rules.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete a bucket that has rules associated with it.',
      })
    }

    // Reset threads in this bucket before deleting
    await prisma.$transaction([
      prisma.thread.updateMany({
        where: {
          userId,
          bucket: bucket.name,
        },
        data: {
          bucket: 'uncategorized',
          classificationSource: null,
          classificationReason: null,
        },
      }),
      prisma.bucket.delete({ where: { id } }),
    ])

    return res.status(204).send()
  } catch (error) {
    console.error('Failed to delete bucket:', error)
    return res.status(500).json({ message: 'Failed to delete bucket.' })
  }
})
