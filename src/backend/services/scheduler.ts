import { ToadScheduler, AsyncTask, CronJob } from "toad-scheduler";
import { updateCrewTracking, updateGWData } from "./gbf_collection";
import { GuildWar } from "../../discord/types";

export const initScrapeScheduler = (gw: GuildWar) => {
    const scheduler = new ToadScheduler();

    // fake concurrency to help with ping delays to gbf api
    for (let i = 0; i < 20; i++) {
        const task = new AsyncTask(`crewPageScrape${i * 40}`, async () => {
            await updateGWData(i * 40 + 1, (i + 1) * 40, gw);
            if (i === 19) {
                await updateCrewTracking(gw);
                console.log("Crew GW data updated");
            }
        });
        const job = new CronJob({ cronExpression: "5,25,45 * * * *" }, task, {
            preventOverrun: true,
        });
        scheduler.addCronJob(job);
    }

    return scheduler;
};
