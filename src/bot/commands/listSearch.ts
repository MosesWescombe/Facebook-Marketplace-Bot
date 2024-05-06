import { dbManager } from "../../db";
import { SlashCommandBuilder } from '@discordjs/builders';

export const listSearch = {
	data: new SlashCommandBuilder()
		.setName('list-search')
		.setDescription('List searches in this channel.'),
	async execute(interaction: any) {
        const guildId = interaction.guildId;
        const channelId = interaction.channelId;

        const channels = await dbManager.getSearchChannels();
        const searchChannel = channels.find(ch => ch.guildId === guildId && ch.channelId === channelId);
        const searches = searchChannel ? searchChannel.searches : [];

		if (searches.length === 0) {
			await interaction.reply('No searches, add one using the command /add-search.');
			return;
		}

		await interaction.reply(searches.map((search, index) => `• [${index + 1}] ${search}`).join('\n'));
	},
};

export default {...listSearch}