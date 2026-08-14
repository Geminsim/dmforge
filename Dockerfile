FROM node:22-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy the rest of the application files
COPY . .

# Expose Vite's default dev server port
EXPOSE 5173
ENV DMFORGE_HOST=0.0.0.0

# Build and start the independent production server
RUN npm run build
CMD ["npm", "start"]
