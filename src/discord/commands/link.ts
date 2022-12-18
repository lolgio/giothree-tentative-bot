import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../types";
import { t } from "../trpcclient";
import { TRPCClientError } from "@trpc/client";

export const command: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName("link")
        .setDescription("Link your Granblue Account to your Discord Account.")
        .addStringOption((option) =>
            option.setName("gbf_id").setDescription("Your Granblue ID").setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            await t.user.createUser.mutate({
                discordId: interaction.user.id,
                gbfId: interaction.options.getString("gbf_id") ?? "",
            });

            await interaction.reply("Successfully linked your account!");
        } catch (err) {
            if (err instanceof TRPCClientError) {
                await interaction.reply(err.message);
            }
        }
    },
};
