/** @type {import('commandkit').CommandData}  */
import { ChatInputCommandContext } from "commandkit";
import { ActionRowBuilder, ChatInputCommandInteraction, Client, ComponentType, SlashCommandBuilder, StringSelectMenuBuilder } from "discord.js";
import UserModel from '../../schemas/User';

export const command = {...new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Stel herinneringen in')
    .addSubcommand(subcommand =>
        subcommand
            .setName('subscribe')
            .setDescription('Meld je accounts aan voor herinneringen')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('unsubscribe')
            .setDescription('Meld je accounts af voor herinneringen')
    )
    .toJSON(),
    guilds: [process.env.DEVELOPMENT_GUILD_ID]
};

export const chatInput = async ({ interaction, client }: ChatInputCommandContext) => {
    await interaction.deferReply();

    // Handle the subcommands
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'subscribe') await reminderSubscribe(interaction, client);
    else if (subcommand === 'unsubscribe') await reminderUnsubscribe(interaction, client);
    return;
}

/** @type {import('commandkit').CommandOptions} */
export const options = {
    // https://commandkit.js.org/typedef/CommandOptions
    guildOnly: true,
    devOnly: true,
    deleted: true
}

async function reminderSubscribe(interaction: ChatInputCommandInteraction, client: Client) {
    const dbUser =  await UserModel.findOne({ discordId: interaction.user.id });
    if (!dbUser) {
        interaction.editReply({
            content: 'Je bent nog niet verbonden. Gebruik `/connect` om je account te koppelen',
        });
        return;
    }

    const accounts = dbUser.clashAccounts.filter(account => account.reminderSubscription === false);

    if (accounts.length === 0) {
        interaction.editReply({
            content: 'Je hebt geen Clash accounts gekoppeld of aangemeld. Gebruik `/connect` om je account te koppelen',
        });
        return;
    }

    const select = new StringSelectMenuBuilder()
        .setCustomId(interaction.id)
        .setPlaceholder('Selecteer een account om je voor aan te melden.')
        .setMinValues(1)
        .setMaxValues(Math.min(accounts.length, 10)) // Limit to 10 options
        .addOptions(
            accounts.map(account => ({
                label: account.playerName,
                value: account.playerTag,
                description: `Herinneringen aanmelden voor ${account.playerName}`,
            }))
        );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    
    const reply = await interaction.editReply({
        content: 'Selecteer accounts om aan te melden:',
        components: [row],
    });

    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 60000, // 1 minute
        filter: i => i.user.id === interaction.user.id && i.customId === interaction.id,
    })

    collector.on('collect', async (i) => {
        const selectedAccounts = i.values;
        const selectedAccountNames = selectedAccounts.map(tag => {
            const account = accounts.find(acc => acc.playerTag === tag);
            return account ? account.playerName : tag;
        });
        if (selectedAccounts.length === 0) {
            await i.update({ content: 'Je hebt geen accounts geselecteerd.', components: [] });
            return;
        }

        // Update the user's accounts to subscribe to reminders
        await UserModel.updateOne(
            { discordId: interaction.user.id },
            { $set: { 'clashAccounts.$[elem].reminderSubscription': true } },
            { arrayFilters: [{ 'elem.playerTag': { $in: selectedAccounts } }] }
        );

        await i.update({
            content: `Je je hebt de volgende accounts aangemeld: ${selectedAccountNames.join(', ')}`,
            components: [],
        });
    });
}

async function reminderUnsubscribe(interaction: ChatInputCommandInteraction, client: Client) {
    const dbUser =  await UserModel.findOne({ discordId: interaction.user.id });
    if (!dbUser) {
        interaction.editReply({
            content: 'Je bent nog niet verbonden. Gebruik `/connect` om je account te koppelen',
        });
        return;
    }

    const accounts = dbUser.clashAccounts.filter(account => account.reminderSubscription === true);

    if (accounts.length === 0) {
        interaction.editReply({
            content: 'Je hebt geen Clash accounts gekoppeld. Gebruik `/connect` om je account te koppelen',
        });
        return;
    }

    const select = new StringSelectMenuBuilder()
        .setCustomId(interaction.id)
        .setPlaceholder('Selecteer een account om je voor af te melden')
        .setMinValues(1)
        .setMaxValues(Math.min(accounts.length, 10)) // Limit to 10 options
        .addOptions(
            accounts.map(account => ({
                label: account.playerName,
                value: account.playerTag,
                description: `Meld herinneringen af voor ${account.playerName}`,
            }))
        );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    
    const reply = await interaction.editReply({
        content: 'Selecteer een account om je voor af te melden:',
        components: [row],
    });

    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 60000, // 1 minute
        filter: i => i.user.id === interaction.user.id && i.customId === interaction.id,
    })

    collector.on('collect', async (i) => {
        const selectedAccounts = i.values;
        const selectedAccountNames = selectedAccounts.map(tag => {
            const account = accounts.find(acc => acc.playerTag === tag);
            return account ? account.playerName : tag;
        });
        if (selectedAccounts.length === 0) {
            await i.update({ content: 'Je hebt geen accounts geselecteerd.', components: [] });
            return;
        }

        // Update the user's accounts to subscribe to reminders
        await UserModel.updateOne(
            { discordId: interaction.user.id },
            { $set: { 'clashAccounts.$[elem].reminderSubscription': false } },
            { arrayFilters: [{ 'elem.playerTag': { $in: selectedAccounts } }] }
        );

        await i.update({
            content: `Je hebt je afgemeld voor herinneringen voor de volgende accounts: ${selectedAccountNames.join(', ')}`,
            components: [],
        });
    });
}

