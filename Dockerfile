FROM node:22-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose Vite's default dev server port
EXPOSE 5173

# Start the Vite development server
CMD ["npm", "run", "dev"]
