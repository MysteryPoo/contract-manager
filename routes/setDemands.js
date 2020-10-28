var express = require('express');
var router = express.Router();
const materials = require('../materials');
const collections = require('../collections');

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
    
    const demandRefQuery = await db.collection(collections['Demand-List']).orderBy("DateTime", "desc").limit(1).get();
    if (demandRefQuery.empty) {
        const error = "No demand list found.";
        console.log(error);
    }
    const demandRef = demandRefQuery.empty ? {
        'Demands': {
            'Medium': 1.0
        }
    } : demandRefQuery.docs[0].data();

    let demands = demandRef['Demands'];

    let materialList = {};

    for (let category in materials) {
        for (let material of materials[category]) {
            let materialNoSpace = material.replace(/ /g, "");
            if (materialList[category] == undefined) {
                materialList[category] = {};
            }
            if (demandRef[material]) {
                console.log(`Demand for ${material} exists...`);
                if (typeof demandRef[material] === "string") {
                    console.log(`Demand was legacy, updating...`);
                    materialList[category][materialNoSpace] = {
                        'Buy': demandRef[material],
                        'Sell': demandRef[material]
                    };
                } else {
                    console.log(`Demand is valid: ${demandRef[material]}`);
                    materialList[category][materialNoSpace] = demandRef[material];
                }
            } else {
                console.log(`Demand for ${material} does not exist, defaulting...`);
                materialList[category][materialNoSpace] = {
                    'Buy': Object.keys(demands)[0],
                    'Sell': Object.keys(demands)[0]
                };
            }
            
        }
    }

    res.render('setDemands', {
        title: `${config['Organization']} Set Demands`,
        banner: process.env.banner,
        logo: process.env.logo,
        user: req.user,
        success: req.flash('success'),
        error: req.flash('error'),
        donate: config['Donation Enabled'],
        demands: demands,
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
    const docRef = db.collection(collections['Demand-List']).doc(dateEntered);

    let demandCount = Number(req.body['demand-count']);
    let demands =  {};
    for (let i = 1; i <= demandCount; ++i) {
        let name = req.body[`demand-${i}-name`];
        let value = Number(req.body[`demand-${i}-value`]);
        demands[name] = value;
    }

    let demandDoc = {
        'DateTime': dateEntered,
        'Demands': demands
    };

    for (let category in materials) {
        for (let material of materials[category]) {
            let materialNoSpace = material.replace(/ /g, "");
            demandDoc[material] = {
                'Buy': req.body[`form-buy-${materialNoSpace}`],
                'Sell': req.body[`form-sell-${materialNoSpace}`]
            }
        }
    }

    await docRef.set(demandDoc);
    
    req.flash('success', "Updated demands");
    res.redirect(req.baseUrl);
});

module.exports = router;
