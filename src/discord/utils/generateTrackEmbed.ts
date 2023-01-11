import { EmbedBuilder, AttachmentBuilder } from "discord.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { t } from "../trpcclient";
import { GuildWarDay, TrackedGWData } from "../types";

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
        },
    });
    return new AttachmentBuilder(chart, { name: "chart.png" });
};

export const generateEmbed = async (
    crewId: number,
    gwNumber: number,
    day: GuildWarDay
): Promise<{ embeds: EmbedBuilder[]; files: AttachmentBuilder[] }> => {
    const embed = new EmbedBuilder();
    const crew = await t.gbf.getCrew.query(crewId);
    const guildWar = await t.gbf.getGuildWar.query(65);
    const finalsStart = Date.parse(guildWar.finalsStart);
    let gwData: TrackedGWData = await t.gbf.getTrackedGWData.query(crewId);

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
    if (!gwData) {
        throw new Error(`No Tracked Data found for ${crewId} in Guild war ${gwNumber}`);
    }

    const dayData: ChartData[] = gwData.map((d) => ({
        time: d.time,
        totalHonors:
            day === 0
                ? d.preliminaries
                : day === 1
                ? d.day1
                : day === 2
                ? d.day2
                : day === 3
                ? d.day3
                : d.day4,
    }));
    const speedData = calculateSpeed(dayData);
    const chart = await generateChart(dayData, speedData);

    const speedAverage = speedData.reduce((a, b) => a + b.speed, 0) / speedData.length;
    const speedLastHour = speedData.filter((d) => d.time > Date.now() - 1000 * 60 * 60);
    const speedAverageLastHour =
        speedLastHour.reduce((a, b) => a + b.speed, 0) / speedLastHour.length;

    embed
        .setTitle(`GW Data for: ${crew.name}`)
        .setDescription(`Guild War ${gwNumber}`)
        .setImage("attachment://chart.png")
        .addFields(
            {
                name: "Honors (Total)",
                value: dayData[dayData.length - 1].totalHonors.toLocaleString(),
            },
            {
                name: "Average Speed (Total)",
                value: Math.trunc(speedAverage).toLocaleString() + " /hr",
                inline: true,
            },
            {
                name: "Average Speed (Last Hour)",
                value: Math.trunc(speedAverageLastHour).toLocaleString() + " /hr",
            }
        );

    return { embeds: [embed], files: [chart] };
};
