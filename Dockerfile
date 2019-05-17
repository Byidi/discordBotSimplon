FROM node:latest

RUN mkdir -p /usr/src/bot
RUN mkdir /usr/src/bot/sql
WORKDIR /usr/src/bot

COPY ./package.json . /usr/src/bot/
RUN npm install
