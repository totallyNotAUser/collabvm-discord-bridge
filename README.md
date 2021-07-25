# collabvm-discord-bridge
A bridge between CollabVM and Discord
## Preparing
1. Make sure you have node.js and npm installed
2. Download `index.js` 
3. Run `npm i discord.js ws` in the directory you put `index.js` in.
4. See "How to run"
## How to run
There are 2 ways to run this bot:
1. replace `process.env.TOKEN` in the last line of `index.js` with your token in quotes (like this: `client.login("your-token-here");`)
2. run the bot without changing `index.js`, but set environment variable `TOKEN`
