/* * ************************************************************ 
 * 
 * Date: 4 Jun, 2014
 * version: 1.0
 * programmer: Shani Mahadeva <satyashani@gmail.com>
 * Description:   
 * Javascript file maxSTest.js
 * 
 * 
 * *************************************************************** */
var http = require("http");
var fs = require("fs");
var async = require("async");

var processed = 0;
var options = {
    hostname: 'localhost',
    port: 9092,
    path: '/search',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': 0
    }
};
var requester = function(item,callback){
    var postdata = JSON.stringify(item);
    options.headers['Content-Length'] = postdata.length;
    var req = http.request(options,function(res){
        var data = "";
        res.on("data",function(chunk){
            data += chunk;
        }).on("end",function(){
                var d = JSON.parse(data);
                processed++;
                console.log("Processed "+processed+", result = "+(d.results?d.results.length:"empty"));
                if(d.ok && d.results && d.results.length)
                    callback(null,d.results.length);
                else
                    callback(new Error("results = "+d.results+", ok = "+ d.ok+", "+JSON.stringify(d)),null);
            });
    });
    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });
    req.write(postdata);
    req.end();
};

fs.readFile("teststring.json",function(err,data){
    var list = JSON.parse(data);
    processed = 0;
    async.mapSeries(list,requester,function(err,mapped){
        if(err)
            console.log("Error - "+err+",  processed = "+processed);
        else
            console.log("final mapped array = "+mapped+", processed = "+processed);
    });
});