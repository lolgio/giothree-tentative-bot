import express from "express";
import { TRPCError, inferAsyncReturnType, initTRPC } from "@trpc/server";
import { userRouter } from "./routes/user";
import * as trpcExpress from "@trpc/server/adapters/express";
import { getGameVersion, initializeAxiosGbf } from "./services/gbf";

const app = express();
const port = process.env.BACKEND_PORT;

const createContext = ({ req, res }: trpcExpress.CreateExpressContextOptions) => {
    return {
        req,
        res,
    };
};
type Context = inferAsyncReturnType<typeof createContext>;

const t = initTRPC.context<Context>().create({});
const appRouter = t.router({
    user: userRouter,
});

export type AppRouter = typeof appRouter;

app.use((req, _res, next) => {
    console.log("⬅️ ", req.method, req.path, req.body ?? req.query);

    next();
});

app.use(
    "/trpc",
    trpcExpress.createExpressMiddleware({
        router: appRouter,
        createContext,
        onError: ({ error: err }) => {
            if (err instanceof TRPCError) {
                console.log(`TRPC Error: ${err.code} - ${err.message}`);
            } else {
                console.log("Unknown Error");
            }
        },
    })
);

void (async () => {
    await initializeAxiosGbf();

    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });

    const gbfVersion = await getGameVersion().catch((err: unknown) => {
        console.log("Unable to Retrieve GBF Version, Check for Maintenance or Invalid Cookies");
        if (err instanceof Error) {
            console.log(err.message);
        }
    });

    console.log(`GBF Version: ${gbfVersion}`);
})();
