require('dotenv').config();
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');

if (!process.env.SLACK_TOKEN) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('./lib/Botkit.js');

var controller = Botkit.slackbot({
    debug: true,
});

var bot = controller.spawn({
    token: process.env.SLACK_TOKEN
}).startRTM();

var totalOrder = [];
var fruitList = {}
var fruit = []
var priceList = []

fetch('https://jigsaw-tutti.herokuapp.com/fruits')
    .then(res => res.text())
    .then(body => {
        fruitList = JSON.parse(body)
    });

controller.hears(['I want to order fruits', 'fruit order', 'start order'],'direct_message,direct_mention,mention', function(bot, message) {

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
        setTimeout(function(){
            for (let i = 0; i < fruitList.length; i++) {
                fruit.push(fruitList[i].name)
                priceList.push([fruitList[i].name, fruitList[i].price])
                bot.reply(message, `${fruitList[i].name}, £${Number(fruitList[i].price).toFixed(2)}`)
            }
        },500); 
    });
});

controller.hears(fruit, 'direct_message,direct_mention,mention', function(bot, message) {
    console.log("MESSAGE ===>>>", message)
    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'apple',
    }, (err, res) => {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(', err);
        }
    });

    let choice   = message.text.split(" ");
    let quantity = Number(choice.splice(0, 1)[0]);
    let name     = choice.join(' ').trim();

    controller.storage.users.get(message.user, (err, user) => {
        if (!user) {
            user = {
                id: message.user,
            };
        }

        let existingItem = totalOrder.filter(item => item.name.toLowerCase() === name.toLowerCase())[0]
        if (existingItem) {
            existingItem.quantity = existingItem.quantity + quantity
        } else {
            totalOrder.push({
                name: name,
                quantity: quantity
            });
        }
        totalOrder.map(fruit => {
            for (let i = 0; i < priceList.length; i++) {
                if(fruit.name.toLowerCase() === priceList[i][0].toLowerCase()){
                    fruit.price = priceList[i][1]
                }
            }
        })
        let totalPrice = 0.0
        totalOrder.map(item => totalPrice += parseFloat(`${item.price * item.quantity}`, 10))
        let updatedBasket = totalOrder.map(item => `${item.quantity} ${item.name}: £${item.price * item.quantity} \n`).join("")
        bot.reply(message, `Got it! I will add ${message.text} to your basket.\nYour updated basket:\n${updatedBasket}\nYour total is: £${totalPrice}`)
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

controller.hears(['confirm order', 'finalize order', 'order done'], 'direct_message,direct_mention,mention', (bot, message) => {

    bot.startConversation(message, (err, convo) => {
        var orderList   = totalOrder.map(item => `${item.name}: ${item.quantity}\n`).join('')
        var orderAsHTML = totalOrder.map(item => `<li>${item.name}: ${item.quantity}</li>`).join('')
        convo.ask("Are you sure you'd like to order the following?\n\n" + orderList, [
            {
                pattern: bot.utterances.yes,
                callback: (res, convo) => {
                    convo.say("Let's send that order!")
                    convo.next();
                    var smtpTransport = nodemailer.createTransport({
                        service: "Gmail",
                        auth: {
                            user: process.env.EMAIL_ADDRESS,
                            pass: process.env.PASSWORD
                        }
                    })
                    var mailOptions = {
                        from: "FruitBot", // sender name
                        to: process.env.EMAIL_ADDRESS, // list of receivers
                        subject: "Fruit Order", // Subject line
                        text: orderList, // plaintext body
                        html: `<ul>${orderAsHTML}</ul>` // html body
                    }
                    smtpTransport.sendMail(mailOptions, (err, res) => {
                        if (err) {
                            console.log('EMAIL =====>>>>> ', err);
                        } else {
                            console.log(`EMAIL =====>>>>> Message sent: ${res.message}`);
                            totalOrder = [];
                        }
                    })
            }
        },
            {
                pattern: bot.utterances.no,
                default: true,
                callback: function(response, convo) {
                convo.say('What *else* would you like to order?');
                convo.next();
                }
            }
        ])

    })
})

controller.hears(['(.*) help', 'help'],'direct_message,direct_mention,mention', function(bot, message) {
    controller.storage.users.get(message.user, function(err, user) {
        bot.reply(message, 'I am Tutti! The best fruit ordering bot in the world. This is how I can help you:')
    });
})

controller.hears(['(.*)'],'direct_message,direct_mention,mention', function(bot, message) {
    controller.storage.users.get(message.user, function(err, user) {
        bot.reply(message, 'Sorry, I don\'t recognize that command. Type help for the command list');
    });
})
