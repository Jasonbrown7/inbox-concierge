import { User as PrismaUser } from '@prisma/client'

declare global {
  namespace Express {
    // Attaches to the request. It's the same as the Prisma User.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    export interface User extends PrismaUser {}

    export interface Request {
      user?: User
    }
  }
}
