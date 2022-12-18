import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../types";
import { t } from "../trpcclient";
import { User } from "../types";
import { TRPCClientError } from "@trpc/client";

export const command: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName("getusers")
        .setDescription("Gets all users from database"),

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const response: User[] = await t.user.getUsers.query();
            await interaction.reply(response.map((user) => user.gbfId).join(", "));
        } catch (err) {
            if (err instanceof TRPCClientError) {
                await interaction.reply(err.message);
            }
        }
    },
};
