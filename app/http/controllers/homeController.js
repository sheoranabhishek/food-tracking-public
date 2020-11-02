const Menu = require('../../models/menu')
function homeController() {
    return {
        async index(req, res) {
            const items = await Menu.find()
            return res.render('home', { items : items })
        } , 
        aboutme(req ,res) {
            return res.render('aboutme')
        }
    }
}

module.exports = homeController