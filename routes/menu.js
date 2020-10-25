var express = require('express');
var router = express.Router();

const collections = require('../collections');
const admin = require('firebase-admin');
const db = admin.firestore();

router.get('/', async function(req, res, next) {

    const configRefQuery = await db.collection(collections['Settings']).doc('Config').get();
    if (configRefQuery.empty) {
        let error = "Fatal error: No server configuration found.";
        console.log(error);
        res.send(error);
        return;
    }
    const config = configRefQuery.data();

    const buyOrdersEnabled = config['Buy Orders Enabled'] ? config['Buy Orders Enabled'] : false;
    const sellOrdersEnabled = config['Sell Orders Enabled'] ? config['Sell Orders Enabled'] : false;

    res.render('menu', {
        title: `${config['Organization']} Material Exchange`,
        banner: process.env.banner,
        logo: process.env.logo,
        user: req.user,
        success: req.flash('success'),
        error: req.flash('error'),
        donate: config['Donation Enabled'],
        buyOrdersEnabled: buyOrdersEnabled,
        sellOrdersEnabled: sellOrdersEnabled
    });
});

module.exports = router;