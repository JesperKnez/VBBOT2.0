/** @type {import('commandkit').CommandData}  */
import { ChatInputCommandContext } from "commandkit";
import { ActionRowBuilder, ChatInputCommandInteraction, Client, ComponentType, GuildTextBasedChannel, MessageFlags, PermissionFlagsBits, SlashCommandBuilder, StringSelectMenuBuilder } from "discord.js";
import UserModel from '../../schemas/User';

export const command = {
    ...new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Verwijder berichten in een kanaal.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Aantal berichten om te verwijderen')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(50))
        .toJSON(),
    guilds: [process.env.DEVELOPMENT_GUILD_ID]
}

export const chatInput = async ({ interaction, client }: ChatInputCommandContext) => {
    await interaction.deferReply({
        flags: MessageFlags.Ephemeral
    });

    if(interaction.user.id !== process.env.OWNER_USER_ID){
        await interaction.editReply({
            content: ':x: Je hebt geen toestemming om dit commando uit te voeren.',
        });
        return;
    }

    const amount = interaction.options.getInteger('amount')!;
    if (amount < 1 || amount > 50) {
        await interaction.editReply({
            content: 'Het aantal berichten moet tussen de 1 en 50 liggen.',
        });
        return;
    }

    const channel: GuildTextBasedChannel = interaction.channel as GuildTextBasedChannel;
    if (!channel || !channel.isTextBased()) {
        await interaction.editReply({
            content: 'Dit commando kan alleen in tekstkanalen worden gebruikt.',
        });
        return;
    }

    const messages = await channel.messages.fetch({ limit: amount + 1 }); // +1 to include the command message itself
    await channel.bulkDelete(messages, true);

    await interaction.editReply({
        content: `Succesvol ${messages.size - 1} berichten verwijderd.`,
    });
    
}

/** @type {import('commandkit').CommandOptions} */
export const options = {
    // https://commandkit.js.org/typedef/CommandOptions
    guildOnly: true,
    devOnly: true,
    deleted: false
}