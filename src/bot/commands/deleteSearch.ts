import { dbManager } from "../../db";
import { SlashCommandBuilder } from '@discordjs/builders';

export const deleteSearch = {
	data: new SlashCommandBuilder()
		.setName('delete-search')
		.setDescription('List searches in this channel.')
        .addStringOption(option =>
            option.setName('index')
                .setDescription('Delete a search by number. Use list-searches to find the number.')
                .setRequired(true)),
	async execute(interaction: any) {
        const guildId = interaction.guildId;
        const channelId = interaction.channelId;

        const channels = await dbManager.getSearchChannels();
        const searchChannel = channels.find(ch => ch.guildId === guildId && ch.channelId === channelId);
        const searches = searchChannel ? searchChannel.searches : [];

        const index = parseInt(interaction.options.getString('index'));
        if (index < 1 || index > searches.length) {
            await interaction.reply('Invalid index.');
            return;
        }

        const search = searches[index - 1];
        await dbManager.removeSearch(guildId, channelId, search);

		await interaction.reply('Successfully deleted search.');
	},
};

export default {...deleteSearch}