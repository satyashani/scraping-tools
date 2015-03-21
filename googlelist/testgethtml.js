/**
 * Created by Shani(satyashani@gmail.com) on 20/3/15.
 */
/**
 * Created by Shani(satyashani@gmail.com) on 3/3/15.
 */
var http = require("http");
var async = require("async");
var urls = require("./testurls.json");

var t = new Date().getTime()/1000;
var processed = 0,times = [t];
var options = {
    hostname: 'localhost',
    port: 9092,
    path: '/gethtml',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': 0
    }
};

var requester = function(item,callback){
    var postdata = JSON.stringify({"url": item});
    options.headers['Content-Length'] = postdata.length;
    var req = http.request(options,function(res){
        var data = "";
        res.on("data",function(chunk){
            data += chunk;
        }).on("end",function(){
            processed++;
            var t1 = new Date().getTime()/1000;
            console.log("Processed "+processed+", processing time = ",(t1-times[times.length-1]),", average time = ",(t1-t)/processed);
            times.push(t1);
            if(data.toString().indexOf('html')>-1)
                callback(null,true);
            else {
                try {
                    var j = JSON.parse(data);
                    console.log("Not html, response : ",j);
                }catch(e){
                    console.log("Not html, not json, response :", data);
                }
                callback(null, data);
            }
        });
    });
    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });
    req.write(postdata);
    req.end();
};

async.mapSeries(urls,requester,function(err,mapped){
    if(err)
        console.log("Error - "+err);
    else
        console.log("final mapped array = "+JSON.stringify(mapped));
    console.log("processed = "+processed);

});