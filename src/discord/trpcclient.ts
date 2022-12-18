import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../backend";
import { inferRouterOutputs } from "@trpc/server";

export type RouterOutput = inferRouterOutputs<AppRouter>;

export const t = createTRPCProxyClient<AppRouter>({
    links: [
        httpBatchLink({
            url: "http://localhost:7373/trpc",
        }),
    ],
});

export type ClientType = typeof t;
