# Use the official Node.js image as the base image
FROM node:18-buster

RUN apt-get install -y wget
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \ 
    && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list
RUN apt-get update && apt-get -y install google-chrome-stable

WORKDIR /app

COPY . .


# Install dependencies, including Chrome and necessary utilities
RUN npm install

# Start the application
CMD [ "npm", "run", "start" ]