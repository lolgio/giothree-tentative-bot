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
dotenv.config({ path: __dirname + "/../../../.env" });

const prisma = new PrismaClient();

interface GbfInstance extends AxiosInstance {
    uid?: number;
}

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

    const cookieJar = new CookieJar();
    await cookieJar.setCookie(account.midship, "https://game.granbluefantasy.jp");
    await cookieJar.setCookie(account.wing, "https://game.granbluefantasy.jp");

    config = {
        baseURL: "https://game.granbluefantasy.jp",
        headers: {
            "Accept-Encoding": "gzip, deflate, br",
            Connection: "keep-alive",
            "X-Version": gbfVersion,
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
            Accept: "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
        },
        jar: cookieJar,
    };

    gbf = wrapper(axios.create(config));
    gbf.uid = Number(account.uid);
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
