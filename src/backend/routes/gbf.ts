import { PrismaClient } from "@prisma/client";
import { TRPCError, initTRPC } from "@trpc/server";
import { z } from "zod";

const prisma = new PrismaClient();
export const t = initTRPC.create();

export const gbfRouter = t.router({
    getPlayer: t.procedure.input(z.number()).query(async (req) => {
        const player = await prisma.gbfPlayer.findUnique({
            where: {
                id: req.input,
            },
        });

        if (!player) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "No player found!",
            });
        }
        return player;
    }),
    getCrew: t.procedure.input(z.number()).query(async (req) => {
        const crew = await prisma.gbfCrew.findUnique({
            where: {
                id: req.input,
            },
        });

        if (!crew) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "No crew found!",
            });
        }
        return crew;
    }),
    getCurrentEvents: t.procedure.query(async (_) => {
        const events = await prisma.gbfEvent.findMany({
            where: {
                endDate: {
                    gte: new Date(),
                },
            },
        });

        if (!events) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "No events found!",
            });
        }
        return events;
    }),
});
