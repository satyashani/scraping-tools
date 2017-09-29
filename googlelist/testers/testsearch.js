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

var testgen = function(num){
    var strings = ["john", "adams", "steve", "christ","alex", "tom","hulk","fighter","player","bob","martin"];
    var randIdx = function(){
        return Math.ceil(Math.random()*strings.length);
    }
    var res = [];
    for(var i=0;i<num;i++){
        res[i] = {"q" : [strings[randIdx()],strings[randIdx()],strings[randIdx()]].join(" "), "id" : (i+1), "num" : 30};
    }
    return res;
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
            console.log("Processed "+processed+", result = "+(d.result && d.result.length?d.result.length:JSON.stringify(d)));
            if(!d.ok && d.error === "proxy_list_empty") return callback(new Error(d.error));
            if(!d.ok && d.error.indexOf("proxy")) return callback(null, d.error);
            if(d.ok && d.result && d.result.length)
                callback(null,d.result.length);
            else
                callback(null,d);
        });
    });
    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });
    req.write(postdata);
    req.end();
};

var list = testgen(250);
processed = 0;
async.mapSeries(list,requester,function(err,mapped){
    if(err)
        console.log("Error - "+err);
    else
        console.log("final mapped array = "+JSON.stringify(mapped));
    console.log("processed = "+processed);

});