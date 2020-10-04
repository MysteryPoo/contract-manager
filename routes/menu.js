var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    res.render('menu', {
        title: 'GenFed Material Exchange'
    });
});

module.exports = router;