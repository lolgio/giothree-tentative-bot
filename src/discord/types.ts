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
};
export type GuildWarDay = keyof typeof GuildWarDay;

export type GuildWar = {
    number: number;
    day: GuildWarDay;
};

//trpc types
export type User = RouterOutput["user"]["getUser"];
export type TrackedGWData = RouterOutput["gbf"]["getTrackedGWData"];
