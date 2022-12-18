import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { RouterOutput } from "./trpcclient";

//discord types
export type SlashCommand = {
    data: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
    execute: (interaction: ChatInputCommandInteraction) => void | Promise<void>;
};

export type SlashCommandFile = {
    command: SlashCommand;
};

//trpc types
export type User = RouterOutput["user"]["getUser"];
