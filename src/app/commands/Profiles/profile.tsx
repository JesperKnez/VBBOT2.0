import {
    ChatInputCommandContext,
    AutocompleteCommandContext,
    ActionRow,
    Button
} from 'commandkit'
import {
    type ChatInputCommand,
    Container,
    Section,
    TextDisplay,
    Thumbnail,
} from 'commandkit';
import {SlashCommandBuilder, ButtonStyle, MessageFlags, Colors} from 'discord.js';
import UserModel from "@/app/schemas/User.ts";
import {registerFont} from 'canvas';
import dotenv from 'dotenv';
import path from "path";
import fs from "fs";

import {Profile, UnitTypes} from '@/app/classes/Profile.ts';

dotenv.config();

registerFont('D:/DEVELOPMENT/Persoonlijk/VBBOT2.0/assets/fonts/Inter_Bold.ttf', {
    family: 'Inter',
    weight: '700',
    style: 'normal',
});


/** @type {import('commandkit').CommandData}  */
export const command = {
    ...new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Bekijk spelerprofielen!')
        .addUserOption(option =>
            option.setName('player')
                .setDescription('De speler waarvan je het profiel wilt bekijken')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('player_tag')
                .setDescription('De speler tag van de speler waarvan je het profiel wilt bekijken')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .toJSON()
    ,
    guilds: [process.env.DEVELOPMENT_GUILD_ID]
};
// )

export const autocomplete = async ({interaction, client}: AutocompleteCommandContext) => {
    const focusedValue = interaction.options.getFocused();

    const userOptionValue = interaction.options.get('player')?.value;
    let selectedUser = null;
    if (userOptionValue) {
        selectedUser = await client.users.fetch(userOptionValue as string);

        const userProfile = await UserModel.findOne({discordId: selectedUser.id});
        if (!userProfile) {
            await interaction.respond([]);
            return;
        }
        const autoCompleteData = userProfile.clashAccounts.map((account: any) => {
            return {
                name: account.playerName,
                value: account.playerTag
            }
        })

        await interaction.respond(autoCompleteData);
    }
    if (!selectedUser) {
        await interaction.respond([]);
        return;
    }
}

export const chatInput = async ({interaction, client}: ChatInputCommandContext) => {
    await interaction.deferReply();


    // DB code
    const user = interaction.options.getUser('player') || interaction.user;
    const playerTag = interaction.options.getString('player_tag');

    const userProfile = await UserModel.findOne({discordId: user.id});
    const userClashAccount = userProfile?.clashAccounts?.find(account => account.playerTag === playerTag);

    const userApiInfo = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(userClashAccount?.playerTag!)}`, {
        headers: {
            Authorization: `Bearer ${process.env.COC_API_KEY}`,
            ContentType: 'application/json',
        }
    }).then(response => {
        if (!response.ok) {
            console.log(`Error fetching player data: ${response.statusText}`);
        }
        return response.json();
    }).catch(error => {
        console.error(`Error fetching player data: ${error}`);
        return '';
    })
    void userClashAccount;
    void userApiInfo;
    await Profile.updateClashAccount(userProfile, userApiInfo, playerTag);

    // Get all the hero equipment emojis
    const emojiServer = client.guilds.cache.get(process.env.EMOJI_GUILD_ID!);
    const emojis = emojiServer?.emojis.cache.map(emoji => emoji.toString()) || [];

// Generate all profile images in parallel
    const generateAllProfileImages = async () => {
        const imagePromises = Object.values(UnitTypes).map(async (type) => {
            // Map waar je icons staan
            const iconsFolder = `D:/DEVELOPMENT/Persoonlijk/VBBOT2.0/assets/${type}`;

            // Dynamisch array genereren (absolute paden, geen href!)
            const unitOffense = [
                ...userApiInfo?.troops || [],
                ...userApiInfo?.heroes || [],
                ...userApiInfo?.spells || [],
                ...userApiInfo?.heroEquipment || []
            ];

            const troopIcons = fs.readdirSync(iconsFolder)
                .filter(file => file.toLowerCase().endsWith('.png'))
                .map(file => path.join(iconsFolder, file))
                .sort((a, b) => {
                    const aNumber = parseInt(a.match(/_(\d+)\.png$/)?.[1] || '0');
                    const bNumber = parseInt(b.match(/_(\d+)\.png$/)?.[1] || '0');
                    return aNumber - bNumber;
                });

            const troopsWithImages = Profile.mapUnitToImage(
                unitOffense.filter((troop: any) =>
                    !troop.name.toLowerCase().includes('super') &&
                    troop.village == 'home'
                ) || [],
                troopIcons,
                type
            );

            // Return the generated image
            return Profile.generateProfileImage(troopsWithImages, type);
        });

        // Wait for all images to be generated concurrently
        return Promise.all(imagePromises);
    };

// Replace the for loop with this async function
    const attachments = await generateAllProfileImages();

    const container = (
        <Container accentColor={Colors.Blue}>
            <Section>
                <TextDisplay content="Welcome to the first section" />
                <Thumbnail url="https://cdn.discordapp.com/embed/avatars/0.png" />
            </Section>
        </Container>
    );

// Use the attachments directly - they are now properly typed
    await interaction.editReply({
        files: attachments, components: [container],
        flags: MessageFlags.IsComponentsV2
    });

}


// /** @type {import('commandkit').CommandOptions} */
// export const options = {
//     // https://commandkit.js.org/typedef/CommandOptions
//     guildOnly: true,
//     devOnly: true,
//     deleted: false
// }


