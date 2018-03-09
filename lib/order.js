module.exports = class Order {
  constructor(controller, bot, message, menu) {
    this.controller = controller;
    this.bot = bot;
    this.message = message;
    this.menu = menu;
  } 

  _startOrderText(user) {
  return new Promise((resolve) => {
      if (user && user.name) {
          this.bot.reply(this.message, 'Ok ' + user.name + ' let us start your order!!', resolve);
      } else {
          this.bot.reply(this.message, 'Let us start your fruit order.', resolve);
      } 
  })
}

_addReaction(name) {
  this.bot.api.reactions.add({
    timestamp: this.message.ts,
    channel: this.message.channel,
    name: name,
  }, (err) => {
      if (err) {
          bot.botkit.log('Failed to add emoji reaction :(', err);
      }
  });
}

start() {
  this._addReaction('green_apple')
  return this.controller.storage.users.get(this.message.user, (err, user) => this._startOrderText(user)
    .then(() => this.menu.list(this.bot, this.message)));
}    


update(controller, bot, message, totalOrder, fruitList) {
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

finish(controller, bot, message, totalOrder) {
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
  
} 
