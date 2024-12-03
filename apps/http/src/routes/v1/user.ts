import { Router } from "express";
import { UpdateMetaDataSchema } from "../../types";
import client from "@repo/db"
import { userMiddleware } from "../../middleware/user";

export const userRouter = Router()

userRouter.post("/metadata", userMiddleware, async (req, res) => {

    const parsedData = UpdateMetaDataSchema.safeParse(req.body)
    if (!parsedData.success) {
        res.status(400).json({
            message: "Validation failed",
            errors: parsedData.error.issues,
        })
        return
    }

    try{

        await client.user.update({
            where: {
                id: req.userId
            },
            data: {
                avatarId: parsedData.data.avatarId
            }
        })
    
        res.status(200).json({
            message: "metadata updated",
        })
    }catch(e) {
        console.log("error", e)
        res.status(400).json({message: "Internal Server error"})
    }
})

userRouter.get("/metadata/bulk", async(req, res) => {
    const userIdString = (req.query.ids ?? "[]") as string
    const userIds = userIdString.slice(1, userIdString?.length - 1).split(",")

    const metadata = await client.user.findMany({
        where: {
            id: {
                in: userIds
            }
        },
        select: {
            id: true,
            avatar: true,
        }
    })
    res.json({
        avatars: metadata.map(user => {
            return {
                userId: user.id,
                avatarId: user.avatar?.imageUrl
            }
        })
    })
})