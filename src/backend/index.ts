import express from "express";
import { inferAsyncReturnType, initTRPC } from "@trpc/server";
import { userRouter } from "./routes/user";
import * as trpcExpress from "@trpc/server/adapters/express";

const app = express();
const port = process.env.BACKEND_PORT;

const createContext = ({ req, res }: trpcExpress.CreateExpressContextOptions) => {
    return {
        req,
        res,
    };
};
type Context = inferAsyncReturnType<typeof createContext>;

const t = initTRPC.context<Context>().create({
    errorFormatter: (err) => {
        console.error(err);
    },
});
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
    })
);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
