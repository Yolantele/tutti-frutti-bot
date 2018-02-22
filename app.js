const fetch = require('node-fetch');
const nodemailer = require('nodemailer');

exports.startBot = async function (controller, bot) {
    
    let fruitList
    let totalOrder = [];
    let fruit = [];
    await (fetch('https://jigsaw-tutti.herokuapp.com/fruits')
        .then(res => res.text())
        .then(body => {
        fruitList = JSON.parse(body)
    }));
    controller.hears(['I want to order fruits', 'fruit order', 'start order'],'direct_message,direct_mention,mention', (bot, message) => startOrder(controller, bot, message, fruitList, fruit));
    controller.hears(fruit, 'direct_message,direct_mention,mention', (bot, message)  => updateOrder(controller, bot, message, totalOrder));
    controller.hears(['call me (.*)', 'my name is (.*)'], 'direct_message,direct_mention,mention', (bot, message) => getName(controller, bot, message));
    controller.hears(['confirm order', 'finalize order', 'order done'], 'direct_message,direct_mention,mention', (bot, message) => finishOrder(controller, bot, message, totalOrder));
    controller.hears(['(.*) help', 'help'],'direct_message,direct_mention,mention', (bot, message) => helpUser(controller, bot, message));
    controller.hears(['(.*)'],'direct_message,direct_mention,mention', (bot, message) => errorHandling(controller, bot, message));
}

function startOrder(controller, bot, message, fruitList, fruit) {

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
        startOrderText(bot, message, user)
            .then(() => { listFruit(bot, message, fruitList, fruit)})
    });
}    

function startOrderText(bot, message, user) {
    return new Promise(function(resolve) {
        if (user && user.name) {
            bot.reply(message, 'Ok ' + user.name + ' let us start your order!!', resolve);
        } else {
            bot.reply(message, 'Let us start your fruit order.', resolve);
        } 
    })
}

function listFruit(bot, message, fruitList, fruit) {
    fruitList.forEach(function(eachFruit) {
        fruit.push(eachFruit.name)
        bot.reply(message, `${eachFruit.name}, £${Number(eachFruit.price).toFixed(2)}`)
    })
}


function updateOrder(controller, bot, message, totalOrder) {
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
        let updatedBasket = totalOrder.map(item => `${item.name}: ${item.quantity}\n`).join("")
        bot.reply(message, `Got it! I will add ${message.text} to your basket.\nYour updated basket:\n${updatedBasket}`)
    });
}

function getName(controller, bot, message) {
    let name = message.match[1];
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
}

function finishOrder(controller, bot, message, totalOrder) {
    bot.startConversation(message, (err, convo) => {
        let orderList   = totalOrder.map(item => `${item.name}: ${item.quantity}\n`).join('')
        let orderAsHTML = totalOrder.map(item => `<li>${item.name}: ${item.quantity}</li>`).join('')
        convo.ask("Are you sure you'd like to order the following?\n\n" + orderList, [
            {
                pattern: bot.utterances.yes,
                callback: (res, convo) => {
                    convo.say("Let's send that order!")
                    convo.next();
                    let smtpTransport = nodemailer.createTransport({
                        service: "Gmail",
                        auth: {
                            user: process.env.EMAIL_ADDRESS,
                            pass: process.env.PASSWORD
                        }
                    })
                    let mailOptions = {
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
}

function helpUser(controller, bot, message) {
    controller.storage.users.get(message.user, function(err, user) {
        bot.reply(message, 'I am Tutti! The best fruit ordering bot in the world. This is how I can help you:')
    });
}

function errorHandling(controller, bot, message) {
    controller.storage.users.get(message.user, function(err, user) {
        bot.reply(message, 'Sorry, I don\'t recognize that command. Type help for the command list');
    });
}


