import { Router } from "express";
import { CreateAvatarSchema, CreateElementSchema, CreateMapSchema, UpdateElementSchema } from "../../types";
import client from "@repo/db"

// /api/v1/space
export const adminRouter = Router()

adminRouter.post("/element", async(req, res) => {
    const parsedData = CreateElementSchema.safeParse(req.body)
    if (!parsedData.success) {
        res.status(400).json({
            message: "Invalid data",
            errors: parsedData.error.issues,
        })
        return
    }

    const new_element = await client.element.create({
        data: {
            imageUrl: parsedData.data.imageUrl,
            width: parsedData.data.width,
            height: parsedData.data.height,
            static: parsedData.data.static,
        }
    })

    res.json({
        id: new_element.id
    })
    return
})

adminRouter.put("/element/:elementId", async(req, res) => {
    const parsedData = UpdateElementSchema.safeParse(req.body)
    if (!parsedData.success) {
        res.status(400).json({
            message: "Invalid data",
            errors: parsedData.error.issues,
        })
        return
    }

    await client.element.update({
        where: {
            id: req.params.elementId
        },
        data: {
            imageUrl: parsedData.data.imageUrl,
        }
    })
    res.status(200).json({
        message: "element updated"
    })
    return
})

adminRouter.post("/avatar", async(req, res) => {
    const parsedData = CreateAvatarSchema.safeParse(req.body)
    if (!parsedData.success) {
        res.status(400).json({
            message: "Invalid data",
            errors: parsedData.error.issues,
        })
        return
    }
    const new_avatar = await client.avatar.create({
        data: {
            name: parsedData.data.name,
            imageUrl: parsedData.data.imageUrl
        }
    })

    res.json({
        avatarId: new_avatar.id
    })
    return
})

adminRouter.post("/map", async(req, res) => {
    const parsedData = CreateMapSchema.safeParse(req.body)
    if (!parsedData.success) {
        res.status(400).json({
            message: "Invalid data",
            errors: parsedData.error.issues,
        })
        return
    }

    const new_map = await client.map.create({
        data: {
            name: parsedData.data.name,
            width: parseInt(parsedData.data.dimensions.split("x")[0]),
            height: parseInt(parsedData.data.dimensions.split("x")[1]),
            thumbnail: parsedData.data.thumbnail,
            mapElements: {
                create: parsedData.data.defaultElements.map(e => ({
                    elementId: e.elementId,
                    x: e.x,
                    y: e.y
                }))
            }
        }
    })

    res.json({
        id: new_map.id
    })
})