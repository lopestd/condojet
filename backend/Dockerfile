FROM node:20-alpine
RUN apk add --no-cache tzdata
ENV TZ=America/Sao_Paulo
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY src ./src
COPY .env ./.env
EXPOSE 3000
CMD ["npm", "run", "dev"]
