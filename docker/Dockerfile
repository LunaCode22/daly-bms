# Base image with Bluetooth support
FROM node:20-bullseye

# Install Bluetooth packages and required capabilities
RUN apt-get update && \
    apt-get install -y bluetooth bluez libbluetooth-dev libcap2-bin && \
    setcap cap_net_raw+eip $(eval readlink -f `which node`)

# Create the app directory
WORKDIR /app

# Copy the application files
COPY ../ .

RUN ls -l

# Install dependencies
RUN npm install

# Expose the application port
EXPOSE 3000

# Default start command
CMD ["npm", "start"]
