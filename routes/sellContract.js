var express = require('express');
var router = express.Router();
const materials = require('../materials');
const collections = require('../collections');

const admin = require('firebase-admin');

const db = admin.firestore();

router.post('/', async function(req, res, next) {

    const configRefQuery = await db.collection(collections['Settings']).doc('Config').get();
    if (configRefQuery.empty) {
        let error = "Fatal error: No server configuration found.";
        console.log(error);
        res.send(error);
        return;
    }
    const config = configRefQuery.data();

    if (!config['Sell Orders Enabled']) {
        res.render('disabled', {
            title: `${config['Organization']} Sell Contract`,
            banner: process.env.banner,
            logo: process.env.logo,
            user: req.user,
            feature: "Sell Order"
        });
        return;
    }

    let ticketNumber = 1;
    if (req.body.ticketNumber && req.user) {
        const ordersRefQuery = await db.collection(collections['Sell-Orders']).where("TicketNumber", "==", Number(req.body.ticketNumber)).limit(1).get();
        if (!ordersRefQuery.empty) {
            let orderRef = ordersRefQuery.docs[0].data();
            if (req.user.CharacterName === orderRef['CharacterName']) {
                ticketNumber = Number(req.body.ticketNumber);
            }
        }
    } else {
        const ordersRefQuery = await db.collection(collections['Sell-Orders']).orderBy("TicketNumber", "desc").limit(1).get();
        if (!ordersRefQuery.empty) {
            let orderRef = ordersRefQuery.docs[0].data();
            ticketNumber = Number(orderRef['TicketNumber']) + 1;
        }
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
        if (config['Categories']) {
            if (!config['Categories'][category]) {
                continue;
            }
        }
        for (let material of materials[category]) {
            let materialNoSpace = material.replace(/ /g, "");
            let demand = Object.keys(demandRef['Demands'])[0];
            // Backwards compatibility
            if (typeof demandRef[material] === "string") {
                demand = demandRef[material];
            } else if (demandRef[material] !== undefined) {
                demand = demandRef[material]['Sell'];
            }
            // End of backwards compatibility
            let basePrice = priceRef[material] || 0;
            priceTotal += Number(req.body[`form-${materialNoSpace}`]) * basePrice * demandRef['Demands'][demand];
            order[material] = Number(req.body[`form-${materialNoSpace}`]);
            if (order[material] > 0) {
                materialList[materialNoSpace] = order[material];
            }
        }
    }
    priceTotal *= priceRef['Sell Weight'];
    order['CachedValue'] = priceTotal;

    await db.collection(collections['Sell-Orders']).doc(ticketNumber.toString()).set(order);

    res.render('sellContract', {
        title: `${config['Organization']} Sell Contract`,
        banner: process.env.banner,
        logo: process.env.logo,
        user: req.user,
        donate: config['Donation Enabled'],
        status: "Preview",
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

    if (!config['Sell Orders Enabled']) {
        res.render('disabled', {
            title: `${config['Organization']} Sell Contract`,
            banner: process.env.banner,
            logo: process.env.logo,
            user: req.user,
            feature: "Sell Order"
        });
        return;
    }

    const orderRefQuery = await db.collection(collections['Sell-Orders']).where("TicketNumber", "==", Number(ticketNumber)).get();
    if (orderRefQuery.empty) {
        let error = `Cannot find order with ticket number: ${ticketNumber}`;
        console.log(error);
        req.flash('error', error);
        res.redirect('/');
        return;
    }
    const orderRef = orderRefQuery.docs[0].data();

    if (orderRef['Status'] !== "Preview") {
        let error = `You cannot modify this order ${ticketNumber}`;
        console.log(error);
        req.flash('error', error);
        res.redirect('/');
        return;
    }

    await db.collection(collections['Sell-Orders']).doc(ticketNumber).update({
        'Status': 'Pending'
    });
    console.log(`Ticket number (${ticketNumber})(Sell) confirmed and moved to 'Pending' status.`);

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
        if (config['Categories']) {
            if (!config['Categories'][category]) {
                continue;
            }
        }
        for (let material of materials[category]) {
            let materialNoSpace = material.replace(/ /g, "");
            if (orderRef[material] !== 0) {
                materialOrder[materialNoSpace] = orderRef[material];
                let demand = 'Medium';
                // Backwards compatibility
                if (typeof demandRef[material] === "string") {
                    demand = demandRef[material];
                } else if (demandRef[material] !== undefined) {
                    demand = demandRef[material]['Sell'];
                }
                // End of backwards compatibility
                let basePrice = priceRef[material] || 0;
                priceTotal += orderRef[material] * basePrice * demandRef['Demands'][demand];
            }
        }
    }
    priceTotal *= priceRef['Sell Weight'];

    res.render('sellContract', {
        title: `${config['Organization']} Sell Contract`,
        banner: process.env.banner,
        logo: process.env.logo,
        user: req.user,
        donate: config['Donation Enabled'],
        contractContact: config['ContractContact'],
        status: "Pending",
        ticket: ticketNumber,
        total: priceTotal,
        materialOrder: materialOrder
    });
});

module.exports = router;
