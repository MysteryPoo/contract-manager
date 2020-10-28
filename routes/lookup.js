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
    
    let typeNoCase = "Sell";
    const sellOrderRefQuery = await db.collection(collections[`${typeNoCase}-Orders`]).where("Status", "!=", "Preview").get();
    if (sellOrderRefQuery.empty) {
        let error = `Cannot find any orders.`;
        console.log(error);
        req.flash('error', error);
        res.redirect(req.baseUrl);
        return;
    }
    const sellOrderRefs = sellOrderRefQuery.docs;

    typeNoCase = "Buy";
    const buyOrderRefQuery = await db.collection(collections[`${typeNoCase}-Orders`]).where("Status", "!=", "Preview").get();
    if (buyOrderRefQuery.empty) {
        let error = `Cannot find any orders.`;
        console.log(error);
        req.flash('error', error);
        res.redirect(req.baseUrl);
        return;
    }
    const buyOrderRefs = buyOrderRefQuery.docs;

    let orderList = {
        'sell': {
            'preview': [],
            'pending': [],
            'accepted': [],
            'rejected': [],
            'cancelled': []
        },
        'buy': {
            'preview': [],
            'pending': [],
            'accepted': [],
            'rejected': [],
            'cancelled': []
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
        user: req.user,
        success: req.flash('success'),
        error: req.flash('error'),
        orderList: orderList,
        preview: false
    });
});

router.get('/myOrders', async function(req, res, next) {

    if (!req.user) {
        res.redirect('/lookup');
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
    
    let typeNoCase = "Sell";
    const sellOrderRefQuery = await db.collection(collections[`${typeNoCase}-Orders`]).where("CharacterName", "==", req.user.CharacterName).get();
    if (sellOrderRefQuery.empty) {
        let error = `Cannot find any sell orders.`;
        console.log(error);
    }
    const sellOrderRefs = sellOrderRefQuery.docs;

    typeNoCase = "Buy";
    const buyOrderRefQuery = await db.collection(collections[`${typeNoCase}-Orders`]).where("CharacterName", "==", req.user.CharacterName).get();
    if (buyOrderRefQuery.empty) {
        let error = `Cannot find any buy orders.`;
        console.log(error);
    }
    const buyOrderRefs = buyOrderRefQuery.docs;

    let orderList = {
        'sell': {
            'pending': [],
            'preview': [],
            'accepted': [],
            'rejected': [],
            'cancelled': []
        },
        'buy': {
            'pending': [],
            'preview': [],
            'accepted': [],
            'rejected': [],
            'cancelled': []
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
                req.flash('error', error);
                res.redirect('/lookup');
                return;
            }
            let orderData = order.data();
            orderList[typeString][orderData['Status'].toLowerCase()].push(orderData);
        }
    }

    res.render('lookupList', {
        title: `My Orders`,
        banner: process.env.banner,
        logo: process.env.logo,
        user: req.user,
        success: req.flash('success'),
        error: req.flash('error'),
        donate: config['Donation Enabled'],
        orderList: orderList,
        preview: true
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
        req.flash('error', error);
        res.redirect(req.baseUrl);
        return;
    }
    const orderRef = orderRefQuery.docs[0].data();

    if (orderRef['Status'] === 'Preview' && req.user && req.user.CharacterName === orderRef['CharacterName']) {
        if (req.params.type === 'buy') {
            res.redirect(`/buyOrder/${ticketNumber}`);
        } else if (req.params.type === 'sell') {
            res.redirect(`/sellOrder/${ticketNumber}`);
        }
        return;
    }

    const priceRefQuery = await db.collection(collections['Price-List']).where('DateTime', "==", orderRef['Price-DateTime']).get();
    if (priceRefQuery.empty) {
        let error = `Cannot find price reference sheet dated: ${orderRef['Price-DateTime']}`;
        console.log(error);
        req.flash('error', error);
        res.redirect(req.baseUrl);
    }
    const priceRef = priceRefQuery.docs[0].data();

    const demandRefQuery = await db.collection(collections['Demand-List']).where('DateTime', "==", orderRef['Demand-DateTime']).get();
    if (demandRefQuery.empty) {
        let error = `Cannot find demand reference sheet dated: ${orderRef['Demand-DateTime']}`;
        console.log(error);
        req.flash('error', error);
        res.redirect(req.baseUrl);
    }
    const demandRef = demandRefQuery.docs[0].data();

    let priceTotal = 0;

    let materialOrder = {};
    let priceRefNoSpace = {};

    for (let category in materials) {
        for (let material of materials[category]) {
            let materialNoSpace = material.replace(/ /g, "");
            if (orderRef[material] && orderRef[material] !== 0) {
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
        user: req.user,
        success: req.flash('success'),
        error: req.flash('error'),
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

router.post('/:type/:ticketNumber/:option', async function(req, res, next) {

    const contractType = req.params.type;
    const contractTypeCap = req.params.type.charAt(0).toUpperCase() + req.params.type.slice(1).toLowerCase();
    const ticketNumber = Number(req.params.ticketNumber);
    const option = req.params.option;

    if (!req.user) {
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

    const orderRefQuery = await db.collection(collections[`${contractTypeCap}-Orders`]).where('TicketNumber', "==", ticketNumber).get();
    if (orderRefQuery.empty) {
        let error = `Cannot find order with ticket number: ${ticketNumber}`;
        console.log(error);
        req.flash('error', error);
        res.redirect(req.baseUrl);
    }
    let orderRef = orderRefQuery.docs[0].data();

    let status = '';
    if (option === 'accept' && req.user.isAdmin && orderRef['Status'] === "Pending") {
        status = 'Accepted';
    } else if (option === 'reject' && req.user.isAdmin && orderRef['Status'] === "Pending") {
        status = 'Rejected';
    } else if (option === 'cancel' && req.user.CharacterName === orderRef['CharacterName'] && (orderRef['Status'] === "Preview" || orderRef['Status'] === "Pending")) {
        status = 'Cancelled';
    }

    if (status === '') {
        req.flash('error', `You cannot modify this order ${ticketNumber}`);
        res.redirect(`/lookup/${contractType}/${ticketNumber}`);
        return;
    }
    await db.collection(collections[`${contractTypeCap}-Orders`]).doc(ticketNumber.toString()).update({
        'Status': status
    });
    req.flash('success', `Ticket [${ticketNumber}] moved to ${status} status.`);
    res.redirect(`/lookup/${contractType}/${ticketNumber}`);
});

module.exports = router;
