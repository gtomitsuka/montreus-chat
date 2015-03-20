# montreus-chat
![Travis Build](https://travis-ci.org/gtomitsuka/montreus-chat.svg?branch=feature%2Fopen-sans)

Montreus Chat, as you can find on http://chat.oratio.io/room/900.<br>
It's based on Node.js + Express.js + Socket.IO, and supports *Markdown*.<br> It includes tons of security: Protection against XSS scripting, against huge messages and thousands of robot connections that could take the server down.

Database-less edition available on the `no-db` branch.

## Installation Guide

1. Clone the repo using `git clone https://github.com/gtomitsuka/montreus-chat.git`.
1. Rename the `sample-config.json` to `config.json` and change it's config, if necessary.
1. Rename the `sample-room.json` to `room.json` and create your own rooms!
1. Run the `npm install` command on the repo's folder.
1. And for starting the instance run `node .`. You should use the Forever or PM2 modules for deamonzing the chat.

## Commands
These are the available Montreus Chat commands as of v2.7.x:

    /help
    /bot-say <message>
    /broadcast <message>
    /me
