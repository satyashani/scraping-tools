/**
 * Created by Shani(satyashani@gmail.com) on 3/3/15.
 */
var http = require("http");
var fs = require("fs");
var async = require("async");

var processed = 0;
var options = {
    hostname: 'localhost',
    port: 9092,
    path: '/piracyreport',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': 0
    }
};

var testgen = function(){
    var strings = [
        "deepology.org","rssing.com","electrocrates.com","deepdjs.com","imixes.ru",
        "clowdy.com","vip-music.biz","zoomp3.com","mp3xi.com","djshop.de","zipy.org","djlist.org",
        "zippyon.org","4songs.pk"
    ];
//    var strings = [
//        "djlist.org","djlist.org","djlist.org","djlist.org","djlist.org","djlist.org","djlist.org",
//        "djlist.org","djlist.org","djlist.org","djlist.org","djlist.org","djlist.org","djlist.org",
//        "djlist.org","djlist.org","djlist.org","djlist.org","djlist.org","djlist.org","djlist.org"
//    ];
//    var strings = [
//        "zoomp3.com","zoomp3.com","zoomp3.com","zoomp3.com","zoomp3.com","zoomp3.com","zoomp3.com",
//        "zoomp3.com","zoomp3.com","zoomp3.com","zoomp3.com","zoomp3.com","zoomp3.com","zoomp3.com",
//        "zoomp3.com","zoomp3.com","zoomp3.com","zoomp3.com","zoomp3.com","zoomp3.com","zoomp3.com"
//    ];
    var res = [];
    for(var i=0;i<strings.length;i++){
        res[i] = {"q" : strings[i]};
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
            console.log("Processed "+processed+", result = "+JSON.stringify(d.result));
            if(!d.ok && d.error == "proxy_list_empty") return callback(new Error(d.error));
            if(!d.ok && d.error.indexOf("proxy")) return callback(null, d.error);
            if(d.ok && d.result && d.result.topreported)
                callback(null,d.result.topreported);
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

var list = testgen();
processed = 0;
async.mapSeries(list,requester,function(err,mapped){
    if(err)
        console.log("Error - "+err);
    else
        console.log("final mapped array = "+JSON.stringify(mapped));
    console.log("processed = "+processed);

});