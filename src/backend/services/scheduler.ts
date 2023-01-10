import { ToadScheduler, AsyncTask, CronJob } from "toad-scheduler";
import { updateGWData } from "./gbf_collection";
import { GuildWar } from "../../discord/types";

export const initScrapeScheduler = (gw: GuildWar) => {
    const scheduler = new ToadScheduler();

    const task = new AsyncTask("crewPageScrape", async () => {
        console.log("Updating guild war data...");
        await updateGWData(1, gw);
        console.log("Succesfully Updated guild war data.");
    });
    const job = new CronJob({ cronExpression: "5,25,45 * * * *" }, task, {
        preventOverrun: true,
    });
    scheduler.addCronJob(job);

    return scheduler;
};
