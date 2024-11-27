import express from "express";
import { router } from "./routes/v1";
import client from "@repo/db"
// const client = require("@repo/db")
import morgan from "morgan"

const app = express()
app.use(morgan("dev"))
app.use(express.json())

app.get("/testing", (req, res) => {
    res.send("testing")
})
app.use("/api/v1", router)

app.listen(process.env.PORT || 3000, () => {
    console.log("server listening on port 3000")
})