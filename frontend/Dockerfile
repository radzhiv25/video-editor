FROM node:18-alpine

WORKDIR /app

# Install Expo CLI
RUN npm install -g expo-cli

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 19000 19001 19002

# Start Expo
CMD ["npx", "expo", "start", "--tunnel"]


