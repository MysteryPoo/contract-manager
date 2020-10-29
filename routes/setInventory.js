
const express = require('express');
const router = express.Router();
const materials = require('../materials');
const collections = require('../collections');
const cache = require('../cache');

const admin = require('firebase-admin');

const db = admin.firestore();

router.get('/', async function(req, res, next) {

    if (!req.user || !req.user.isAdmin) {
        req.flash('error', "Insufficient permissions for operation.");
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

    const stockRefQuery = await db.collection(collections["Inventory"]).orderBy("DateTime", "desc").limit(1).get();
    if (stockRefQuery.empty) {
        const error = "No inventory list found.";
        req.flash('error', error);
        console.log(error);
    }
    const stockRef = stockRefQuery.empty ? {} : stockRefQuery.docs[0].data();

    let materialList = {};

    for (let category in materials) {
        for (let material of materials[category]) {
            let materialNoSpace = material.replace(/ /g, "");
            if (materialList[category] == undefined) {
                materialList[category] = {};
            }
            materialList[category][materialNoSpace] = stockRef[material] || 0;
        }
    }

    res.render('setInventory', {
        title: `${config['Organization']} Set Inventory`,
        banner: process.env.banner,
        logo: process.env.logo,
        user: req.user,
        donate: config['Donation Enabled'],
        success: req.flash('success'),
        error: req.flash('error'),
        materialList: materialList
    });
});

router.post('/', async function(req, res, next) {

    if (!req.user || !req.user.isAdmin) {
        req.flash('error', "Insufficient permissions for operation.");
        res.redirect('/');
        return;
    }

    const dateEntered = new Date().toISOString();
    const docRef = db.collection(collections["Inventory"]).doc(dateEntered);

    var stockList = {
        'DateTime': dateEntered
    };

    for (let category in materials) {
        for (let material of materials[category]) {
            let materialNoSpace = material.replace(/ /g, "");
            stockList[material] = Number(req.body[`form-${materialNoSpace}`]);
        }
    }

    await docRef.set(stockList);

    cache.stockList = stockList;

    req.flash('success', "Updated inventory");
    res.redirect(req.baseUrl);
});

module.exports = router;
