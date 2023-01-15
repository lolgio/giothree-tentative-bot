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

//trpc types
export type User = RouterOutput["user"]["getUser"];
export type TrackedGWData = RouterOutput["gbf"]["getTrackedGWData"];
