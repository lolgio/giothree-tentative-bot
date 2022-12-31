import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { SlashCommand } from "../types";
import { t } from "../trpcclient";
import { TRPCClientError } from "@trpc/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";

export const command: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName("gbf")
        .setDescription("Granblue Fantasy Commands")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("link")
                .setDescription("Link your Granblue Account to your Discord Account.")
                .addStringOption((option) =>
                    option.setName("gbf_id").setDescription("Your Granblue ID").setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("events")
                .setDescription("Get the current events in Granblue Fantasy.")
        )
        .addSubcommandGroup((group) =>
            group
                .setName("find")
                .setDescription("Find a gbf player or crew.")
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("player")
                        .setDescription("Find a player by their ID.")
                        .addNumberOption((option) =>
                            option
                                .setName("id")
                                .setDescription("The Granblue ID of the player.")
                                .setRequired(true)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("crew")
                        .setDescription("Find a crew by their ID.")
                        .addNumberOption((option) =>
                            option
                                .setName("id")
                                .setDescription("The Granblue ID of the crew.")
                                .setRequired(true)
                        )
                )
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        if (interaction.options.getSubcommand() === "link") {
            try {
                await interaction.deferReply({ ephemeral: true });
                await t.user.createUser.mutate({
                    discordId: interaction.user.id,
                    gbfId: interaction.options.getString("gbf_id") ?? "",
                });
                await interaction.editReply("Successfully linked your account!");
            } catch (err) {
                if (err instanceof TRPCClientError) {
                    if (err.cause instanceof PrismaClientKnownRequestError && err.meta) {
                        const target: string[] = err.meta.target as string[];
                        if (target.includes("discordId")) {
                            await interaction.editReply(
                                "Your Discord account already has a GBF Account Linked!\nUse /unlink first."
                            );
                        } else {
                            await interaction.editReply(
                                "The GBF ID is already linked to another Discord account!"
                            );
                        }
                        return;
                    }
                    await interaction.editReply(err.message);
                }
            }
        }
        if (interaction.options.getSubcommand() === "events") {
            try {
                await interaction.deferReply({ ephemeral: true });
                const events = await t.gbf.getCurrentEvents.query();

                type Event = typeof events[0];

                const eventEmbeds = events.map((event: Event) => {
                    return new EmbedBuilder()
                        .setTitle(event.title)
                        .setURL(event.wikiUrl)
                        .setImage(event.imgUrl)
                        .addFields(
                            {
                                name: "Start",
                                value: `<t:${Date.parse(event.startDate) / 1000}:R>`,
                                inline: true,
                            },
                            {
                                name: "End",
                                value: `<t:${Date.parse(event.endDate) / 1000}:R>`,
                                inline: true,
                            }
                        );
                });
                await interaction.editReply({
                    embeds: eventEmbeds,
                });
            } catch (err) {
                if (err instanceof TRPCClientError) {
                    await interaction.editReply("No Events found!");
                }
            }
        }
        if (interaction.options.getSubcommandGroup() === "find") {
            if (interaction.options.getSubcommand() === "player") {
                try {
                    await interaction.deferReply({ ephemeral: true });
                    const player = await t.gbf.getPlayer.query(
                        interaction.options.getNumber("id") ?? 0
                    );

                    await interaction.editReply({
                        embeds: [
                            {
                                title: player.nickname,
                                description: `ID: ${player.id}`,
                                fields: [
                                    {
                                        name: "Rank",
                                        value: player.level.toString(),
                                        inline: true,
                                    },
                                    {
                                        name: "Crew",
                                        value: player.crewId?.toString() ?? "None",
                                        inline: true,
                                    },
                                ],
                            },
                        ],
                    });
                } catch (err) {
                    if (err instanceof TRPCClientError) {
                        await interaction.editReply("No player found!");
                    }
                }
            }
            if (interaction.options.getSubcommand() === "crew") {
                try {
                    await interaction.deferReply({ ephemeral: true });
                    const crew = await t.gbf.getCrew.query(
                        interaction.options.getNumber("id") ?? 0
                    );

                    await interaction.editReply({
                        embeds: [
                            {
                                title: crew.name,
                                description: `ID: ${crew.id}`,
                            },
                        ],
                    });
                } catch (err) {
                    if (err instanceof TRPCClientError) {
                        await interaction.editReply("No crew found!");
                    }
                }
            }
        }
    },
};
