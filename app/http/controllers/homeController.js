const Menu = require('../../models/menu')
function homeController() {
    return {
        async index(req, res) {
            let items = [];
            try {
                items = await Menu.find()
            } catch (err) {
                console.log(err);
            }

            return res.render('home', { items: items })
        },
        aboutme(req, res) {
            return res.render('aboutme')
        }
    }
}

module.exports = homeController