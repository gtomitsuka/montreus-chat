# montreus-chat
Montreus Chatting Solution, as you can find on http://swc.montreus.com:3030/room/900.<br>
It works with Node.js, and supports Markdown.<br> It includes tons of security: Protection against XSS scripting, against huge messages and thousands of robot connections that could take the server down.

## Installation
For installing it, you must first make sure Node.js is installed, then create a directory for it and run:
<br>
  `npm install`
<br>
  `node app.js` or `forever start app.js`

## Commands
These are the available Montreus Chat commands as of v1.3.x:

    /help
    /bot-say <message>
    /broadcast <message>
    /me
