FROM node:20.11.1

WORKDIR /app

RUN npm i -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm i

COPY . .
RUN pnpm build

EXPOSE 3000
CMD ["node", "."]
