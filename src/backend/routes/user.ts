import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const t = initTRPC.create();

export const userRouter = t.router({
    getUsers: t.procedure.query(async (_) => {
        return await prisma.user.findMany();
    }),

    getUser: t.procedure.input(z.number()).query(async (req) => {
        return await prisma.user.findUnique({
            where: {
                id: req.input,
            },
        });
    }),

    createUser: t.procedure
        .input(
            z.object({
                discordId: z.string().min(5),
                gbfId: z.string().min(5),
            })
        )
        .mutation(async (req) => {
            return await prisma.user.create({
                data: req.input,
            });
        }),
});
export type UserRouter = typeof userRouter;
