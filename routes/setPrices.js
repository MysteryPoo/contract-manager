var express = require('express');
var router = express.Router();
const materials = require('../materials');
const collections = require('../collections');

const admin = require('firebase-admin');

const db = admin.firestore();

router.get('/', async function(req, res, next) {

    if (!req.user || !req.user.isAdmin) {
        res.redirect('/');
        return;
    }

    const configRefQuery = await db.collection(collections['Settings']).doc('Config').get();
    if (configRefQuery.empty) {
        let error = "Fatal error: No server configuration found.";
        console.log(error);
        res.send(error);
        return;
    }
    const config = configRefQuery.data();

    const priceRefQuery = await db.collection(collections["Price-List"]).orderBy("DateTime", "desc").limit(1).get();
    if (priceRefQuery.empty) {
        const error = "No price list found.";
        console.log(error);
    }
    const priceRef = priceRefQuery.empty ? {} : priceRefQuery.docs[0].data();

    let materialList = {};

    let weights = {
        'sell_weight': Number(priceRef['Sell Weight']),
        'buy_weight': Number(priceRef['Buy Weight'])
    };

    for (let category in materials) {
        for (let material of materials[category]) {
            let materialNoSpace = material.replace(/ /g, "");
            if (materialList[category] == undefined) {
                materialList[category] = {};
            }
            materialList[category][materialNoSpace] = priceRef[material] || 0;
        }
    }

    res.render('setPrices', {
        title: `${config['Organization']} Set Prices`,
        banner: process.env.banner,
        logo: process.env.logo,
        donate: config['Donation Enabled'],
        weights: weights,
        materialList: materialList
    });
});

router.post('/', async function(req, res, next) {

    if (!req.user || !req.user.isAdmin) {
        res.redirect('/');
        return;
    }

    let message = "OK";

    const configRefQuery = await db.collection(collections['Settings']).doc('Config').get();
    if (configRefQuery.empty) {
        let error = "Fatal error: No server configuration found.";
        console.log(error);
        res.send(error);
        return;
    }
    const config = configRefQuery.data();

    if (req.body['form-password'] === config['Password']) {
        console.log("Password OK");

        const dateEntered = new Date().toISOString();
        const docRef = db.collection(collections["Price-List"]).doc(dateEntered);

        var priceList = {
            'DateTime': dateEntered,
            'Sell Weight': Number(req.body['form-sell-weight']),
            'Buy Weight': Number(req.body['form-buy-weight'])
        };

        for (let category in materials) {
            for (let material of materials[category]) {
                let materialNoSpace = material.replace(/ /g, "");
                priceList[material] = Number(req.body[`form-${materialNoSpace}`]);
            }
        }

        await docRef.set(priceList);
    } else {
        message = "BAD PASSWORD";
    }
    res.send(message);
});

module.exports = router;
