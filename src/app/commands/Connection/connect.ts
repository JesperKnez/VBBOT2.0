import { ActionRowBuilder, ModalBuilder, TextInputBuilder } from '@discordjs/builders';
import type { ChatInputCommandContext } from 'commandkit'
import { ActionRow, SlashCommandBuilder, TextInputStyle } from 'discord.js';
import dotenv from 'dotenv';
import UserModel from '../../schemas/User';
import ConfigModel, { IConfig } from '../../schemas/Config';
dotenv.config();

/** @type {import('commandkit').CommandData}  */
export const command = {
    ...new SlashCommandBuilder()
        .setName('connect')
        .setDescription('Verbind je clash account met de bot')
        .toJSON(),
    guilds: [process.env.DEVELOPMENT_GUILD_ID] // Add your guild IDs here
};

export const chatInput = async ({ interaction, client }: ChatInputCommandContext) => {
    const config = await ConfigModel.findOneAndUpdate(
        {},
        {}, 
        { 
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        }
    );

    const modal = new ModalBuilder()
        .setCustomId(interaction.id)
        .setTitle('Connect Clash Account');

    const playerTagInput = new TextInputBuilder()
        .setCustomId('playerTagInput')
        .setLabel('Vul je Clash of Clans spelertag in')
        .setStyle(TextInputStyle.Short)
        
    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(playerTagInput);

    // If the config requires API token verification, add the second input field
    if(config.requireApiTokenVerification) {
        const playerApiTokenInput = new TextInputBuilder()
            .setCustomId('playerApiTokenInput')
            .setLabel('Vul je Clash of Clans API-token in.')
            .setStyle(TextInputStyle.Short);
    
        const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(playerApiTokenInput);
        modal.addComponents(firstActionRow, secondActionRow);
    } else {
        modal.addComponents(firstActionRow);
    }



    await interaction.showModal(modal);

    // Wait for the modal submit interaction
    interaction.awaitModalSubmit({
        filter: i => i.customId === interaction.id && i.user.id === interaction.user.id,
        time: 60000 // 1 minute timeout
    }).then(async modalInteraction => {
        await modalInteraction.deferReply();
        const playerTag = modalInteraction.fields.getTextInputValue('playerTagInput');
        const playerApiToken = modalInteraction.fields.getTextInputValue('playerApiTokenInput');


        try {
            const startTime = performance.now();
            
            if(config.requireApiTokenVerification) {
            
            const response = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(playerTag)}/verifytoken`,{
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.COC_API_KEY}`,
                },
                body: JSON.stringify({
                    token: playerApiToken
                })
            })
            
            if(!response || !response.ok){
                throw new Error(`Error: ${response.status}`);
            }

        }

            const player = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(playerTag)}`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.COC_API_KEY}`,
                }
            });
            const playerData = await player.json();
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            console.log(`Fetch call took ${duration.toFixed(2)}ms`);
            
            
            // If the verification is succesful, i want to store this in my MongoDB database. There is a userschema which defines a user. Inside there is an array of Clash accounts, since the user can have multiple Clash accounts connected to the bot.
            const user = await client.users.fetch(modalInteraction.user.id);
            
            // If the user does not exist in the database, create a new user. Otherwise, update the existing user by adding the new Clash account. 
            let dbUser = await UserModel.findOne({ discordId: user.id });
            if (!dbUser) {
                dbUser = new UserModel({
                    discordId: user.id,
                    userName: user.username,
                    displayName: user.displayName,
                    clashAccounts: []
                });
            }
            
            // Check if the Clash account is already connected
            const existingAccount = await UserModel.findOne({
                'clashAccounts.playerTag': playerTag
            }) || null;
            if (existingAccount) {
                await modalInteraction.editReply({
                    content: `Je Clash account met tag \`${playerTag}\` is al verbonden!`,
                });
                return;
            }
            
            const isMainAccount = dbUser.clashAccounts.length === 0; // If this is the first account, set it as the main account

            // Add the new Clash account to the user's list of accounts
            dbUser.clashAccounts.push({
                playerTag: playerTag,
                playerName: playerData.name,
                reminderSubscription: false,
                isMainAccount: isMainAccount,
            });
            
            // Save the user to the database
            await dbUser.save();
            
            await modalInteraction.editReply({
                content: `Je Clash account met tag \`${playerTag}\` is succesvol verbonden!`,
            });
        } catch(error){
            console.error(error);
            await modalInteraction.editReply({
                content: 'Er is een fout opgetreden bij het verbinden van je Clash account. Probeer het opnieuw.',
            });
        }
    }).catch(err => {
        console.error('Modal submit interaction failed:', err);
        interaction.followUp({
            content: 'Er is een fout opgetreden bij het verbinden van je Clash account. Probeer het opnieuw.',
            ephemeral: true
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