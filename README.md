# README

### The What...

Tutti Frutti Bot (or @tutti for short!) is a Bot you can use within Slack to order fruit from fruitfortheoffice.com

### How to Use

We'd recommend by starting a direct conversation with @tutti.

You can still use the bot in other channels, however you would have to start by saying '@tutti' on each command.

### Commands

* To start a new order, use one of the following:

`
  start order
  fruit order
  I want to order fruits
`

This will list all of the available options and their prices, and allow you to start adding fruits to your basket.

* To add an item to your basket:

`
  <quantity> <itemName>
`

e.g.

`
  10 oranges
`

This will add the item to your basket and then show you your updated basket.

* To remove an item from your basket, simply use the same command with a negative value to reduce that item by a specific amount.

* If you need to check what's in your basket, simply say:

`
  show basket
`

* If you'd like to see the available fruits by a specific category:

`
  show me <categoryName>
`

Current options include:

1.  apples and pears
2.  citrus fruits
3.  bananas

* When you've finished your order and you're ready to send:

`
  confirm order
  order done
  finalize order 
`

@tutti will then show you your order and ask you to confirm if you want to send the order.  Simply reply with 'yes' or 'no'
