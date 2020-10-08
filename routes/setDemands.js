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
    let oreValues = {};
    let mineralValues = {};
    let planetaryValues = {};
    let salvageValues = {};
    let datacoreValues = {};

    for (ore of materials.ores) {
        let oreNoSpace = ore.replace(/ /g, "");
        oreValues[oreNoSpace] = demandRef[ore] || 'Medium';
        console.log(oreValues[oreNoSpace]);
    }

    for (mineral of materials.minerals) {
        let mineralNoSpace = mineral.replace(/ /g, "");
        mineralValues[mineralNoSpace] = demandRef[mineral] || 'Medium';
    }

    for (planetary of materials.planetary) {
        let planetaryNoSpace = planetary.replace(/ /g, "");
        planetaryValues[planetaryNoSpace] = demandRef[planetary] || 'Medium';
    }

    for (salvage of materials.salvage) {
        let salvageNoSpace = salvage.replace(/ /g, "");
        salvageValues[salvageNoSpace] = demandRef[salvage] || 'Medium';
    }

    for (datacore of materials.datacores) {
        let datacoreNoSpace = datacore.replace(/ /g, "");
        datacoreValues[datacoreNoSpace] = demandRef[datacore] || 'Medium';
    }

    res.render('setDemands', {
        title: `${config['Organization']} Set Demands`,
        banner: process.env.banner,
        logo: process.env.logo,
        demands: demands,
        ores: oreValues,
        minerals: mineralValues,
        planetary: planetaryValues,
        salvage: salvageValues,
        datacores: datacoreValues
    });
});

router.post('/', async function(req, res, next) {
    let message = "OK";

    console.log(req.body);

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

        for (ore of materials.ores) {
            let oreNoSpace = ore.replace(/ /g, "");
            demandDoc[ore] = req.body[`form-${oreNoSpace}`];
        }
    
        for (mineral of materials.minerals) {
            let mineralNoSpace = mineral.replace(/ /g, "");
            demandDoc[mineral] = req.body[`form-${mineralNoSpace}`];
        }
    
        for (planetary of materials.planetary) {
            let planetaryNoSpace = planetary.replace(/ /g, "");
            demandDoc[planetary] = req.body[`form-${planetaryNoSpace}`];
        }
    
        for (salvage of materials.salvage) {
            let salvageNoSpace = salvage.replace(/ /g, "");
            demandDoc[salvage] = req.body[`form-${salvageNoSpace}`];
        }
    
        for (datacore of materials.datacores) {
            let datacoreNoSpace = datacore.replace(/ /g, "");
            demandDoc[datacore] = req.body[`form-${datacoreNoSpace}`];
        }

        console.log(demandDoc);

        await docRef.set(demandDoc);
    } else {
        message = "BAD PASSWORD";
    }
    res.send(message);
});

module.exports = router;
