import { dbManager } from "../../db";
import { SlashCommandBuilder } from '@discordjs/builders';

export const addSearchChannel = {
	data: new SlashCommandBuilder()
		.setName('add-search-channel')
		.setDescription('Add an additional search channel. Usage: "/add-search-channel <channel-name>"')
        .addStringOption(option => 
            option.setName('channel-name')
                .setDescription('Name of the channel')
                .setRequired(true)),
	async execute(interaction: any) {
        const channelName = interaction.options.getString('channel-name', true);

        try {
            // Create the channel
            const channel = await interaction.guild.channels.create({
                name: channelName,
                type: 0,
                reason: 'Requested a new search channel'
            });

            // Optionally, save the channel info in your database
            await dbManager.addSearchChannel({
                guildId: interaction.guildId,
                name: channelName,
                channelId: channel.id,
                searches: [] // Assuming you handle searches array initialization here
            });

            // Respond to the interaction
            await interaction.reply(`Created a new search channel named ${channelName}.`);
        } catch (error) {
            console.error('Failed to create channel:', error);
            await interaction.reply({ content: 'Failed to create the channel. Please check my permissions and try again.', ephemeral: true });
        }
	},
};

export default {...addSearchChannel}