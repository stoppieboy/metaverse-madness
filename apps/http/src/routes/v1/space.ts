import { Router } from "express";

export const spaceRouter = Router()
import client from "@repo/db"
import { AddElementSchema, CreateSpaceSchema, DeleteElementSchema } from "../../types";
import { userMiddleware } from "../../middleware/user";

spaceRouter.post("/", userMiddleware, async(req, res) => {
    const parsedData = CreateSpaceSchema.safeParse(req.body)
    if (!parsedData.success) {
        console.log("00-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0")
        res.status(400).json({
            message: "Invalid data",
            errors: parsedData.error.issues,
        })
        return
    }

    if(!parsedData.data.mapId) {
        // create a fresh new map
        const space = await client.space.create({
            data: {
                name: parsedData.data.name,
                width: parseInt(parsedData.data.dimensions.split("x")[0]),
                height: parseInt(parsedData.data.dimensions.split("x")[1]),
                creatorId: req.userId!,
            }
        })
        res.json({
            message: "space created",
            spaceId: space.id
        })
        return
    }
    
    // map exists
    const map = await client.map.findUnique({
        where: {
            id: parsedData.data.mapId
        },
        select: {
            mapElements: true,
            width: true,
            height: true
        }
    })
    // console.log("map: ",map)

    if (!map) {
        res.status(400).json({message: "Invalid map ID"})
        return
    }


    // a transaction ensures that either both statement are executed or none of them are.
    // if one of them fails, the transaction is rolled back.
    // this is important because we don't want to create a space without a map.
    let space = await client.$transaction(async () => {
        const space = await client.space.create({
            data: {
                name: parsedData.data.name,
                width: map.width,
                height: map.height,
                creatorId: req.userId!
            }
        });

        await client.spaceElements.createMany({
            data: map.mapElements.map(e => ({
                    spaceId: space.id,
                    elementId: e.elementId,
                    x: e.x!,
                    y: e.y!
            }))
        })
        return space
    })

    res.json({
        message: "space created",
        spaceId: space.id
    })
})


spaceRouter.get("/all", userMiddleware, async(req, res) => {
    try {
        const spaces = await client.space.findMany({
            where: {
                creatorId: req.userId
            }
        })
        
        res.json({
            spaces: spaces.map(space => {
                return {
                    id: space.id,
                    name: space.name,
                    thumbnail: space.thumbnail,
                    dimensions: `${space.width}x${space.height}`,
                }
            })
        })
    } catch (error) {
        res.status(500).json({
            message: "Internal server error",
            error: error,
        })
    }
})

spaceRouter.post("/element", userMiddleware, async(req, res) => {
    
    const parsedData = AddElementSchema.safeParse(req.body)

    if(!parsedData.success) {
        res.status(400).json({
            message: "Invalid data",
            errors: parsedData.error.issues,
        })
        return
    }
    
    const space = await client.space.findUnique({
        where: {
            id: req.body.spaceId,
            creatorId: req.userId!
        },
        select: {
            width: true,
            height: true
        }
    })
    
    if(!space) {
        res.status(400).json({
            message: "Space not found"
        })
        return
    }

    // check if the element lies within the space
    if(req.body.x < 0 || req.body.y < 0 || req.body.x > space.width || req.body.y > space.height) {
        res.status(400).json({
            message: "Element lies outside the space"
        })
        return
    }
    
    await client.spaceElements.create({
        data: {
            spaceId: req.body.spaceId,
            elementId: req.body.elementId,
            x: req.body.x,
            y: req.body.y,
        }
    })
    
    res.json({message: "Element added"})

})

spaceRouter.delete("/element", userMiddleware, async(req, res) => {
    
    console.log("0-0-0-0-0-0-0--0-0-0-0-0-0-0-0--0-0-0-0-0-0-0-0--0-0-0-0-0-0-0-0--0-0-0-0-0-0-0-0--0-")
    const parsedData = DeleteElementSchema.safeParse(req.body)
    
    if(!parsedData.success) {
        res.status(400).json({
            message: "Invalid data",
            errors: parsedData.error.issues,
        })
        return
    }
    
    const spaceElement = await client.spaceElements.findUnique({
        where: {
            id: parsedData.data.id,
        }, include: {
            space: true
        }
    })
    
    
    if(!spaceElement?.space.creatorId || spaceElement?.space.creatorId !== req.userId) {
        res.status(400).json({
            message: "Unauthorized"
        })
        return
    }
    
    await client.spaceElements.delete({
        where: {
            id: parsedData.data.id
        }
    })
    
    res.status(200).json({
        message: "Element deleted"
    })
})

spaceRouter.get("/:spaceId", async(req, res) => {
    const space = await client.space.findUnique({
        where: {
            id: req.params.spaceId
        },include: {
            elements: {
                include: {
                    element: true
                }
            }
        }
    })
    if (!space) {
        res.status(400).json({
            message: "Space not found"
        })
        return
    }
    
    res.status(200).json({
        "dimensions": `${space.width}x${space.height}`,
        elements: space.elements.map(element => ({
            id: element.id,
            element: {
                id: element.element.id,
                imageUrl: element.element.imageUrl,
                    static: element.element.static,
                    height: element.element.height,
                    width: element.element.width,
                },
                x: element.x,
                y: element.y,
            })
        )
    })
    return
})

spaceRouter.delete("/:spaceId", userMiddleware, async (req, res) => {
    const space = await client.space.findUnique({
        where: {
            id: req.params.spaceId
        }, select: {
            creatorId: true
        }
    })

    if(!space) {
        res.status(400).json({
            message: "Space not found"
        })
        return
    }

    // check if the user is the creator of the space
    if(space.creatorId !== req.userId) {
        res.status(403).json({
            message: "Unauthorized"
        })
        return
    }

    await client.space.delete({
        where: {
            id: req.params.spaceId
        }
    })

    res.status(200).json({
        message: "space deleted"
    })
})