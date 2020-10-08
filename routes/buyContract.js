var express = require('express');
var router = express.Router();
const materials = require('../materials');
const collections = require('../collections');

const admin = require('firebase-admin');

const db = admin.firestore();

router.post('/', async function(req, res, next) {

    let ticketNumber = 1;
    const ordersRefQuery = await db.collection(collections['Buy-Orders']).orderBy("TicketNumber", "desc").limit(1).get();
    let orderRef = undefined;
    if (!ordersRefQuery.empty) {
        orderRef = ordersRefQuery.docs[0].data();
        ticketNumber = Number(orderRef['TicketNumber']) + 1;
    }

    const priceRefQuery = await db.collection(collections['Price-List']).orderBy("DateTime", "desc").limit(1).get();
    const priceRef = priceRefQuery.docs[0].data();

    const demandRefQuery = await db.collection(collections['Demand-List']).orderBy("DateTime", "desc").limit(1).get();
    const demandRef = demandRefQuery.docs[0].data();

    let order = {
        'Price-DateTime': priceRef['DateTime'],
        'Demand-DateTime': demandRef['DateTime'],
        'CharacterName': req.body['form-character-name'],
        'DiscordName': req.body['form-discord-name'],
        'TicketNumber': ticketNumber,
        'Status': "Preview"
    };

    let materialList = {};

    let priceTotal = 0;

    for (let category in materials) {
        for (let material of materials[category]) {
            let materialNoSpace = material.replace(/ /g, "");
            priceTotal += Number(req.body[`form-${materialNoSpace}`]) * priceRef[material] * demandRef['Demands'][demandRef[material]];
            order[material] = Number(req.body[`form-${materialNoSpace}`]);
            if (order[material] > 0) {
                materialList[materialNoSpace] = order[material];
            }
        }
    }
    priceTotal *= priceRef['Buy Weight'];
    order['CachedValue'] = priceTotal;
    
    await db.collection(collections['Buy-Orders']).doc(ticketNumber.toString()).set(order);

    res.render('buyContract', {
        title: `${config['Organization']} Buy Contract`,
        banner: process.env.banner,
        logo: process.env.logo,
        status: 'Preview',
        ticket: ticketNumber,
        total: priceTotal,
        materialOrder: materialList
    });
});

router.post('/confirm', async function(req, res, next) {
    const ticketNumber = req.body.formTicketNumber;

    const configRefQuery = await db.collection(collections['Settings']).doc('Config').get();
    if (configRefQuery.empty) {
        let error = "Fatal error: No server configuration found.";
        console.log(error);
        res.send(error);
        return;
    }
    const config = configRefQuery.data();

    const orderRefQuery = await db.collection(collections['Buy-Orders']).where("TicketNumber", "==", Number(ticketNumber)).get();
    if (orderRefQuery.empty) {
        let error = `Cannot find order with ticket number: ${ticketNumber}`;
        console.log(error);
        res.send(error);
        return;
    }
    const orderRef = orderRefQuery.docs[0].data();

    if (orderRef['Status'] !== "Preview") {
        let error = `You cannot modify this order ${ticketNumber}`;
        console.log(error);
        res.send(error);
    }

    await db.collection(collections['Buy-Orders']).doc(ticketNumber).update({
        'Status': 'Pending'
    });
    console.log(`Ticket number (${ticketNumber})(Buy) confirmed and moved to 'Pending' status.`);

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

    for (let category in materials) {
        for (let material of materials[category]) {
            let materialNoSpace = material.replace(/ /g, "");
            if (orderRef[material] !== 0) {
                materialOrder[materialNoSpace] = orderRef[material];
                priceTotal += orderRef[material] * priceRef[material] * demandRef['Demands'][demandRef[material]];
            }
        }
    }
    priceTotal *= priceRef['Buy Weight'];

    res.render('buyContract', {
        title: `${config['Organization']} Buy Contract`,
        banner: process.env.banner,
        logo: process.env.logo,
        contractContact: config['ContractContact'],
        status: "Pending",
        ticket: ticketNumber,
        total: priceTotal,
        materialOrder: materialOrder
    });
});

module.exports = router;
