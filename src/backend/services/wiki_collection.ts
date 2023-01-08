import { PrismaClient } from "@prisma/client";
import axios, { AxiosResponse } from "axios";
import { parse, HTMLElement } from "node-html-parser";
import { z } from "zod";

const prisma = new PrismaClient();

const getWikiData = async () => {
    const response = (await axios.get("https://gbf.wiki/Main_Page").catch((err) => {
        console.log(err);
    })) as AxiosResponse;
    if (typeof response.data === "string") {
        return parse(response.data);
    }
    return null;
};

const parseEventData = (dataList: HTMLElement[], tooltipList: HTMLElement[]) => {
    const eventSchema = z.object({
        id: z.string(),
        title: z.string(),
        start: z.number().transform((val) => new Date(val * 1000)),
        end: z.number().transform((val) => new Date(val * 1000)),
        imgUrl: z.string().url(),
        wikiUrl: z.string().url(),
    });
    type Event = z.infer<typeof eventSchema>;

    const events: Event[] = [];
    for (let i = 0; i < dataList.length; i++) {
        const data = dataList[i];
        const tooltip = tooltipList[i];

        if (data && tooltip) {
            const title = data.getAttribute("alt");
            const imgUrl = "https://gbf.wiki" + data.getAttribute("src");
            const start = Number(tooltip.getAttribute("data-start"));
            const end = Number(tooltip.getAttribute("data-end"));
            const id = "" + title + start;
            const wikiUrl = "https://gbf.wiki" + data.parentNode.getAttribute("href");

            const event = eventSchema.parse({
                id,
                title,
                start,
                end,
                imgUrl,
                wikiUrl,
            });
            events.push(event);
        }
    }
    return events;
};

export const updateEventData = async () => {
    const dom = await getWikiData();
    if (!dom) {
        return;
    }

    const eventTable = dom.querySelector(".wikitable:first-of-type > tbody > tr:nth-child(8) > td");

    const dataList = eventTable?.querySelectorAll(":scope > a > img");
    if (eventTable?.querySelector(".gallery-swap-images")) {
        const galleryEvents = eventTable.querySelectorAll(".gallery-swap-images > a:first-of-type");
        galleryEvents.forEach((event) => {
            dataList?.push(event.getElementsByTagName("img")[0]);
        });
    }
    let tooltipList = eventTable?.querySelectorAll(".tooltip > span:first-of-type");
    if (!dataList || !tooltipList) {
        console.log("No Events Found");
        return;
    }
    if (tooltipList.length > dataList.length) {
        tooltipList = tooltipList.slice(tooltipList.length - dataList.length);
    }

    const events = parseEventData(dataList, tooltipList);

    const query = events.map((event) =>
        prisma.gbfEvent.upsert({
            where: { id: event.id },
            update: {
                title: event.title,
                startDate: event.start,
                endDate: event.end,
                imgUrl: event.imgUrl,
                wikiUrl: event.wikiUrl,
            },
            create: {
                id: event.id,
                title: event.title,
                startDate: event.start,
                endDate: event.end,
                imgUrl: event.imgUrl,
                wikiUrl: event.wikiUrl,
            },
        })
    );
    console.log(`Successfully Updated ${events.length} Events`);
    await prisma.$transaction(query);
};
