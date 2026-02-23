FROM node:20-alpine
WORKDIR /app
COPY package.json tsconfig.json vite.config.ts postcss.config.cjs tailwind.config.ts ./
RUN npm install
COPY index.html ./
COPY src ./src
COPY .env ./.env
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
