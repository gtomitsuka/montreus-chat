/* server/error-page.js
 * The router for 404s.
*/

//APIs
var express = require('express');
var compression = require('compression'); //Compress with gzip

//Globals
var router = express.Router();
router.use(compression({ threshold: 512 }));
router.use(function(req, res, next){
  res.status(404);

  // respond with html page
  if (req.accepts('html')) {
    res.sendFile(__dirname + '/public/404.html');
    return;
  }

  // respond with json
  if (req.accepts('json')) {
    res.send({ error: '404 - Page Not Found' });
    return;
  }
  res.type('txt').send('Error 404 - Page Not Found');
});
module.exports = router;
