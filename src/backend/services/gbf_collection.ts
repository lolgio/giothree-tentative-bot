import axios, {
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    AxiosResponseHeaders,
} from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import { ZodError, z } from "zod";
import * as dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { GuildWar, GuildWarDay } from "../../discord/types";
dotenv.config({ path: __dirname + "/../../../.env" });

const prisma = new PrismaClient();

interface GbfInstance extends AxiosInstance {
    uid?: number;
}

const trackedCrews = [1470346, 1791427];

let gbf: GbfInstance;
let config: AxiosRequestConfig;
export const initializeAxiosGbf = async () => {
    const account = await prisma.dataAccount.findFirst();
    if (!account) {
        console.log("No Accounts Found in Database");
        return;
    }

    const gbfVersion = (await getGameVersion().catch((_) => {
        console.log("Unable to Retrieve GBF Version, Check for Maintenance or Invalid Cookies");
        return;
    })) as string;

    console.log("GBF Version: " + gbfVersion);

    const cookieJar = new CookieJar();
    await cookieJar.setCookie(account.midship, "https://game.granbluefantasy.jp");
    await cookieJar.setCookie(account.wing, "https://game.granbluefantasy.jp");

    config = {
        baseURL: "https://game.granbluefantasy.jp",
        headers: {
            "Accept-Encoding": "gzip, deflate, br",
            Connection: "keep-alive",
            "X-Version": gbfVersion,
            "User-Agent": account.ua,
            Accept: "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
        },
        jar: cookieJar,
    };

    gbf = wrapper(axios.create(config));
    gbf.uid = Number(account.uid);
};

