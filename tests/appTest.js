let chai = require("chai")
let expect = chai.assert
let startBot = require('../app.js').startBot;

describe('#startBot', () => {
    it('expects fruitList to be defined', () => {
        startBot()
        expect(fruitList).toBeDefined()
    })
})