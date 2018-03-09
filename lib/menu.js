module.exports = class Menu {
  constructor(fruitList, categories) {
    this.fruitList = fruitList
    this.categories = categories
  } 
  
  list(bot, message) {
  let fruitMenu = '';
  this.categories.forEach(category => {
      let fruitsInCategory = this.fruitList.filter(fruit => fruit.categoryId === category._id).map(fruit => `${fruit.name}: £${fruit.price.toFixed(2)}`).join("\n")
      fruitMenu += `*${category.name}:*\n${fruitsInCategory}\n\n`
      return fruitMenu;
    })
    return bot.reply(message, fruitMenu);
  }
}