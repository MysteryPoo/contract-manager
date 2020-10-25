var express = require('express');
var router = express.Router();
const passport = require('passport');

const admin = require('firebase-admin');
const db = admin.firestore();

const collections = require('../collections');

router.get('/', async function(req, res, next) {
    console.log("Requesting login");
    const configRefQuery = await db.collection(collections['Settings']).doc('Config').get();
    if (configRefQuery.empty) {
        let error = "Fatal error: No server configuration found.";
        console.log(error);
        res.send(error);
        return;
    }
    const config = configRefQuery.data();

    res.render('login', {
        title: `${config['Organization']} Login`,
        banner: process.env.banner,
        logo: process.env.logo,
        success: req.flash('success'),
        error: req.flash('error'),
        donate: config['Donation Enabled']
    });
});

router.post('/', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}));

module.exports = router;