export const getGWDay = async (): Promise<GuildWar | null> => {
    const now = new Date();
    const gw = await prisma.guildWar.findFirst({
        where: {
            prelimStart: {
                lte: now,
            },
            end: {
                gte: now,
            },
        },
    });

    if (!gw) {
        return null;
    }

    if (now < gw.finalsStart) {
        return {
            number: gw.number,
            day: 0,
        };
    } else {
        const day =
            Math.floor((now.getTime() - gw.finalsStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return {
            number: gw.number,
            day: day as GuildWarDay,
        };
    }
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

const refreshCookies = async (headers: AxiosResponseHeaders) => {
    if (!headers["set-cookie"]) {
        return;
    }
    const promises = headers["set-cookie"].map(async (cookie: string) => {
        await config.jar?.setCookie(cookie, "https://game.granbluefantasy.jp");
        if (cookie.includes("midship")) {
            await prisma.dataAccount.update({
                where: { uid: String(gbf.uid) },
                data: {
                    midship: cookie,
                },
            });
        } else if (cookie.includes("wing")) {
            await prisma.dataAccount.update({
                where: { uid: String(gbf.uid) },
                data: {
                    wing: cookie,
                },
            });
        }
    });

    await Promise.all(promises);
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
        await refreshCookies(response.headers as AxiosResponseHeaders);
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

    const response = (await gbf
        .get(
            `/guild_other/guild_info/${crewId}?_=${Date.now()}&t=${Date.now() + 100}&uid=${gbf.uid}`
        )
        .catch((err) => {
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
        await refreshCookies(response.headers as AxiosResponseHeaders);
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
            .get(
                `/guild_other/member_list/${page}/${crewId}?_=${Date.now()}&t=${
                    Date.now() + 100
                }&uid=${gbf.uid}`
            )
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

const gwRankingSchema = z.object({
    count: z.string(),
    last: z.number().min(1),
    next: z.number().min(1),
    prev: z.number().min(1),
    list: z.array(
        z.object({
            id: z
                .string()
                .min(1)
                .transform((val) => parseInt(val)),
            name: z.string(),
            point: z.string().transform((val) => parseInt(val)),
            ranking: z.string().transform((val) => parseInt(val)),
        })
    ),
});

export const updateGWData = async (page: number, gw: GuildWar) => {
    const response = (await gbf
        .get(
            `/teamraid0${gw.number}/rest/ranking/${
                gw.day === 0 ? "guild" : "totalguild"
            }/detail/${page}/0?_=${Date.now()}&t=${Date.now() + 100}&uid=${gbf.uid}`
        )
        .catch((err) => {
            console.log(err);
            return;
        })) as AxiosResponse;

    try {
        const pageData = gwRankingSchema.parse(response.data);

        await prisma.gbfCrew.createMany({
            data: pageData.list.map((crew) => ({
                id: crew.id,
                name: crew.name,
            })),
            skipDuplicates: true,
        });

        const query = pageData.list.map((crew) =>
            prisma.gbfCrewGWData.upsert({
                where: {
                    id: {
                        crewId: crew.id,
                        gwNumber: gw.number,
                    },
                },
                update:
                    gw.day === 0
                        ? {
                              preliminaries: crew.point,
                              ranking: crew.ranking,
                          }
                        : gw.day === 1
                        ? {
                              day1: crew.point,
                              ranking: crew.ranking,
                          }
                        : gw.day === 2
                        ? {
                              day2: crew.point,
                              ranking: crew.ranking,
                          }
                        : gw.day === 3
                        ? {
                              day3: crew.point,
                              ranking: crew.ranking,
                          }
                        : gw.day === 4
                        ? {
                              day4: crew.point,
                              ranking: crew.ranking,
                          }
                        : {},
                create: {
                    crewId: crew.id,
                    gwNumber: gw.number,
                    preliminaries: crew.point,
                    ranking: crew.ranking,
                },
            })
        );
        await prisma.$transaction(query);
    } catch (err) {
        console.log(err);
        return;
    }
};

export const updateCrewTracking = async (gw: GuildWar): Promise<void> => {
    const time = new Date(
        Math.floor((Date.now() - 1000 * 60 * 5) / (1000 * 60 * 20)) * 1000 * 60 * 20 + 1000 * 60 * 5
    );
    for (let i = 0; i < trackedCrews.length; i++) {
        const data = await prisma.gbfCrewGWData.findUnique({
            where: {
                id: {
                    crewId: trackedCrews[i],
                    gwNumber: gw.number,
                },
            },
        });
        if (data) {
            await prisma.gbfTrackedCrewData.upsert({
                where: {
                    id: {
                        crewId: trackedCrews[i],
                        gwNumber: gw.number,
                        time: time,
                    },
                },
                update: {},
                create: {
                    time: time,
                    ...data,
                },
            });
        }
    }
};

const gwIndividualSchema = z.object({
    list: z.array(
        z.object({
            rank: z.string().transform((val) => parseInt(val)),
            user_id: z.string().transform((val) => parseInt(val)),
            level: z.string().transform((val) => parseInt(val)),
            name: z.string(),
            point: z.string().transform((val) => parseInt(val)),
        })
    ),
});

export const updateIndividualGWData = async (page: number, gw: GuildWar) => {
    const response = (await gbf
        .get(
            `/teamraid0${gw.number}/rest_ranking_user/detail/${page}/0?_=${Date.now()}&t=${
                Date.now() + 100
            }&uid=${gbf.uid}`
        )
        .catch((err) => {
            console.log(err);
            return;
        })) as AxiosResponse;

    try {
        const pageData = gwIndividualSchema.parse(response.data);

        await prisma.gbfPlayer.createMany({
            data: pageData.list.map((player) => ({
                id: player.user_id,
                nickname: player.name,
                level: player.level,
            })),
            skipDuplicates: true,
        });

        const query = pageData.list.map((player) =>
            prisma.gbfPlayerGWData.upsert({
                where: {
                    id: {
                        playerId: player.user_id,
                        gwNumber: gw.number,
                    },
                },
                update:
                    gw.day === 0
                        ? {
                              preliminaries: player.point,
                              ranking: player.rank,
                          }
                        : gw.day === 1
                        ? {
                              day1: player.point,
                              ranking: player.rank,
                          }
                        : gw.day === 2
                        ? {
                              day2: player.point,
                              ranking: player.rank,
                          }
                        : gw.day === 3
                        ? {
                              day3: player.point,
                              ranking: player.rank,
                          }
                        : gw.day === 4
                        ? {
                              day4: player.point,
                              ranking: player.rank,
                          }
                        : {},
                create: {
                    playerId: player.user_id,
                    gwNumber: gw.number,
                    preliminaries: player.point,
                    ranking: player.rank,
                },
            })
        );
        await prisma.$transaction(query);
    } catch (err) {
        console.log(err);
        return;
    }
};
