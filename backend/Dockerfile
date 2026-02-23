FROM node:20-alpine
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY src ./src
COPY .env ./.env
EXPOSE 3000
CMD ["npm", "run", "dev"]
