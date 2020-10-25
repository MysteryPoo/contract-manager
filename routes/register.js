var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');

const admin = require('firebase-admin');
const db = admin.firestore();

const collections = require('../collections');
const cache = require('../cache');

router.get('/', async function(req, res, next) {
    console.log("Requesting registration");
    const configRefQuery = await db.collection(collections['Settings']).doc('Config').get();
    if (configRefQuery.empty) {
        let error = "Fatal error: No server configuration found.";
        console.log(error);
        res.send(error);
        return;
    }
    const config = configRefQuery.data();

    res.render('register', {
        title: `${config['Organization']} Registration`,
        banner: process.env.banner,
        logo: process.env.logo,
        messages: req.flash('error')
    });
});

router.post('/', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        cache.users.push({
            id: Date.now().toString(),
            charactername: req.body.charactername,
            discordname: req.body.discordname,
            email: req.body.email,
            password: hashedPassword,
            isAdmin: false
        });
        req.flash('success', 'User created successfully');
        res.redirect('/login');
    } catch (e) {
        console.log(e);
        req.flash('error', 'Unable to create user');
        res.redirect('/register');
    }
});

module.exports = router;
