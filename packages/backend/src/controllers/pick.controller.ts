import { NextFunction, Response, Request } from 'express'
import { validateEdge } from '../schema/generate'

export const pickSchema = (req: Request, res: Response, next: NextFunction) => {
  validateEdge(req, res, next)
}

