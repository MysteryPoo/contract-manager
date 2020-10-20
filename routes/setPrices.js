var express = require('express');
var router = express.Router();
const materials = require('../materials');
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
            if (materialList[category][materialNoSpace] == undefined) {
                materialList[category][materialNoSpace] = {};
            }
            materialList[category][materialNoSpace] = priceRef[material] || 0;
        }
    }

    res.render('setPrices', {
        title: `${config['Organization']} Set Prices`,
        banner: process.env.banner,
        logo: process.env.logo,
        weights: weights,
        materialList: materialList
    });
});

router.post('/', async function(req, res, next) {
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

        for (ore of materials.ores) {
            let oreNoSpace = ore.replace(/ /g, "");
            priceList[ore] = Number(req.body[`form-${oreNoSpace}`]);
        }
    
        for (mineral of materials.minerals) {
            let mineralNoSpace = mineral.replace(/ /g, "");
            priceList[mineral] = Number(req.body[`form-${mineralNoSpace}`]);
        }
    
        for (planetary of materials.planetary) {
            let planetaryNoSpace = planetary.replace(/ /g, "");
            priceList[planetary] = Number(req.body[`form-${planetaryNoSpace}`]);
        }
    
        for (salvage of materials.salvage) {
            let salvageNoSpace = salvage.replace(/ /g, "");
            priceList[salvage] = Number(req.body[`form-${salvageNoSpace}`]);
        }
    
        for (datacore of materials.datacores) {
            let datacoreNoSpace = datacore.replace(/ /g, "");
            priceList[datacore] = Number(req.body[`form-${datacoreNoSpace}`]);
        }

        await docRef.set(priceList);
    } else {
        message = "BAD PASSWORD";
    }
    res.send(message);
});

module.exports = router;
