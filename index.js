require('dotenv').config();
let Botkit = require('./lib/Botkit.js');
let startBot = require('./app.js').startBot;

if (!process.env.SLACK_TOKEN) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

let controller = Botkit.slackbot({
    debug: true,
});

let bot = controller.spawn({
    token: process.env.SLACK_TOKEN
}).startRTM();

startBot(controller, bot);