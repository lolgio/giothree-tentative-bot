import axios, { AxiosRequestConfig } from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import { z } from "zod";
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/../../../.env" });

const cookieJar = new CookieJar();
cookieJar.setCookieSync(`midship=${process.env.GBF_MIDSHIP}`, "https://game.granbluefantasy.jp");

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

const gbf = wrapper(axios.create(config));

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
        job_id: z.string(),
        level: z.string(),
        nickname: z.string(),
    });

    const response = await gbf
        .post("/friend/search_friends_id", {
            user_id: playerId,
        })
        .catch((err) => {
            console.log(err);
        });

    if (!response) {
        return null;
    }
    if (typeof response.data === "object") {
        try {
            return userSearchSchema.parse(response.data);
        } catch (err) {
            return null;
        }
    }
};

// void (async () => {
//     const user = await getPlayerData("20258108");
//     console.log(user);
// })();
