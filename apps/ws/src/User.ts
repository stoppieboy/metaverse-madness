import { WebSocket } from "ws"
import { RoomManager } from "./RoomManager"
import { OutgoingMessage } from "./types";
import client from "@repo/db"
import jwt, { JwtPayload } from "jsonwebtoken"
import { JWT_SECRET } from "./config";

function getRandomString(length: number) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return result;
}

export class User {
    public id: string;
    public spaceId?: string;
    public userId?: string;
    public x: number;
    public y: number;

    constructor(private ws: WebSocket) {
        this.id = getRandomString(10);
        this.x = 0;
        this.y = 0;
        this.initHandlers();
    }

    initHandlers() {
        this.ws.on("message", async (data) => {
            console.log(data)
            const parsedData = JSON.parse(data.toString())
            console.log(parsedData)
            switch (parsedData.type) {
                case "join": {
                    const spaceId = parsedData.payload.spaceId
                    const token = parsedData.payload.token
                    const userId = (jwt.verify(token, JWT_SECRET) as JwtPayload).userId

                    if(!userId) {
                        this.ws.close()
                        return
                    }
                    this.userId = userId

                    const space = await client.space.findFirst({
                        where: {
                            id: spaceId
                        }
                    })
                    if(!space) {
                        this.ws.close()
                        return;
                    }

                    this.spaceId = spaceId
                    RoomManager.getInstance().addUser(spaceId, this)
                    this.x = Math.floor(Math.random() * space?.width);
                    this.y = Math.floor(Math.random() * space?.height);
                    this.send({
                        type: "space-joined",
                        payload: {
                            users: RoomManager.getInstance().rooms.get(spaceId)?.filter(u => u.id !== this.id)?.map(u => ({id: u.id})) ?? [],
                            spawn: {
                                x: this.x,
                                y: this.y
                            }
                        }
                    })

                    RoomManager.getInstance().broadcast({
                        type: "user-joined",
                        payload: {
                            x: this.x,
                            y: this.y,
                            userId: this.userId
                        }
                    }, this, this.spaceId!)
                    break
                }
                case "move": {
                    const moveX = parsedData.payload.x
                    const moveY = parsedData.payload.y
                    const xDisplacement = Math.abs(this.x - moveX)
                    const yDisplacement = Math.abs(this.y - moveY)
                    if((xDisplacement == 1 && yDisplacement == 0) || (xDisplacement == 0 && yDisplacement == 1)) {
                        this.x = moveX
                        this.y = moveY
                        RoomManager.getInstance().broadcast({
                            type: "movement",
                            payload: {
                                x: this.x,
                                y: this.y,
                                userId: this.id
                            }
                        }, this, this.spaceId!)
                        return
                    }

                    this.send({
                        type: "movement-rejected",
                        payload: {
                            x: this.x,
                            y: this.y
                        }
                    })
                    break
                }
            }
        })
    }

    destroy() {
        RoomManager.getInstance().broadcast({
            type: "user-left",
            payload: {
                userId: this.userId
            }
        }, this, this.spaceId!);
        RoomManager.getInstance().removeUser(this, this.spaceId!);
    }

    send(payload: OutgoingMessage){
        this.ws.send(JSON.stringify(payload));
    }

}