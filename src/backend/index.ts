import { PrismaClient } from "@prisma/client";
import express from "express";
import cors from "cors";
import userRouter from "./routes/user";

const prisma = new PrismaClient();
const app = express();

const port = process.env.BACKEND_PORT;

app.use(express.json());
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
app.use(cors({ credentials: true, origin: true }));

const main = async () => {
    await prisma.$connect();

    app.use("/user", userRouter);

    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
};

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
