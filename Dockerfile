FROM node:lts-alpine3.10

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /usr/src/app

COPY . /usr/src/app/

RUN npm install

CMD ["npm", "start"]

EXPOSE 8080
