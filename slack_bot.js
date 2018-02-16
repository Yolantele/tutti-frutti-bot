const fetch = require('node-fetch')

if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('./lib/Botkit.js');
var os = require('os');

var controller = Botkit.slackbot({
    debug: true,
});

var bot = controller.spawn({
    token: process.env.token
}).startRTM();

var totalOrder = [];
var fruitList = {}

fetch('https://jigsaw-tutti.herokuapp.com/fruits')
    .then(res => res.text())
    .then(body => {
        fruitList = body
    });

controller.hears(['I want to order fruits', 'fruit order'],'direct_message,direct_mention,mention', function(bot, message) {

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'green_apple',
    }, function(err, res) {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(', err);
        }
    });


    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {
            bot.reply(message, 'Ok ' + user.name + ' let us start your order!!');
        } else {
            bot.reply(message, 'Let us start your fruit order.');
        }
        bot.reply(message, 'Fruits of today are apples and pears, please enter fruit name and quantity')
    });
});

const fruit = ['apple','apples', 'pear', 'pears'];

controller.hears(fruit, 'direct_message,direct_mention,mention', function(bot, message) {

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'apple',
    }, function(err, res) {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(', err);
        }
    });

    var choice = message.text;
    controller.storage.users.get(message.user, function(err, user) {
        if (!user) {
            user = {
                id: message.user,
            };
        }
        user.choice = choice;
        totalOrder.push(choice);
        controller.storage.users.save(user, function(err, id) {
            bot.reply(message, 'Got it. I will order you ' + message.text);
        });
    });

});


controller.hears(['call me (.*)', 'my name is (.*)'], 'direct_message,direct_mention,mention', function(bot, message) {
    var name = message.match[1];
    controller.storage.users.get(message.user, function(err, user) {
        if (!user) {
            user = {
                id: message.user,
            };
        }
        user.name = name;
        controller.storage.users.save(user, function(err, id) {
            bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
        });
    });
});



controller.hears(['order done'], 'direct_message,direct_mention,mention', function(bot, message) {

    bot.startConversation(message, function(err, convo) {

        convo.ask('Are you sure order is complete', [
            {
                pattern: bot.utterances.yes,
                callback: function(response, convo) {
                    convo.say('Order Sent, I will order ' + totalOrder.toString());
                    convo.next();
                    setTimeout(function() {
                        process.exit();
                    }, 3000);
                }
            },
        {
            pattern: bot.utterances.no,
            default: true,
            callback: function(response, convo) {
                convo.say('*What else woould you like to order*');
                convo.next();
            }
            
        }
    ]);
});
});
