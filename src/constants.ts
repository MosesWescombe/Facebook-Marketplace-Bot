import dotenv from 'dotenv'; 
dotenv.config();  // Load environment variables from .env file 

export const config = {
    token: process.env.DISCORD_TOKEN ?? '',
    clientId: process.env.CLIENT_ID ?? '',
}