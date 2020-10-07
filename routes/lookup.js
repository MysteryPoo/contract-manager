var express = require('express');
var router = express.Router();

const materials = require('../materials');
const collections = require('../collections');
const admin = require('firebase-admin');

const db = admin.firestore();

router.get('/:ticketNumber', async function(req, res, next) {
    res.redirect(`/lookup/sell/${req.params.ticketNumber}`);
});

router.get('/:type/:ticketNumber', async function(req, res, next) {

    let typeNoCase = req.params.type.charAt(0).toUpperCase() + req.params.type.slice(1).toLowerCase();
    const ticketNumber = req.params.ticketNumber;

    const orderRefQuery = await db.collection(collections[`${typeNoCase}-Orders`]).where("TicketNumber", "==", Number(ticketNumber)).get();
    if (orderRefQuery.empty) {
        let error = `Cannot find order with ticket number: ${ticketNumber}`;
        console.log(error);
        res.send(error);
        return;
    }
    const orderRef = orderRefQuery.docs[0].data();

    const priceRefQuery = await db.collection(collections['Price-List']).where('DateTime', "==", orderRef['Price-DateTime']).get();
    if (priceRefQuery.empty) {
        let error = `Cannot find price reference sheet dated: ${orderRef['Price-DateTime']}`;
        console.log(error);
        res.send(error);
        return;
    }
    const priceRef = priceRefQuery.docs[0].data();

    const demandRefQuery = await db.collection(collections['Demand-List']).where('DateTime', "==", orderRef['Demand-DateTime']).get();
    if (demandRefQuery.empty) {
        let error = `Cannot find demand reference sheet dated: ${orderRef['Demand-DateTime']}`;
        console.log(error);
        res.send(error);
        return;
    }
    const demandRef = demandRefQuery.docs[0].data();

    let priceTotal = 0;

    let materialOrder = {};
    let priceRefNoSpace = {};

    for (let category in materials) {
        for (let material of materials[category]) {
            let materialNoSpace = material.replace(/ /g, "");
            if (orderRef[material] !== 0) {
                materialOrder[materialNoSpace] = orderRef[material];
                priceTotal += orderRef[material] * priceRef[material] * demandRef['Demands'][demandRef[material]];
                priceRefNoSpace[materialNoSpace] = priceRef[material] * priceRef[`${typeNoCase} Weight`] * demandRef['Demands'][demandRef[material]];
            }
        }
    }
    priceTotal *= priceRef[`${typeNoCase} Weight`];

    res.render('lookup', {
        title: 'Contract Lookup',
        ticketNumber: Number(ticketNumber),
        datetime: orderRef['DateTime'],
        contractType: typeNoCase,
        status: orderRef['Status'],
        materials: materials,
        materialOrder: materialOrder,
        priceTotal: priceTotal,
        characterName: orderRef['CharacterName'],
        discordName: orderRef['DiscordName'],
        priceRef: priceRefNoSpace
    });
});

router.post('/accept', async function(req, res, next) {
    let message = "";

    const contractType = req.body.formType;
    const ticketNumber = Number(req.body.formTicketNumber);
    const password = req.body.formPassword;

    const configRefQuery = await db.collection(collections['Settings']).doc('Config').get();
    if (configRefQuery.empty) {
        let error = "Fatal error: No server configuration found.";
        console.log(error);
        res.send(error);
        return;
    }
    const config = configRefQuery.data();

    if (password === config['Password']) {
        const orderRefQuery = await db.collection(collections[`${contractType}-Orders`]).where('TicketNumber', "==", ticketNumber).get();
        if (orderRefQuery.empty) {
            let error = `Cannot find order with ticket number: ${ticketNumber}`;
            console.log(error);
            res.send(error);
            return;
        }
        let orderRef = orderRefQuery.docs[0].data();

        if (orderRef['Status'] !== "Pending") {
            let error = `You cannot modify this order ${ticketNumber}`;
            console.log(error);
            res.send(error);
        }
    
        await db.collection(collections[`${contractType}-Orders`]).doc(ticketNumber.toString()).update({
            'Status': 'Accepted'
        });
        message = `Ticket number (${ticketNumber})(${contractType}) accepted and moved to 'Accepted' status.`;
        console.log(message);
    } else {
        message = 'BAD PASSWORD';
    }

    res.send(message);
});

router.post('/reject', async function(req, res, next) {

    let message = "";

    const contractType = req.body.formType;
    const ticketNumber = Number(req.body.formTicketNumber);
    const password = req.body.formPassword;

    const configRefQuery = await db.collection(collections['Settings']).doc('Config').get();
    if (configRefQuery.empty) {
        let error = "Fatal error: No server configuration found.";
        console.log(error);
        res.send(error);
    }
    const config = configRefQuery.data();

    if (password === config['Password']) {
        const orderRefQuery = await db.collection(collections[`${contractType}-Orders`]).where('TicketNumber', "==", ticketNumber).get();
        if (orderRefQuery.empty) {
            let error = `Cannot find order with ticket number: ${ticketNumber}`;
            console.log(error);
            res.send(error);
            return;
        }
        let orderRef = orderRefQuery.docs[0].data();

        if (orderRef['Status'] !== "Pending") {
            let error = `You cannot modify this order ${ticketNumber}`;
            console.log(error);
            res.send(error);
        }
    
        await db.collection(collections[`${contractType}-Orders`]).doc(ticketNumber.toString()).update({
            'Status': 'Rejected'
        });
        message = `Ticket number (${ticketNumber})(${contractType}) rejected and moved to 'Rejected' status.`;
        console.log(message);
    } else {
        message = 'BAD PASSWORD';
    }

    res.send(message);
});

module.exports = router;
