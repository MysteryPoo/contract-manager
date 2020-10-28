
const admin = require('firebase-admin');
const collections = require('./collections.js');
const cache = require('./cache');

const db = admin.firestore();

async function getUserById(id) {
    if (cache.users && cache.users[id]) {
        return cache.users[id];
    }
    const userRef = await getUserByCharacterName(id);
    cache.users[id] = userRef;
    
    return userRef;
}

async function getUserByCharacterName(characterName) {
    
    console.log(`Hitting database!`);
    const userRefQuery = await db.collection(collections['Users']).where('CharacterName', '==', characterName).get();
    if (!userRefQuery.empty) {
        if (userRefQuery.docs.length > 1) {
            console.log(`Fatal error: More than one account exists with character name: ${characterName}`);
            return null;
        } else if (userRefQuery.docs.length === 1) {
            return userRefQuery.docs[0].data();
        }
        return null;
    }
}

async function createUser(user) {

    const userRef = await getUserByCharacterName(user.id);
    if (userRef) {
        throw("User already exists.");
    } else {
        await db.collection(collections['Users']).doc(user.id).set(user);
    }
}

module.exports.getUserById = getUserById;
module.exports.getUserByCharacterName = getUserByCharacterName;
module.exports.createUser = createUser;
