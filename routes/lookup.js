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
    
    let typeNoCase = "Sell";
    const sellOrderRefQuery = await db.collection(collections[`${typeNoCase}-Orders`]).where("Status", "!=", "Preview").get();
    if (sellOrderRefQuery.empty) {
        let error = `Cannot find any orders.`;
        console.log(error);
        res.send(error);
        return;
    }
    const sellOrderRefs = sellOrderRefQuery.docs;

    typeNoCase = "Buy";
    const buyOrderRefQuery = await db.collection(collections[`${typeNoCase}-Orders`]).where("Status", "!=", "Preview").get();
    if (buyOrderRefQuery.empty) {
        let error = `Cannot find any orders.`;
        console.log(error);
        res.send(error);
        return;
    }
    const buyOrderRefs = buyOrderRefQuery.docs;

    let orderList = {
        'sell': {
            'pending': [],
            'accepted': [],
            'rejected': []
        },
        'buy': {
            'pending': [],
            'accepted': [],
            'rejected': []
        }
    };
    for (let type of [sellOrderRefs, buyOrderRefs]) {
        for (let order of type) {
            let typeString = undefined;
            if (type === sellOrderRefs) {
                typeString = 'sell';
            } else if (type === buyOrderRefs) {
                typeString = 'buy';
            } else {
                const error = `Unknown order type (${type}). Bailing out.`;
                console.log(error);
                res.send(error);
                return;
            }
            let orderData = order.data();
            orderList[typeString][orderData['Status'].toLowerCase()].push(orderData);
        }
    }

    res.render('lookupList', {
        title: `${config['Organization']} Contract Lookup`,
        banner: process.env.banner,
        logo: process.env.logo,
        orderList: orderList
    });
});

router.get('/:type/:ticketNumber', async function(req, res, next) {

    const configRefQuery = await db.collection(collections['Settings']).doc('Config').get();
    if (configRefQuery.empty) {
        let error = "Fatal error: No server configuration found.";
        console.log(error);
        res.send(error);
        return;
    }
    const config = configRefQuery.data();

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
                let demand = Object.keys(demandRef['Demands'])[0];
                // Backwards compatibility
                if (typeof demandRef[material] === "string") {
                    demand = demandRef[material];
                } else if (demandRef[material] !== undefined) {
                    demand = demandRef[material][typeNoCase];
                }
                // End of backwards compatibility
                let basePrice = priceRef[material] || 0;
                priceTotal += orderRef[material] * basePrice * demandRef['Demands'][demand];
                priceRefNoSpace[materialNoSpace] = basePrice * priceRef[`${typeNoCase} Weight`] * demandRef['Demands'][demand];
            }
        }
    }
    priceTotal *= priceRef[`${typeNoCase} Weight`];

    res.render('lookup', {
        title: `${config['Organization']} Contract Lookup`,
        banner: process.env.banner,
        logo: process.env.logo,
        donate: config['Donation Enabled'],
        ticketNumber: Number(ticketNumber),
        priceDatetime: orderRef['Price-DateTime'],
        demandDateTime: orderRef['Demand-DateTime'],
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
