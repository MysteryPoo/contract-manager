var express = require('express');
var router = express.Router();

const admin = require('firebase-admin');
const db = admin.firestore();

const collections = require('../collections');

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
    });
});

module.exports = router;
