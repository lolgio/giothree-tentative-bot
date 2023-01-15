import { EmbedBuilder, AttachmentBuilder } from "discord.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { t } from "../trpcclient";
import { TrackedGWData } from "../types";
import { GuildWarDay } from "../../shared/types";

type ChartData = {
    time: number;
    totalHonors: number;
};

const calculateSpeed = (data: ChartData[]) => {
    const speedData: { time: number; speed: number }[] = [];

    for (let i = 0; i < data.length - 1; i++) {
        const time = new Date(data[i + 1].time).getTime();
        const speed = Math.max(
            0,
            (data[i + 1].totalHonors - data[i].totalHonors) /
                ((time - new Date(data[i].time).getTime()) / 1000 / 60 / 60)
        );
        speedData.push({ time, speed });
    }

    return speedData;
};

const convertToChartData = async (
    gwData: TrackedGWData,
    day: number,
    gwNumber: number
): Promise<ChartData[]> => {
    const guildWar = await t.gbf.getGuildWar.query(gwNumber);
    const finalsStart = Date.parse(guildWar.finalsStart);
    gwData = gwData.filter((d) => {
        if (day === 0) {
            return d.gwNumber === gwNumber && d.time < finalsStart;
        } else {
            return (
                d.gwNumber === gwNumber &&
                d.time < finalsStart + 24 * 60 * 60 * 1000 * day &&
                d.time >= finalsStart + 24 * 60 * 60 * 1000 * (day - 1)
            );
        }
    });

    const dayData: ChartData[] = gwData.map((d) => ({
        time: d.time,
        totalHonors: d.totalHonors,
    }));

    return dayData;
};

type SpeedData = { time: number; speed: number }[];

const generateChart = async (
    gwData: ChartData[],
    speedData: SpeedData
): Promise<AttachmentBuilder> => {
    const renderer = new ChartJSNodeCanvas({ width: 800, height: 400 });
    const chart = await renderer.renderToBuffer({
        type: "line",
        data: {
            labels: gwData.map((d) =>
                new Date(d.time).toLocaleString("en-US", {
                    timeZone: "Asia/Tokyo",
                    hour12: false,
                    hour: "numeric",
                    minute: "numeric",
                })
            ),
            datasets: [
                {
                    label: "Total Honors",
                    data: gwData.map((d) => d.totalHonors),
                    yAxisID: "y",
                    borderColor: "#f7766d",
                    backgroundColor: "#f7766d",
                },
                {
                    label: "Speed",
                    data: [0, ...speedData.map((d) => d.speed)],
                    yAxisID: "y1",
                    borderColor: "#f7b26d",
                    backgroundColor: "#f7b26d",
                    borderDash: [5, 5],
                },
            ],
        },
        options: {
            scales: {
                y: {
                    type: "linear",
                    display: true,
                    position: "left",
                },
                y1: {
                    type: "linear",
                    display: true,
                    position: "right",
                    grid: {
                        drawOnChartArea: false,
                    },
                },
            },
            plugins: {
                legend: {
                    position: "bottom",
                },
            },
        },
    });
    return new AttachmentBuilder(chart, { name: "chart.png" });
};

const generateCompareChart = async (
    crewName1: string,
    crewName2: string,
    gwData1: ChartData[],
    gwData2: ChartData[],
    speedData1: SpeedData,
    speedData2: SpeedData
): Promise<AttachmentBuilder> => {
    const renderer = new ChartJSNodeCanvas({ width: 800, height: 400 });
    const chart = await renderer.renderToBuffer({
        type: "line",
        data: {
            labels: gwData1.map((d) =>
                new Date(d.time).toLocaleString("en-US", {
                    timeZone: "Asia/Tokyo",
                    hour12: false,
                    hour: "numeric",
                    minute: "numeric",
                })
            ),
            datasets: [
                {
                    label: `Total Honors (${crewName1})`,
                    data: gwData1.map((d) => d.totalHonors),
                    yAxisID: "y",
                    borderColor: "#f7766d",
                    backgroundColor: "#f7766d",
                },
                {
                    label: `Speed (${crewName1})`,
                    data: [0, ...speedData1.map((d) => d.speed)],
                    yAxisID: "y1",
                    borderColor: "#f7b26d",
                    backgroundColor: "#f7b26d",
                    borderDash: [5, 5],
                },
                {
                    label: `Total Honors (${crewName2})`,
                    data: gwData2.map((d) => d.totalHonors),
                    yAxisID: "y",
                    borderColor: "#589cc7",
                    backgroundColor: "#589cc7",
                },
                {
                    label: `Speed (${crewName2})`,
                    data: [0, ...speedData2.map((d) => d.speed)],
                    yAxisID: "y1",
                    borderColor: "#5863c7",
                    backgroundColor: "#5863c7",
                    borderDash: [5, 5],
                },
            ],
        },
        options: {
            scales: {
                y: {
                    type: "linear",
                    display: true,
                    position: "left",
                },
                y1: {
                    type: "linear",
                    display: true,
                    position: "right",
                    grid: {
                        drawOnChartArea: false,
                    },
                },
            },
            plugins: {
                legend: {
                    position: "bottom",
                },
            },
        },
    });
    return new AttachmentBuilder(chart, { name: "chart.png" });
};

