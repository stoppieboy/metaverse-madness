import { Router } from "express";
import { userRouter } from "./user";
import { spaceRouter } from "./space";
import { adminRouter } from "./admin";
import { SignupSchema, SigninSchema } from "../../types/index";
import client from "@repo/db"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

import { JWT_SECRET } from "../../config";
import { adminMiddleware } from "../../middleware/admin";

export const router = Router()

router.get("/testing", (req, res) => {
    res.send("testing")
})

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
        const user = await client.user.create({
            data: {
                username: parsedData.data.username,
                password: hashedPassword,
                role: parsedData.data.type === "admin" ? "Admin" : "User",
            },
        })
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

        const token = jwt.sign({
            userId: user.id,
            role: user.role
        }, JWT_SECRET)

        res.json({
            token
        })

    } catch (error) {
        res.status(400).json({
            message: "Internal server error",
            error: error,
        })
    }

})

router.get("/elements", async (req, res) => {
    const elements = await client.element.findMany()
    res.json({
        elements: elements.map(x => ({
            id: x.id,
            imageUrl: x.imageUrl,
            static: x.static,
            height: x.height,
            width: x.width
        }))
    })
})
router.get("/avatars", async(req, res) => {
    const avatars = await client.avatar.findMany()
    res.json({
        avatars: avatars.map(x => ({
            id: x.id,
            imageUrl: x.imageUrl,
            name: x.name
        }))
    })
})

router.use("/user", userRouter)
router.use("/space", spaceRouter)
router.use("/admin", adminMiddleware, adminRouter)