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

            const event = eventSchema.parse({
                id,
                title,
                start,
                end,
                imgUrl,
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

    const eventTable = dom
        .querySelector(".wikitable")
        ?.getElementsByTagName("tbody")[0]
        .getElementsByTagName("tr")[9]
        .getElementsByTagName("td")[0];

    const dataList = eventTable
        ?.querySelectorAll(":scope > a")
        .map((a) => a.getElementsByTagName("img")[0]);
    if (eventTable?.querySelector(".gallery-swap-images")) {
        const galleryEvents = eventTable
            .querySelectorAll(".gallery-swap-images")
            .map((a) => a.getElementsByTagName("a")[0]);
        galleryEvents.forEach((event) => {
            dataList?.push(event.getElementsByTagName("img")[0]);
        });
    }
    const tooltipList = eventTable
        ?.querySelectorAll(".tooltip")
        .map((a) => a.getElementsByTagName("span")[0]);
    if (!dataList || !tooltipList) {
        console.log("No Events Found");
        return;
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
            },
            create: {
                id: event.id,
                title: event.title,
                startDate: event.start,
                endDate: event.end,
                imgUrl: event.imgUrl,
            },
        })
    );
    console.log(`Successfully Updated ${events.length} Events`);
    await prisma.$transaction(query);
};
