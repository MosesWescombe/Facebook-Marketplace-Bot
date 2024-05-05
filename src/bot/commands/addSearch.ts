import { dbManager } from "../../db";
import { SlashCommandBuilder } from '@discordjs/builders';

export const addSearch = {
	data: new SlashCommandBuilder()
		.setName('add-search')
		.setDescription('Add an additional search to this channel. Usage: "/addSearch <search_url>"')
        .addStringOption(option => 
            option.setName('url')
                .setDescription('The URL to search')
                .setRequired(true)),
	async execute(interaction: any) {
        const guildId = interaction.guildId;
        const channelId = interaction.channelId;
        const channel = interaction.channel;
        const guild = interaction.guild;
        let searchUrl = interaction.options.getString('url');

        // Add features to the search
        if (!searchUrl.includes('sortBy')) {
            searchUrl += '&sortBy=creation_time_descend';
        }

        if (!searchUrl.includes('daysSinceListed')) {
            searchUrl += '&daysSinceListed=1';
        }

        if (!searchUrl.includes('exact')) {
            searchUrl += '&exact=false';
        }

        await dbManager.addSearch(guildId, channelId, searchUrl);
		await interaction.reply(`Search added in ${channel.name} channel of ${guild.name} server.`);
	},
};

export default {...addSearch}