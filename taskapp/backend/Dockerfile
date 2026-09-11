FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV PORT=4000
EXPOSE 4000

# Run as non-root user (built into the node:alpine image)
USER node

CMD ["node", "server.js"]
