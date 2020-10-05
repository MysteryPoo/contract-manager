var express = require('express');
var router = express.Router();

const admin = require('firebase-admin');
const db = admin.firestore();

router.get('/', async function(req, res, next) {
    const configRefQuery = await db.collection('Settings').doc('Config').get();
    if (configRefQuery.empty) {
        let error = "Fatal error: No server configuration found.";
        console.log(error);
        res.send(error);
        return;
    }
    const config = configRefQuery.data();

    res.render('menu', {
        title: `${config['Organization']} Material Exchange`
    });
});

module.exports = router;