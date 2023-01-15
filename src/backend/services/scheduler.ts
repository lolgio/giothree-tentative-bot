import { ToadScheduler, AsyncTask, CronJob } from "toad-scheduler";
import { getGuildWar, updateGWData, updateGWDay } from "./gbf_collection";
//import { setTimeout } from "timers/promises";

export const initScrapeScheduler = async () => {
    const scheduler = new ToadScheduler();

    const task = new AsyncTask(`crewPageScrape`, async () => {
        console.log("Updating Crew GW data...");
        const timeStart = Date.now();
        const crewPromises = [];
        for (let i = 1; i <= 800; i++) {
            crewPromises.push(updateGWData(i));
        }
        await Promise.all(crewPromises);
        console.log(`Crew GW data updated in ${Math.round((Date.now() - timeStart) / 1000)}s`);

        // console.log("Updating Player GW data...");
        // timeStart = Date.now();
        // const playerPromises = [];
        // for (let i = 1; i <= 8000; i++) {
        //     playerPromises.push(updateIndividualGWData(i, gw));
        //     if (i % 800 === 0) {
        //         await setTimeout(25000);
        //     }
        // }
        // await Promise.all(playerPromises);
        // console.log(`Player GW data updated in ${Math.round((Date.now() - timeStart) / 1000)}s`);
    });
    const job = new CronJob({ cronExpression: "5,25,47 * * * *" }, task, {
        preventOverrun: true,
        id: "crewPageScrape",
    });
    scheduler.addCronJob(job);

    await updateGWDay();
    const gw = getGuildWar();

    if (gw) {
        scheduler.startById("crewPageScrape");
        console.log(`GW ${gw.number} - Day ${gw.day} found`);
    } else {
        scheduler.stopById("crewPageScrape");
    }

    const checkGWTask = new AsyncTask("checkGW", async () => {
        await updateGWDay();
        const gw = getGuildWar();

        if (gw) {
            scheduler.startById("crewPageScrape");
            console.log(`GW ${gw.number} - Day ${gw.day} found`);
        } else {
            scheduler.stopById("crewPageScrape");
        }
    });
    const checkGWJob = new CronJob({ cronExpression: "0 * * * *" }, checkGWTask, {
        preventOverrun: true,
        id: "checkGW",
    });
    scheduler.addCronJob(checkGWJob);

    return scheduler;
};
