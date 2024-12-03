import jwt from "jsonwebtoken"
import { JWT_SECRET } from "../config"
import { NextFunction, Request, Response } from "express"

export const userMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization // "Bearer <token>"
    const token = header?.split(" ")[1]
    if (!token) {
        res.status(403).json({
            message: "Unauthorized",
            error: "You are not authorized to access this resource",
        })
        return
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string, role: string }
        req.userId = decoded.userId
        next()
    }
    catch (error) {
        res.status(403).json({ message: "Unauthorized", error: "You are not authorized to access this resource" })
        return
    }
}