const fetch = require('node-fetch');
const nodemailer = require('nodemailer');

exports.startBot = async function (controller, bot) {
    
    let fruitList;
    let fruitNames    = [];
    let totalOrder    = [];
    let categories;
    let categoryNames = [];
    let categoryCommands;
    await (fetch('https://jigsaw-tutti.herokuapp.com/fruits')
    // await (fetch('http://localhost:3000/fruits')
        .then(res => res.text())
        .then(body => {
        let info = JSON.parse(body);
        fruitList  = info.fruits;
        categories = info.categories;
        categories.forEach(category => categoryNames.push(category.name));
        fruitList.forEach(fruit => fruitNames.push(fruit.name));
        categoryCommands = categoryNames.map(category => `show me ${category}`)
    }));
    controller.hears(['I want to order fruits', 'fruit order', 'start order'],'direct_message,direct_mention,mention', (bot, message) => startOrder(controller, bot, message, fruitList, categories));
    controller.hears(['show basket'], 'direct_message,direct_mention,mention', (bot, message) => showBasket(controller, bot, message, totalOrder));
    controller.hears(categoryCommands, 'direct_message,direct_mention,mention', (bot, message) => filterCategory(controller, bot, message, categories, fruitList))
    controller.hears(fruitNames, 'direct_message,direct_mention,mention', (bot, message)  => updateOrder(controller, bot, message, totalOrder, fruitList));
    controller.hears(['call me (.*)', 'my name is (.*)'], 'direct_message,direct_mention,mention', (bot, message) => getName(controller, bot, message));
    controller.hears(['confirm order', 'finalize order', 'order done'], 'direct_message,direct_mention,mention', (bot, message) => finishOrder(controller, bot, message, totalOrder));
    controller.hears(['(.*) help', 'help'],'direct_message,direct_mention,mention', (bot, message) => helpUser(controller, bot, message));
    controller.hears(['(.*)'],'direct_message,direct_mention,mention', (bot, message) => errorHandling(controller, bot, message));
}

function startOrder(controller, bot, message, fruitList, categories) {
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
            .then(() => { listFruit(bot, message, fruitList, categories)})
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

function listFruit(bot, message, fruitList, categories) {
    let fruitMenu = '';
    categories.forEach(category => {
        let fruitsInCategory = fruitList.filter(fruit => fruit.categoryId === category._id).map(fruit => `${fruit.name}: £${fruit.price.toFixed(2)}`).join("\n")
        fruitMenu += `*${category.name}:*\n${fruitsInCategory}\n\n`
    })
    bot.reply(message, fruitMenu);
}

function filterCategory(controller, bot, message, categories, fruitList) {
    let selectedCategory = message.text.split('show me ')[1].trim();
    let category         = categories.filter(cat => cat.name.toLowerCase() === selectedCategory.toLowerCase())[0];
    let fruitsInCategory = fruitList.filter(fruit => fruit.categoryId === category._id).map(fruit => `${fruit.name}: £${fruit.price.toFixed(2)}`).join("\n");
    let botResponse      = `*${category.name}:*\n${fruitsInCategory}`;
    bot.reply(message, botResponse);
}

function showBasket(controller, bot, message, totalOrder) {
    let botResponse;
    if (totalOrder.length) {
        let basketToString = totalOrder.map(item => `${item.name}: ${item.quantity} - £${(item.price * item.quantity).toFixed(2)} \n`).join('');
        botResponse = `Your basket:\n${basketToString}----------------------\n Your total is £${totalOrder.map(e => e.quantity * e.price).reduce(getSum).toFixed(2)}`;
    } else {
        botResponse = "Your basket is currently empty";
    }
    bot.reply(message, botResponse)
}

function updateOrder(controller, bot, message, totalOrder, fruitList) {
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
    let price    = fruitList.filter(e => e.name.toLowerCase() === name.toLowerCase())[0].price

    controller.storage.users.get(message.user, (err, user) => {
        if (!user) {
            user = {
                id: message.user,
            };
        }

        let existingItem = totalOrder.filter(item => item.name.toLowerCase() === name.toLowerCase())[0]
        if (existingItem) {
            let newQuantity = existingItem.quantity + quantity;
            existingItem.quantity = newQuantity;
            if (existingItem.quantity <= 0) {
                let i = totalOrder.indexOf(existingItem);
                totalOrder.splice(i, 1);
            }
        } else {
            if(quantity > 0) {
                totalOrder.push({
                    name    : name.toLowerCase(),
                    quantity: quantity,
                    price   : price
                });
            }
        }

        if (totalOrder.length > 0) {
            let updatedBasket = totalOrder.map(item => `${item.name}: ${item.quantity} - £${(item.price * item.quantity).toFixed(2)} \n`).join('')
                if(quantity>=0) {
                    bot.reply(message, `Got it! I will add ${quantity} ${name} to your basket.\nYour updated basket:\n${updatedBasket}----------------------\n Your total is £${totalOrder.map(e => e.quantity * e.price).reduce(getSum).toFixed(2)}`)
                } else {
                    bot.reply(message, `Got it! I will remove ${quantity} ${name} from your basket.\nYour updated basket:\n${updatedBasket}----------------------\n Your total is £${totalOrder.map(e => e.quantity * e.price).reduce(getSum).toFixed(2)}`)
                }
        } else {
            bot.reply(message, "Your basket is now empty.")
        }

    });
}


function getSum(total, num) {
    return total + num
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
    if(totalOrder.length > 0) {
        bot.startConversation(message, (err, convo) => {
        let orderList   = totalOrder.map(item => `${item.name}: ${item.quantity} - £${(item.price * item.quantity).toFixed(2)} \n`).join('')
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
                        html: orderAsHTMLBuilder(totalOrder) // html body
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
        ])})
    } else {
        bot.reply(message, 'Your basket is empty. Please type help to find out how to add items to your basket.')
    }
}

function orderAsHTMLBuilder(totalOrder) {
   return 'Here is this week\'s order: </br>' + '<ul>' + totalOrder.map(item => `<li>${item.name}: ${item.quantity} - £${(item.price * item.quantity).toFixed(2)}</li>`).join('') + '</ul>' + `</br> Total: £${totalOrder.map(e => e.quantity * e.price).reduce(getSum).toFixed(2)}`
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


