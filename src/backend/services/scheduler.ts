import { ToadScheduler, AsyncTask, CronJob } from "toad-scheduler";
import { updateCrewTracking, updateGWData } from "./gbf_collection";
import { GuildWar } from "../../discord/types";

export const initScrapeScheduler = (gw: GuildWar) => {
    const scheduler = new ToadScheduler();

    const task = new AsyncTask(`crewPageScrape`, async () => {
        const promises = [];
        for (let i = 1; i <= 800; i++) {
            promises.push(updateGWData(i, gw));
        }
        await Promise.all(promises);
        await updateCrewTracking(gw);
        console.log("Crew GW data updated");
    });
    const job = new CronJob({ cronExpression: "5,25,45 * * * *" }, task, {
        preventOverrun: true,
    });
    scheduler.addCronJob(job);

    return scheduler;
};
