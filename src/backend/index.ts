import express from "express";
import { TRPCError, inferAsyncReturnType, initTRPC } from "@trpc/server";
import { userRouter } from "./routes/user";
import * as trpcExpress from "@trpc/server/adapters/express";
import { updateEventData } from "./services/wiki_collection";
import { gbfRouter } from "./routes/gbf";
import { getGWDay, initializeAxiosGbf, updateGWData } from "./services/gbf_collection";
import { initScrapeScheduler } from "./services/scheduler";

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
    gbf: gbfRouter,
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

    initScrapeScheduler();
    await updateEventData();

    const gw = await getGWDay();
    if (gw) {
        await updateGWData(1, gw);
    }
})();
