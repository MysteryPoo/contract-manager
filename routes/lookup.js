var express = require('express');
var router = express.Router();

const materials = require('../materials');
const admin = require('firebase-admin');

const db = admin.firestore();

router.get('/:ticketNumber', async function(req, res, next) {
    res.redirect(`/lookup/sell/${req.params.ticketNumber}`);
});

router.get('/:type/:ticketNumber', async function(req, res, next) {

    let typeNoCase = req.params.type.charAt(0).toUpperCase() + req.params.type.slice(1).toLowerCase();

    const orderRefQuery = await db.collection(`${typeNoCase}-Orders`).where('TicketNumber', "==", Number(req.params.ticketNumber)).get();
    if (orderRefQuery.empty) {
        let error = `Cannot find order with ticket number: ${req.params.ticketNumber}`;
        console.log(error);
        res.send(error);
        return;
    }
    let orderRef = orderRefQuery.docs[0].data();

    const priceRefQuery = await db.collection('Price-List').where('DateTime', "==", orderRef['DateTime']).get();
    if (priceRefQuery.empty) {
        let error = `Cannot find price reference sheet dated: ${orderRef['DateTime']}`;
        console.log(error);
        res.send(error);
        return;
    }
    let priceRef = priceRefQuery.docs[0].data();

    let priceTotal = 0;

    let materialOrder = {};
    // TODO : This is stupid, do better
    let priceRefNoSpace = {};

    for (material of materials.ores) {
        let materialNoSpace = material.replace(/ /g, "");
        if (orderRef[material] !== 0) {
            materialOrder[materialNoSpace] = orderRef[material];
            priceTotal += orderRef[material] * priceRef[material];
            priceRefNoSpace[materialNoSpace] = priceRef[material] * priceRef[`${typeNoCase} Weight`];
        }
    }

    for (material of materials.minerals) {
        let materialNoSpace = material.replace(/ /g, "");
        if (orderRef[material] !== 0) {
            materialOrder[materialNoSpace] = orderRef[material];
            priceTotal += orderRef[material] * priceRef[material];
            priceRefNoSpace[materialNoSpace] = priceRef[material] * priceRef[`${typeNoCase} Weight`];
        }
    }

    for (material of materials.planetary) {
        let materialNoSpace = material.replace(/ /g, "");
        if (orderRef[material] !== 0) {
            materialOrder[materialNoSpace] = orderRef[material];
            priceTotal += orderRef[material] * priceRef[material];
            priceRefNoSpace[materialNoSpace] = priceRef[material] * priceRef[`${typeNoCase} Weight`];
        }
    }

    for (material of materials.salvage) {
        let materialNoSpace = material.replace(/ /g, "");
        if (orderRef[material] !== 0) {
            materialOrder[materialNoSpace] = orderRef[material];
            priceTotal += orderRef[material] * priceRef[material];
            priceRefNoSpace[materialNoSpace] = priceRef[material] * priceRef[`${typeNoCase} Weight`];
        }
    }

    for (material of materials.datacores) {
        let materialNoSpace = material.replace(/ /g, "");
        if (orderRef[material] !== 0) {
            materialOrder[materialNoSpace] = orderRef[material];
            priceTotal += orderRef[material] * priceRef[material];
            priceRefNoSpace[materialNoSpace] = priceRef[material] * priceRef[`${typeNoCase} Weight`];
        }
    }
    priceTotal *= priceRef[`${typeNoCase} Weight`];

    res.render('lookup', {
        title: 'Contract Lookup',
        ticketNumber: Number(req.params.ticketNumber),
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

    const configRefQuery = await db.collection('Settings').doc('Config').get();
    if (configRefQuery.empty) {
        let error = "Fatal error: No server configuration found.";
        console.log(error);
        res.send(error);
    }
    const config = configRefQuery.data();

    if (password === config['Password']) {
        const orderRefQuery = await db.collection(`${contractType}-Orders`).where('TicketNumber', "==", ticketNumber).get();
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
    
        await db.collection(`${contractType}-Orders`).doc(ticketNumber.toString()).update({
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

    const configRefQuery = await db.collection('Settings').doc('Config').get();
    if (configRefQuery.empty) {
        let error = "Fatal error: No server configuration found.";
        console.log(error);
        res.send(error);
    }
    const config = configRefQuery.data();

    if (password === config['Password']) {
        const orderRefQuery = await db.collection(`${contractType}-Orders`).where('TicketNumber', "==", ticketNumber).get();
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
    
        await db.collection(`${contractType}-Orders`).doc(ticketNumber.toString()).update({
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
