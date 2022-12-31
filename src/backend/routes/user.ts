import { TRPCError, initTRPC } from "@trpc/server";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { getPlayerData } from "../services/gbf_collection";

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
                discordId: req.input,
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
                    discordId: z.string(),
                    gbfId: z.string().min(5),
                })
                .required()
        )
        .mutation(async (req) => {
            try {
                const gbfAccount = await getPlayerData(req.input.gbfId);
                if (!gbfAccount) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: `No GBF account found with id ${req.input.gbfId}!}`,
                    });
                }
                const newUser = await prisma.user.create({
                    data: {
                        discordId: Number(req.input.discordId),
                    },
                });

                const gbfDbAccount = await prisma.gbfPlayer.create({
                    data: {
                        id: gbfAccount.user_id,
                        level: Number(gbfAccount.level),
                        nickname: gbfAccount.nickname,
                        playerDiscordId: newUser.discordId,
                    },
                });
                return gbfDbAccount;
            } catch (err) {
                if (err instanceof PrismaClientKnownRequestError) {
                    throw new TRPCError({
                        code: "CONFLICT",
                        message: "User already exists",
                        cause: err,
                    });
                } else {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Something went wrong!",
                    });
                }
            }
        }),
});
export type UserRouter = typeof userRouter;