export const generateEmbed = async (
    crewId: number,
    gwNumber: number,
    day: GuildWarDay,
    compareId?: number
): Promise<{ embeds: EmbedBuilder[]; files: AttachmentBuilder[] }> => {
    const embed = new EmbedBuilder();
    const crew = await t.gbf.getCrew.query(crewId);
    const gwData: TrackedGWData = await t.gbf.getTrackedGWData.query(crewId);
    const dayData = await convertToChartData(gwData, day, gwNumber);
    const initialHonor = dayData[0].totalHonors;
    dayData.forEach((d) => (d.totalHonors -= initialHonor));
    const speedData = calculateSpeed(dayData);

    const speedAverage =
        (dayData[0].totalHonors - dayData[dayData.length - 1].totalHonors) /
        ((dayData[0].time - dayData[dayData.length - 1].time) / 1000 / 60 / 60);
    const speedLastHour = speedData.filter((d) => d.time > Date.now() - 1000 * 60 * 60);
    const speedAverageLastHour =
        speedLastHour.reduce((a, b) => a + b.speed, 0) / speedLastHour.length;

    embed
        .setTitle(`GW Data for: ${crew.name}`)
        .setDescription(`Guild War ${gwNumber} - ${day === 0 ? "Prelims" : "Day " + day}`)
        .setImage("attachment://chart.png");
    if (compareId) {
        embed.addFields({
            name: " ",
            value: `**${crew.name}**`,
        });
    }
    embed.addFields(
        {
            name: "Honors",
            value: dayData[dayData.length - 1].totalHonors.toLocaleString(),
            inline: true,
        },
        {
            name: "Average Speed (Total)",
            value: Math.trunc(speedAverage).toLocaleString() + " /hr",
            inline: true,
        },
        {
            name: "Average Speed (Last Hr)",
            value: Math.trunc(speedAverageLastHour).toLocaleString() + " /hr",
            inline: true,
        }
    );

    let chart: AttachmentBuilder;
    if (compareId) {
        const crewCompare = await t.gbf.getCrew.query(compareId);
        const gwDataCompare: TrackedGWData = await t.gbf.getTrackedGWData.query(compareId);
        const dayDataCompare = await convertToChartData(gwDataCompare, day, gwNumber);
        console.log(dayDataCompare);
        const initialHonorCmp = dayDataCompare[0].totalHonors;
        dayDataCompare.forEach((d) => (d.totalHonors -= initialHonorCmp));

        const speedDataCompare = calculateSpeed(dayDataCompare);
        chart = await generateCompareChart(
            crew.name,
            crewCompare.name,
            dayData,
            dayDataCompare,
            speedData,
            speedDataCompare
        );

        const speedAverageCmp =
            (dayDataCompare[0].totalHonors -
                dayDataCompare[dayDataCompare.length - 1].totalHonors) /
            ((dayDataCompare[0].time - dayDataCompare[dayDataCompare.length - 1].time) /
                1000 /
                60 /
                60);
        const speedLastHourCmp = speedDataCompare.filter(
            (d) => d.time > Date.now() - 1000 * 60 * 60
        );
        const speedAverageLastHourCmp =
            speedLastHourCmp.reduce((a, b) => a + b.speed, 0) / speedLastHourCmp.length;

        embed.setTitle(`GW Data for: ${crew.name} vs ${crewCompare.name}`);
        embed.addFields(
            {
                name: " ",
                value: `**${crewCompare.name}**`,
            },
            {
                name: "Honors",
                value: dayDataCompare[dayDataCompare.length - 1].totalHonors.toLocaleString(),
                inline: true,
            },
            {
                name: "Average Speed (Total)",
                value: Math.trunc(speedAverageCmp).toLocaleString() + " /hr",
                inline: true,
            },
            {
                name: "Average Speed (Last Hr)",
                value: Math.trunc(speedAverageLastHourCmp).toLocaleString() + " /hr",
                inline: true,
            },
            {
                name: " ",
                value: "⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯",
            },
            {
                name: "Honors Diff",
                value: (
                    dayData[dayData.length - 1].totalHonors -
                    dayDataCompare[dayDataCompare.length - 1].totalHonors
                ).toLocaleString(),
                inline: true,
            },
            {
                name: "Av. Speed Diff (Total)",
                value: Math.trunc(speedAverage - speedAverageCmp).toLocaleString() + " /hr",
                inline: true,
            },
            {
                name: "Av. Speed Diff (Last Hr)",
                value:
                    Math.trunc(speedAverageLastHour - speedAverageLastHourCmp).toLocaleString() +
                    " /hr",
                inline: true,
            }
        );
    } else {
        chart = await generateChart(dayData, speedData);
    }

    return { embeds: [embed], files: [chart] };
};
