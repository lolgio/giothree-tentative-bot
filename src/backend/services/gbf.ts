import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import { ZodError, z } from "zod";
import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
dotenv.config({ path: __dirname + "/../../../.env" });

const prisma = new PrismaClient();

const initCookieJar = async () => {
    const cookieJar = new CookieJar();
    await cookieJar.setCookie(
        `midship=${process.env.GBF_MIDSHIP}`,
        "https://game.granbluefantasy.jp"
    );

    return cookieJar;
};

let gbf: AxiosInstance;
export const initializeAxiosGbf = async () => {
    const cookieJar = await initCookieJar();

    const config: AxiosRequestConfig = {
        baseURL: "https://game.granbluefantasy.jp",
        headers: {
            "Accept-Encoding": "gzip, deflate, br",
            Connection: "keep-alive",
            "X-Version": "1671026148",
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
            Accept: "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
        },
        jar: cookieJar,
    };

    gbf = wrapper(axios.create(config));
};

export const getGameVersion = async () => {
    const response = await axios.get("https://game.granbluefantasy.jp").catch((err) => {
        console.log(err);
    });

    if (!response) {
        return null;
    }
    if (typeof response.data === "string") {
        const version = response.data.match(/Game\.version = "(\d+)";/);

        if (version && version[1]) {
            return version[1];
        }
    }
};

export const getPlayerData = async (playerId: string) => {
    const userSearchSchema = z.object({
        user_id: z.number().min(1),
        level: z.string(),
        nickname: z.string(),
    });

    const response = (await gbf
        .post("/friend/search_friends_id", {
            user_id: playerId,
        })
        .catch((err) => {
            console.log(err);
        })) as AxiosResponse;

    if (!response) {
        return null;
    }
    try {
        return userSearchSchema.parse(response.data);
    } catch (err) {
        return null;
    }
};

export const updateCrewData = async (crewId: number) => {
    const crewSearchSchema = z.object({
        guild_id: z
            .string()
            .min(1)
            .transform((val) => parseInt(val)),
        guild_name: z.string(),
        introduction: z.string(),
        leader_name: z.string(),
        leader_user_id: z
            .string()
            .min(1)
            .transform((val) => parseInt(val)),
    });

    const response = (await gbf.get(`/guild_other/guild_info/${crewId}`).catch((err) => {
        console.log(err);
        return;
    })) as AxiosResponse;

    try {
        const crew = crewSearchSchema.parse(response.data);

        await prisma.gbfCrew.upsert({
            where: { id: crew.guild_id },
            update: {
                name: crew.guild_name,
                introduction: crew.introduction,
                leaderId: crew.leader_user_id,
            },
            create: {
                id: crew.guild_id,
                name: crew.guild_name,
                introduction: crew.introduction,
                leaderId: crew.leader_user_id,
            },
        });
        await updateCrewMembers(crewId);
    } catch (err) {
        console.log(err);
        return;
    }
};

export const updateCrewMembers = async (crewId: number) => {
    const crewMembersSchema = z.object({
        list: z.array(
            z.object({
                id: z
                    .string()
                    .min(1)
                    .transform((val) => parseInt(val)),
                name: z.string(),
                level: z.string().transform((val) => parseInt(val)),
                is_leader: z.boolean(),
                member_position: z.string().transform((val) => parseInt(val)),
            })
        ),
    });

    for (let page = 1; page <= 3; page++) {
        const response = (await gbf
            .get(`/guild_other/member_list/${page}/${crewId}`)
            .catch((err) => {
                console.log(err);
                return;
            })) as AxiosResponse;

        try {
            const memberPage = crewMembersSchema.parse(response.data);

            const query = memberPage.list.map((member) =>
                prisma.gbfPlayer.upsert({
                    where: { id: member.id },
                    update: {
                        nickname: member.name,
                        level: member.level,
                        crewPosition: member.member_position,
                        crewId: crewId,
                    },
                    create: {
                        id: member.id,
                        nickname: member.name,
                        level: member.level,
                        crewPosition: member.member_position,
                        crewId: crewId,
                    },
                })
            );
            await prisma.$transaction(query);
        } catch (err) {
            if (err instanceof ZodError) {
                console.log(`Crew ${crewId} is private`);
                return;
            }
            console.log(err);
            return;
        }
    }
};
