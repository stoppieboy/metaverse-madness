import { Router } from "express";
import { userRouter } from "./user.js";
import { spaceRouter } from "./space.js";
import { adminRouter } from "./admin.js";
import { SignupSchema, SigninSchema } from "../../types/index.js";
import client from "@repo/db"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { JWT_SECRET } from "../../config.js";

export const router = Router()

router.post("/signup", async(req, res) => {
    // check the user
    
    const parsedData = SignupSchema.safeParse(req.body)
    if (!parsedData.success) {
        res.status(400).json({
            message: "Invalid data",
            errors: parsedData.error.issues,
        })
        return
    }

    const hashedPassword = await bcrypt.hash(parsedData.data.password, 10)

    try {
        console.log('before')
        const user = await client.user.create({
            data: {
                username: parsedData.data.username,
                password: hashedPassword,
                role: parsedData.data.type === "admin" ? "Admin" : "User",
            },
        })
        console.log('after')
        res.json({
            userId: user.id
        })
    } catch (error) {
        res.status(400).json({
            message: "Internal server error",
            error: error,
        })
        return
    }
    

})

router.post("/signin", async(req, res) => {
    const parsedData = SigninSchema.safeParse(req.body)
    if (!parsedData.success) {
        res.status(403).json({
            message: "Invalid data",
            errors: parsedData.error.issues,
        })
        return
    }

    try {
        const user = await client.user.findUnique({
            where: {
                username: parsedData.data.username,
            }
        })
        if (!user) {
            res.status(403).json({
                message: "User not found",
                error: "Invalid credentials",
            })
            return
        }

        const isValid = await bcrypt.compare(parsedData.data.password, user.password)
        if (!isValid) {
            res.status(403).json({
                message: "User not found",
                error: "Invalid credentials",
            })
            return
        }
        res.json({
            token: jwt.sign({ userId: user.id }, JWT_SECRET)
        })

    } catch (error) {
        res.status(400).json({
            message: "Internal server error",
            error: error,
        })
    }

})

router.get("/elements", (req, res) => {})
router.get("/avatars", (req, res) => {})

router.use("/user", userRouter)
router.use("/space", spaceRouter)
router.use("/admin", adminRouter)