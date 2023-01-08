import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { RouterOutput } from "./trpcclient";

//discord types
export interface SlashCommand {
    data: SlashCommandBuilder;
    execute: (interaction: ChatInputCommandInteraction) => void | Promise<void>;
}

export type SlashCommandFile = {
    command: SlashCommand;
};

//gbf types
const GuildWarDay = {
    0: "prelim",
    1: "day1",
    2: "day2",
    3: "day3",
    4: "day4",
    99: "interlude",
};
export type GuildWarDay = keyof typeof GuildWarDay;
export type TrackedGWData = {
    createdAt: string;
    crewId: number;
    gwNumber: number;
    totalHonors: number;
};

//trpc types
export type User = RouterOutput["user"]["getUser"];
