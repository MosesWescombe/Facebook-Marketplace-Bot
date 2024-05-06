import * as fs from 'fs';
import { promises as fsp } from 'fs';

interface SearchChannel {
    name: string;
    guildId: string;
    channelId: string;
    searches: string[];
}

class SearchDbManager {
    private filename: string;

    constructor(filename: string) {
        // Create file if it doesn't exist
        try {
            const file = fs.readFileSync(filename, 'utf8')
            console.log("File: ", file)
            if (!file || file === '') {
                throw Error('Empty file');
            }
        } catch (error) {
            fs.writeFileSync(filename, JSON.stringify({ searchChannels: [] }, null, 2), 'utf8');
        }

        this.filename = filename;
    }

    async getSearchChannels(): Promise<SearchChannel[]> {
        const data = await fsp.readFile(this.filename, 'utf8');
        return JSON.parse(data).searchChannels;
    }

    async addSearchChannel(channel: SearchChannel): Promise<void> {
        const channels = await this.getSearchChannels();
        channels.push(channel);
        await this.writeDatabase(channels);
    }

    async removeSearchChannel(guildId: string, channelId: string): Promise<void> {
        let channels = await this.getSearchChannels();
        channels = channels.filter(ch => ch.guildId !== guildId || ch.channelId !== channelId);
        await this.writeDatabase(channels);
    }

    async addSearch(guildId: string, channelId: string, search: string): Promise<void> {
        const channels = await this.getSearchChannels();
        const channel = channels.find(ch => ch.guildId === guildId && ch.channelId === channelId);
        if (channel) {
            channel.searches.push(search);
            await this.writeDatabase(channels);
        } else {
            throw new Error('Channel not found');
        }
    }

    async removeSearch(guildId: string, channelId: string, search: string): Promise<void> {
        const channels = await this.getSearchChannels();
        const channel = channels.find(ch => ch.guildId === guildId && ch.channelId === channelId);
        if (channel) {
            channel.searches = channel.searches.filter(s => s !== search);
            await this.writeDatabase(channels);
        } else {
            throw new Error('Channel not found');
        }
    }

    private async writeDatabase(channels: SearchChannel[]): Promise<void> {
        await fsp.writeFile(this.filename, JSON.stringify({ searchChannels: channels }, null, 2), 'utf8');
    }
}

export const dbManager = new SearchDbManager('./volumes/data.json');