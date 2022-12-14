import express, { RequestHandler, Router } from "express";
import { Prisma, PrismaClient } from "@prisma/client";

const router: Router = express.Router();
const prisma = new PrismaClient();

router.get("/", (async (_, res) => {
    const users = await prisma.user.findMany();
    res.status(200).send(users);
}) as RequestHandler);

router.post("/", (async (req, res) => {
    const user: Prisma.UserCreateInput = req.body as Prisma.UserCreateInput;

    if (!user) {
        res.status(400).send("Invalid User Data Provided");
        return;
    }

    const result = await prisma.user
        .create({
            data: user,
        })
        .catch((e) => {
            console.error(e);
            res.status(500).send(e.message);
            return;
        });
    res.status(201).send(result);
}) as RequestHandler);

export default router;
