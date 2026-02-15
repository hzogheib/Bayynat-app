# Use official Node.js image as the base
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package.json .
# If you have a lock file, uncomment the next line
# COPY package-lock.json .

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the app
RUN npm run build

# Production image
FROM node:20-alpine AS prod
WORKDIR /app

# Copy built files and dependencies
COPY --from=build /app /app

# Expose Vite preview port
EXPOSE 5173

# Start the Vite preview server
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
