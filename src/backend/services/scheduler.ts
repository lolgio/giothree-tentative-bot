import { ToadScheduler, AsyncTask, CronJob } from "toad-scheduler";
import { updateCrewData } from "./gbf_collection";

const trackedCrews = [1470346];

export const initScrapeScheduler = () => {
    const scheduler = new ToadScheduler();
    const task = new AsyncTask("crewPageScrape", async () => {
        const promises = trackedCrews.map(async (crewId) => {
            await updateCrewData(crewId);
            console.log(`Updated crew data for: ${crewId}`);
        });
        await Promise.all(promises);
    });
    const job = new CronJob({ cronExpression: "5,25,45 * * * *" }, task, {
        preventOverrun: true,
    });
    scheduler.addCronJob(job);

    return scheduler;
};
