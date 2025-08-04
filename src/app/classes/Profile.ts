import {createCanvas, loadImage} from "canvas";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import {AttachmentBuilder} from "discord.js";

export enum UnitTypes {
    Troop = 'troops',
    DarkTroop = 'darkTroops',
    Hero = 'heroes',
    Spell = 'spells',
    Equipment = 'heroEquipment',
    Pet = 'pets',
    SiegeMachine = 'siegeMachines'
}

export class Profile {

    public static readonly excludedTroops = ['Super Barbarian', 'Super Archer', 'Super Giant', 'Super Wall Breaker', 'Super Wizard', 'Super Valkyrie', 'Super Witch', 'Super Dragon', 'Super Minion', 'Sneaky Goblin', 'Rocket Balloon', 'Ice Hound', 'Inferno Dragon', 'Super Yeti', 'Super Hog Rider', 'Super Bowler'];

    public static readonly pets = ['L.A.S.S.I', 'Electro Owl', 'Mighty Yak', 'Unicorn', 'Frosty', 'Diggy', 'Poison Lizard', 'Phoenix', 'Spirit Fox', 'Angry Jelly', 'Sneezy'];
    public static readonly heroes = ['Barbarian King', 'Archer Queen', 'Minion Prince', 'Grand Warden', 'Royal Champion'];
    public static readonly spells = ['Lightning Spell', 'Healing Spell', 'Rage Spell', 'Jump Spell', 'Freeze Spell', 'Clone Spell', 'Invisibility Spell', 'Earthquake Spell', 'Poison Spell', 'Haste Spell', 'Skeleton Spell', 'Bat Spell', 'Overgrowth Spell', 'Ice block spell'];
    public static readonly siegeMachines = ['Wall Wrecker', 'Battle Blimp', 'Stone Slammer', 'Log Launcher', 'Siege Barracks', 'Flame Flinger', 'Battle Drill', 'Troop Launcher'];
    public static readonly darkTroops = ['Minion', 'Hog Rider', 'Valkyrie', 'Golem', 'Witch', 'Lava Hound', 'Bowler', 'Ice Golem', 'Headhunter', 'Apprentice Warden', 'Druid', 'Furnace']
    public static readonly troops = ['Barbarian', 'Archer', 'Giant', 'Goblin', 'Wall Breaker', 'Balloon', 'Wizard', 'Healer', 'Dragon', 'P.E.K.K.A', 'Baby Dragon', 'Miner', 'Electro Dragon', 'Yeti', 'Dragon Rider', 'Electro Titan', 'Root Rider', 'Thrower'];
    // Adding heroEquipment property since it's referenced in the enum
    public static readonly heroEquipment: any[] = ['Barbarian Puppet', 'Rage Vial', 'Vampstache', 'Earthquake Boots', 'Giant Gauntlet', 'Spiky Ball', 'Snake Bracelet', 'Archer Puppet', 'Invisibility Vial', 'Giant Arrow', 'Frozen Arrow', 'Healer Puppet', 'Magic Mirror', 'Action Figure', 'Life Gem', 'Eternal Tome', 'Healing Tome', 'Rage Gem', 'Fireball', 'Lavaloon Puppet', 'Royal Gem', 'Seeking Shield', 'Hog Rider Puppet', 'Haste Vial', 'Rocket Spear', 'Electro Boots', 'Henchmen Puppet', 'Dark Orb', 'Metal Pants', 'Noble Iron', 'Dark Crown'];

    // Map enum values to class property names
    private static readonly unitTypeMap: Record<UnitTypes, keyof typeof Profile> = {
        [UnitTypes.Troop]: 'troops',
        [UnitTypes.DarkTroop]: 'darkTroops',
        [UnitTypes.Hero]: 'heroes',
        [UnitTypes.Spell]: 'spells',
        [UnitTypes.Equipment]: 'heroEquipment',
        [UnitTypes.Pet]: 'pets',
        [UnitTypes.SiegeMachine]: 'siegeMachines',
    };

    public static async updateClashAccount(user: any, playerTag: string, playerApiInfo: any) {
        const clashAccount = user.clashAccounts.find((account: any) => account.playerTag === playerTag);
        if (!clashAccount) return false;

        clashAccount.playerName = playerApiInfo.name;
        clashAccount.troops = playerApiInfo.troops;
        clashAccount.heroes = playerApiInfo.heroes;
        clashAccount.spells = playerApiInfo.spells;
        clashAccount.heroEquipment = playerApiInfo.heroEquipment;

        await user.save();

        return true;
    }


    public static mapEquipmentToEmoji = (heroEquipment: any, emojis: any) => {
        return heroEquipment.map((equipment: any) => {
            const equipmentNameWithoutSpaces = equipment.name.replace(/\s+/g, '');
            const emoji = emojis.find((e: any) => e.toLowerCase().includes(equipmentNameWithoutSpaces.toLowerCase()));
            return {
                emoji: emoji || '⚔️',
                level: equipment.level,
                name: equipment.name,
            };
        });
    }

