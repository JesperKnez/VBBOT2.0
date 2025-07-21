/** @type {import('commandkit').CommandData}  */
import { SlashCommandProps } from "commandkit";
import { ActionRowBuilder, ChatInputCommandInteraction, Client, ComponentType, SlashCommandBuilder, StringSelectMenuBuilder } from "discord.js";
import UserModel from '../../schemas/User';
export const data = new SlashCommandBuilder()
    .setName('setmain')
    .setDescription('Stel je hoofdaccount in.')

/**
 * @param {import('commandkit').SlashCommandProps} param0 
 */
export const run = async ({ interaction, client, handler }: SlashCommandProps) => {
    await interaction.deferReply();

    const dbUser =  await UserModel.findOne({ discordId: interaction.user.id });
    if (!dbUser) {
        interaction.editReply({
            content: 'Je bent nog niet verbonden. Gebruik `/connect` om je account te koppelen',
        });
        return;
    }
    
    const accounts = dbUser.clashAccounts;
    
    if (accounts.length === 0) {
        interaction.editReply({
            content: 'Je hebt geen Clash accounts gekoppeld of aangemeld. Gebruik `/connect` om je account te koppelen',
        });
        return;
    }
    
    const select = new StringSelectMenuBuilder()
    .setCustomId(interaction.id)
    .setPlaceholder('Selecteer het account om als hoofdaccount te gebruiken.')
    .addOptions(
        accounts.map(account => ({
                label: account.playerName,
                value: account.playerTag,
                description: `Hoofdaccount instellen voor ${account.playerName}`,
            }))
        );
        
        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
        
        const reply = await interaction.editReply({
            content: 'Selecteer het account om als hoofdaccount in te stellen:',
            components: [row],
    });

    const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 60000, // 1 minute
        filter: i => i.user.id === interaction.user.id && i.customId === interaction.id,
    })
    
    collector.on('collect', async (i) => {
        const selectedAccount = i.values[0];
        const account = accounts.find(acc => acc.playerTag === selectedAccount);
        if (!account) {
            await i.update({ content: 'Ongeldig account geselecteerd.', components: [] });
            return;
        }

        // Update the user's main account
        await UserModel.updateOne(
            { discordId: interaction.user.id },
            { 
                $set: { 
                    mainAccount: account.playerTag,
                    'clashAccounts.$[].isMainAccount': false
                } 
            }
        );

        // Set the selected account as the main account
        await UserModel.updateOne(
            { discordId: interaction.user.id },
            { $set: { 'clashAccounts.$[elem].isMainAccount': true } },
            { arrayFilters: [{ 'elem.playerTag': selectedAccount }] }
        );

        await i.update({
            content: `Je hebt ${account.playerName} als hoofdaccount ingesteld.`,
            components: [],
        });
    });
}

/** @type {import('commandkit').CommandOptions} */
export const options = {
    // https://commandkit.js.org/typedef/CommandOptions
    guildOnly: true,
    devOnly: true,
    deleted: false
}