/** @type {import('commandkit').CommandData}  */
import { ChatInputCommandContext } from "commandkit";
import { type CommandInteraction, AttachmentBuilder, SlashCommandBuilder } from "discord.js";

export const command = {...new SlashCommandBuilder()
    .setName('offense')
    .setDescription('Genereer een offense report voor een clan.')
    .addStringOption(option =>
        option
            .setName('clan')
            .setDescription('De clan waarvoor je een offense report wilt genereren.')
            .setRequired(true)
            .setChoices(
                {
                    name: "Vechtersbazen!",
                    value: "#PYPQYPYR",
                },
                {
                    name: "Jong V'bazen!",
                    value: "#2Y8JPYQ69",
                }
            )
    )
    .toJSON(),
    guilds: [process.env.DEVELOPMENT_GUILD_ID] // Add your guild IDs here
};

export const chatInput = async ({ interaction, client }: ChatInputCommandContext) => {
    await interaction.deferReply();
    const clanTag = interaction.options.getString('clan', true);
    
    try {
        const csvData = await generateCSVScript(clanTag);
        
        if (csvData.error) {
            await interaction.editReply({
                content: `❌ Er is een out `
            });
            return;
        }

        // Create attachments from the CSV data
        const attachments = [
            new AttachmentBuilder(Buffer.from(csvData.offenseData, 'utf8'), { name: 'offense.csv' }),
            new AttachmentBuilder(Buffer.from(csvData.troops, 'utf8'), { name: 'troops.csv' }),
            new AttachmentBuilder(Buffer.from(csvData.spells, 'utf8'), { name: 'spells.csv' }),
            new AttachmentBuilder(Buffer.from(csvData.heroes, 'utf8'), { name: 'heroes.csv' }),
            new AttachmentBuilder(Buffer.from(csvData.pets, 'utf8'), { name: 'pets.csv' }),
            new AttachmentBuilder(Buffer.from(csvData.heroEquipment, 'utf8'), { name: 'hero_equipment.csv' })
        ];

        await interaction.editReply({
            content: `✅ Offense report generated successfully for clan: \`${clanTag}\``,
            files: attachments
        });

    } catch (error) {
        console.error('Error generating offense report:', error);
        await interaction.editReply({
            content: '❌ An error occurred while generating the offense report. Please try again.'
        });
    }
}

async function generateCSVScript(clanTag: any): Promise<any> {
    // Encode the clan tag for the API call since it contains special characters like #
    const encodedClanTag = encodeURIComponent(clanTag);
    const apiUrl = `https://api.clashofclans.com/v1/clans/${encodedClanTag}/members`;

    console.log('Making API call to:', apiUrl);

    const knownPets = ["L.A.S.S.I", "Electro Owl", "Mighty Yak", "Unicorn", "Frosty", "Diggy", "Phoenix", "Poison Lizard", "Spirit Fox", "Angry Jelly", "Sneezy"];

    const memberTags = await fetchClanMembersTags(apiUrl);
    if (memberTags.length === 0) {
        console.log("No members found or error occurred.");
        return { error: "No members found or error occurred." };
    }

    const clanMembers = await fetchClanMembers(memberTags);
    if (clanMembers.length === 0) {
        console.log("No clan members found or error occurred.");
        return { error: "No clan members found or error occurred." };
    }

    // Generate offense CSV content
    const offenseNamesSet = new Set();
    clanMembers.forEach(member => {
        member.offense.forEach(unit => offenseNamesSet.add(unit.name));
    });
    const offenseNames = Array.from(offenseNamesSet).sort();

    const offenseRows = clanMembers.map(member => {
        const levels: any = {};
        member.offense.forEach((unit) => {
            levels[unit.name] = unit.level;
        });
        const row = offenseNames.map((name: any) => levels[name] ?? 0);
        return `${member.name},${row.join(',')}`;
    });

    const offenseHeader = ['Name', ...offenseNames].join(',');
    const offenseContent = `${offenseHeader}\n${offenseRows.join('\n')}`;

    // Generate other CSV contents
    const troopsContent = buildTypeCsv(clanMembers, 'troops', unit => unit.village === 'home');
    const spellsContent = buildTypeCsv(clanMembers, 'spells', () => true);
    const heroesContent = buildTypeCsv(clanMembers, 'heroes', unit => !knownPets.includes(unit.name));
    const petsContent = buildTypeCsv(clanMembers, 'heroes', unit => knownPets.includes(unit.name));
    const heroEquipmentContent = buildTypeCsv(clanMembers, 'heroEquipment', () => true);

    return {
        offenseData: offenseContent,
        troops: troopsContent,
        spells: spellsContent,
        heroes: heroesContent,
        pets: petsContent,
        heroEquipment: heroEquipmentContent
    };
}

interface ClanMember {
    tag: string;
    name: string;
    troops: Unit[];
    spells: Unit[];
    heroes: Unit[];
    heroEquipment: Unit[];
    offense: Unit[];
    [key: string]: any; // For dynamic access to properties
}

interface Unit {
    name: string;
    level: number;
    village?: string;
    [key: string]: any; // For any additional properties
}

function buildTypeCsv(
    clanMembers: ClanMember[], 
    typeName: keyof ClanMember | string, 
    filterFn: (unit: Unit) => boolean
): string {
        const typeNamesSet = new Set<string>();
        clanMembers.forEach(member => {
                (member[typeName] || []).forEach((unit: Unit) => {
                        if (filterFn(unit)) typeNamesSet.add(unit.name);
                });
        });
        const typeNames: string[] = Array.from(typeNamesSet).sort();

        const rows = clanMembers.map(member => {
                const levels: Record<string, number> = {};
                (member[typeName] || []).forEach((unit: Unit) => {
                        if (filterFn(unit)) {
                                levels[unit.name] = unit.level;
                        }
                });
                const row = typeNames.map(name => levels[name] ?? 0);
                return `${member.name},${row.join(',')}`;
        });

        const header = ['Name', ...typeNames].join(',');
        const content = `${header}\n${rows.join('\n')}`;

        return content;
}

async function fetchClanMembersTags(apiUrl: string): Promise<any[]> {
    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${process.env.COC_API_KEY}` // Use environment variable for API key
            }

        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data: any = await response.json();
        return data.items.map((member: any) => member.tag);
    } catch (error) {
        console.error("Error fetching clan members:", error);
        return [];
    }
}

async function fetchClanMembers(tags: string[]): Promise<ClanMember[]> {
    const players: ClanMember[] = [];
    for (const tag of tags) {
        try {
            const response = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}`, {
                headers: {
                    'Authorization': `Bearer ${process.env.COC_API_KEY}` // Use environment variable for API key
                }
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const playerData: any = await response.json();
            players.push({
                tag: playerData.tag,
                name: playerData.name,
                troops: playerData.troops?.filter((t: any) => t.village === "home") || [],
                spells: playerData.spells || [],
                heroes: playerData.heroes || [],
                heroEquipment: playerData.heroEquipment || [],
                offense: [
                    ...(playerData.troops?.filter((t: any) => t.village === "home") || []),
                    ...(playerData.spells || []),
                    ...(playerData.heroes || []),
                    ...(playerData.heroEquipment || [])
                ]
            });
        } catch (error) {
            console.error(`Error fetching player ${tag}:`, error);
        }
    }
    return players;
}