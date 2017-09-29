/* * ************************************************************ 
 * Date: 28 Oct, 2015
 * programmer: Shani Mahadeva <satyashani@gmail.com>
 * Javascript file index.js
 * *************************************************************** */


var express = require('express');
var bodyParser = require('body-parser');
var fs = require("fs");

// ******* Node Lib     ************ //
var http = require('http');
var https = require('https');
var app = express();
var async = require("async");
app.use(require('cookie-parser')());
var config = require("./config");


// ******* Xray Routes  ************ //
var router = require("./routes/index");
var uploads = require("./lib/uploads");

// all environments
app.set('port', config.server ? config.server.port || 3000 : 3000);
app.enable('strict routing');
app.use(require('compression')({threshold: 2048}));
app.use(require('morgan')('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

router(app);

async.series([
    uploads.init.bind(uploads)
],function(err,res){
    if(err){
        console.log("Error starting server:",err.message);
        return process.exit();
    }
    if(res && res.length){
        var allok = true;
        res.forEach(function(r,i){
            allok = allok && r;
        });
        if(allok){
            if(config.https && config.https.enable && config.https.key && config.https.cert){
                var opts = { 
                    key : fs.readFileSync(config.https.key, 'utf8'), 
                    cert: fs.readFileSync(config.https.cert,'utf8')
                };
                https.createServer(opts,app).listen(app.get('port'),function(){
                    console.log('Express server listening on port ' + app.get('port'));
                });
            }else{
                app.listen(app.get('port'), function(){
                    console.log('Express server listening on port ' + app.get('port'));
                });
            }
        }else
            console.log("Initialization check failed");
    }
});