    public static mapUnitToImage(units: any, icons: string[], type: UnitTypes) {
        const unitSet: any[] = units.filter((unit: any) => {
            const typeArray = Profile[Profile.unitTypeMap[type]] as any[];
            return typeArray.includes(unit.name);
        });
        return unitSet.filter((unit: any) => !Profile.excludedTroops.includes(unit.name)).map((unit: any) => {
            const unitNameWithoutSpaces = unit.name.replace(/\s+/g, '');
            const image = icons.find((icon: string) => icon.toLowerCase().includes(unitNameWithoutSpaces.toLowerCase()));
            return {
                image: image || '', // Fallback image if not found
                level: unit.level,
                maxLevel: unit.maxLevel,
                name: unit.name,
            };
        });
    }

    public static drawBlurredBackground = async (ctx: any, imagePath: any, x: number, y: number, w: any, h: any, blurAmount: number | boolean | sharp.BlurOptions = 15) => {

        // Updated function to draw background with blur using Sharp
        try {
            // Use sharp to load and blur the image
            const blurredBuffer = await sharp(imagePath)
                .blur(blurAmount)
                .toBuffer();

            // Load the blurred image with canvas
            const blurredImage = await loadImage(blurredBuffer);

            // Calculate dimensions to cover the canvas (preserving aspect ratio)
            const imageAspectRatio = blurredImage.width / blurredImage.height;
            const canvasAspectRatio = w / h;
            const offsetX = 0.5;
            const offsetY = 0.5;

            let renderWidth, renderHeight, renderX, renderY;

            if (imageAspectRatio > canvasAspectRatio) {
                renderHeight = h;
                renderWidth = blurredImage.width * (renderHeight / blurredImage.height);
                renderX = x - (renderWidth - w) * offsetX;
                renderY = y;
            } else {
                renderWidth = w;
                renderHeight = blurredImage.height * (renderWidth / blurredImage.width);
                renderX = x;
                renderY = y - (renderHeight - h) * offsetY;
            }

            // Draw the blurred image
            ctx.drawImage(blurredImage, renderX, renderY, renderWidth, renderHeight);

            // Add a semi-transparent overlay for better contrast
            ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
            ctx.fillRect(0, 0, w, h);

            return true;
        } catch (error) {
            console.error(`Failed to process background image: ${(error as Error).message}`);
            return false;
        }
    };

    public static async generateProfileImage(troopsWithImages:    any[], unitType: UnitTypes): Promise<AttachmentBuilder> {
        const columns = 7;
        const cellSize = 128;
        const padding = 10;
        const rows = Math.ceil(troopsWithImages.length / columns);

        const width = columns * (cellSize + padding) + padding;
        const height = rows * (cellSize + padding) + padding;

        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true; // Zorgt voor een betere kwaliteit van de afbeeldingen


        // Replace your background code with this
        // Get a random background image from the loadingScreens folder
        const loadingScreensDir = 'D:/DEVELOPMENT/Persoonlijk/VBBOT2.0/assets/loadingScreens';
        const backgroundFiles = fs.readdirSync(loadingScreensDir)
            .filter(file => file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.png'))
            .map(file => path.join(loadingScreensDir, file));

        // Pick a random background image
        const randomBackgroundPath = backgroundFiles[Math.floor(Math.random() * backgroundFiles.length)];
        console.log(`Using background image: ${randomBackgroundPath}`);
        const backgroundSuccess = await Profile.drawBlurredBackground(ctx, randomBackgroundPath, 0, 0, width, height, 8);

        if (!backgroundSuccess) {
            // Fallback to solid color if image processing fails
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
        }

// Icons in raster tekenen (Buffer manier)
        for (let i = 0; i < troopsWithImages.length; i++) {
            const unit = troopsWithImages[i]!;
            if (!unit.image || unit.image == '') continue; // Skip if no image is found

            const buffer = fs.readFileSync(unit.image);
            // Add error handling when loading images
            let icon;
            try {
                icon = await loadImage(buffer);
            } catch (error) {
                console.error(`Failed to load image for ${unit.name}: ${(error as Error).message}`);
                continue; // Skip this image and move to the next one
            }

            const col = i % columns;
            const row = Math.floor(i / columns);

            const x = padding + col * (cellSize + padding);
            const y = padding + row * (cellSize + padding);

            // 1. Teken de troop icon
            ctx.drawImage(icon, x, y, cellSize, cellSize);

            // 2. Teken een semi-transparant vakje bovenaan
            const boxWidth = 32;
            const boxHeight = 32;
            const boxX = x; // rechtsboven binnen het icoon
            const boxY = y + cellSize - boxHeight;

            const level = unit.level // Bijvoorbeeld: hier kun je dynamisch per troop het level invullen

            ctx.fillStyle = level == unit.maxLevel ? 'rgba(221, 172, 94, 1' : 'rgba(0, 0, 0, 0.6)'; // semi-transparant zwart
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
            ctx.fill();

            // 3. Teken het level nummer in wit, gecentreerd
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px "Inter", sans-serif'; // Gebruik Arial of een andere sans-serif font
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.fillText(level.toString(), boxX + boxWidth / 2, boxY + boxHeight / 2);
        }

        // When returning, make sure to explicitly create a proper buffer with content type
        const buffer = canvas.toBuffer('image/png');

        // Create the attachment with explicit name and description
        return new AttachmentBuilder(buffer, {
            name: `${unitType}_profile.png`,
            description: `Profile image for ${unitType}`
        });
    }
}