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
    getTrackedGWData: t.procedure.input(z.number()).query(async (req) => {
        const schema = z.array(
            z.object({
                time: z.date().transform((val) => val.getTime()),
                crewId: z.number(),
                gwNumber: z.number(),
                ranking: z.number(),
                preliminaries: z
                    .bigint()
                    .nullable()
                    .transform((val) => (val ? Number(val) : 0)),
                day1: z
                    .bigint()
                    .nullable()
                    .transform((val) => (val ? Number(val) : 0)),
                day2: z
                    .bigint()
                    .nullable()
                    .transform((val) => (val ? Number(val) : 0)),
                day3: z
                    .bigint()
                    .nullable()
                    .transform((val) => (val ? Number(val) : 0)),
                day4: z
                    .bigint()
                    .nullable()
                    .transform((val) => (val ? Number(val) : 0)),
            })
        );
        const data = await prisma.gbfTrackedCrewData.findMany({
            where: {
                crewId: req.input,
            },
        });

        if (!data) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "No data found!",
            });
        }
        return schema.parse(data);
    }),
});
