FROM node:20.15.1-slim

WORKDIR /app

RUN npm i -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm i

COPY . .
RUN pnpm build

EXPOSE 3000
CMD ["node", "."]
