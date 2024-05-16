import { Client, Collection, EmbedBuilder, Events, GatewayIntentBits } from 'discord.js';
import path from 'path';
import * as fs from 'fs'
import { DetailedListing } from '../scraper/browser';

export class CustomClient extends Client {
    public commands: Collection<string, any> = new Collection();
}

export const client = new CustomClient({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', () => {
    console.log('Bot is ready!');
});

const foldersPath = path.join(__dirname, 'commands');

// const commandsPath = path.join(foldersPath, folder);
const commandFiles = fs.readdirSync(foldersPath).filter(file => file.endsWith('.ts'));
for (const file of commandFiles) {
    const filePath = path.join(foldersPath, file);
    const command = require(filePath).default;
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = (interaction.client as CustomClient).commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

export const sendListingMessage = async (listing: DetailedListing, channelId: string) => {
    try {
        const channel = client.channels.cache.get(channelId);

        const embed = new EmbedBuilder()
            .setTitle(listing.title)
            .setURL(listing.url)
            .setTimestamp()
            .addFields(
                {
                    name: 'Price',
                    value: listing.price,
                    inline: true
                },
                {
                    name: 'Kms',
                    value: listing.kms,
                    inline: true
                }
            )

        if (listing.image !== 'No image found') {
            embed.setImage(listing.image);
        }

        if (listing.price_details) {
            embed.addFields(
                {
                    name: 'Value Low',
                    value: listing.price_details.low.toString() ?? 'N/A',
                    inline: true
                },
                {
                    name: 'Value Avg',
                    value: listing.price_details.average.toString() ?? 'N/A',
                    inline: true
                },
                {
                    name: 'Value High',
                    value: listing.price_details.high.toString() ?? 'N/A',
                    inline: true
                }
            )
        }

        if (listing.plate) {
            embed.addFields({
                name: 'Plate',
                value: listing.plate,
                inline: false
            });
        }

        if (channel?.isTextBased()) {
            await channel.send({embeds: [embed]});
        }
    } catch (e) {
        console.log("Failed to send message", e)
    }
}