import { EmbedBuilder, AttachmentBuilder } from "discord.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { t } from "../trpcclient";
import { TrackedGWData } from "../types";

const calculateSpeed = (data: TrackedGWData[]) => {
    const speedData: { time: number; speed: number }[] = [];

    for (let i = 0; i < data.length - 1; i++) {
        const time = new Date(data[i + 1].createdAt).getTime();
        const speed = Math.max(
            0,
            (data[i + 1].totalHonors - data[i].totalHonors) /
                ((time - new Date(data[i].createdAt).getTime()) / 1000 / 60 / 60)
        );
        speedData.push({ time, speed });
    }

    return speedData;
};

type SpeedData = { time: number; speed: number }[];

const generateChart = async (
    gwData: TrackedGWData[],
    speedData: SpeedData
): Promise<AttachmentBuilder> => {
    const renderer = new ChartJSNodeCanvas({ width: 800, height: 400 });
    const chart = await renderer.renderToBuffer({
        type: "line",
        data: {
            labels: gwData.map((d) =>
                new Date(d.createdAt).toLocaleString("en-US", {
                    timeZone: "Asia/Tokyo",
                    hour12: false,
                    hour: "numeric",
                    minute: "numeric",
                    second: "numeric",
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
                    data: [0].concat(speedData.map((d) => d.speed)),
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
    gwNumber: number
): Promise<{ embeds: EmbedBuilder[]; files: AttachmentBuilder[] }> => {
    const embed = new EmbedBuilder();
    const crew = await t.gbf.getCrew.query(crewId);
    let gwData = await t.gbf.getTrackedGWData.query(crewId);
    gwData = gwData.filter((d) => d.gwNumber === gwNumber);
    const speedData = calculateSpeed(gwData);
    const chart = await generateChart(gwData, speedData);

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
                value: gwData[gwData.length - 1].totalHonors.toLocaleString(),
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
