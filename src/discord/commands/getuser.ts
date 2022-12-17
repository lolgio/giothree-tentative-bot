import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../types";
import { TRPCClient } from "../trpcclient";

export const command: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName("getusers")
        .setDescription("Gets all users from database"),

    async execute(interaction: ChatInputCommandInteraction) {
        const response = await TRPCClient.user.getUsers.query();

        if (response) {
            await interaction.reply(response.map((user) => user.gbfId).join(", "));
        } else {
            await interaction.reply("Failed to get Users!");
        }
    },
};
