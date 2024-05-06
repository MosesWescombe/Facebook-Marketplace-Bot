import { dbManager } from "../../db";
import { SlashCommandBuilder } from '@discordjs/builders';

export const deleteSearchChannel = {
	data: new SlashCommandBuilder()
        .setName('delete-channel')
        .setDescription('Deletes this channel'),
	async execute(interaction: any) {
        const channel = interaction.channel;

        if (!channel) {
            await interaction.reply({ content: 'Something went wrong.', ephemeral: true });
            return;
        }

        if (!channel.deletable) {
            await interaction.reply({ content: 'I do not have permission to delete this channel.', ephemeral: true });
            return;
        }

        await dbManager.removeSearchChannel(interaction.guildId, interaction.channelId);

        try {
            await channel.send('Deleting this channel as requested.');
            await channel.delete('The user requested to delete this channel.');
            console.log(`Channel deleted successfully: ${channel.name}`);
        } catch (error) {
            console.error(error);
            // If deletion failed for some other reason, reply to interaction if possible
            if (!channel.deleted) {
                await interaction.reply({ content: 'Failed to delete the channel. Please check my permissions.', ephemeral: true });
            }
        }
	},
};

export default {...deleteSearchChannel}