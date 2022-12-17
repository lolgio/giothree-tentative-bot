import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../backend";

export const TRPCClient = createTRPCProxyClient<AppRouter>({
    links: [
        httpBatchLink({
            url: "http://localhost:7373/trpc",
        }),
    ],
});

export type ClientType = typeof TRPCClient;
