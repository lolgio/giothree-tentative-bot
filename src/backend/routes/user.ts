import { TRPCError, initTRPC } from "@trpc/server";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";

const prisma = new PrismaClient();
export const t = initTRPC.create();

export const userRouter = t.router({
    getUsers: t.procedure.query(async (_) => {
        const users = await prisma.user.findMany();

        if (!users) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "No users found!",
            });
        }
        return users;
    }),

    getUser: t.procedure.input(z.number()).query(async (req) => {
        const user = await prisma.user.findUnique({
            where: {
                id: req.input,
            },
        });

        if (!user) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "No user found!",
            });
        }
        return user;
    }),

    createUser: t.procedure
        .input(
            //prettier-ignore
            z.object({
                    discordId: z.string().min(5),
                    gbfId: z.string().min(5),
                })
                .required()
        )
        .mutation(async (req) => {
            try {
                const newUser = await prisma.user.create({
                    data: req.input,
                });
                return newUser;
            } catch (err) {
                if (err instanceof PrismaClientKnownRequestError) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "User already exists!",
                    });
                }
            }
        }),
});
export type UserRouter = typeof userRouter;
