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
var async = require("async");
var options = {
    hostname: 'localhost',
    port: 9091,
    path: '/',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': 0
    }
};

var testcases = [
    {path: '/',method:'GET',result:{ok:true}},
    {path: '/changeworker',method:'POST',post:{workerid:"satyashani","password":"ilupooja2014"},result:{ok:true}},
    {path: '/currentworker',method:'GET',result:{email:'satyashani@gmail.com',name:'Shani Mahadeva',text:'Account Shani Mahadeva \n(satyashani@gmail.com)'}}
];

var requester = function(item,callback){
    options.method=item.method;
    options.path=item.path;
    var postdata = "";
    console.log("requesting ",options.method,options.path);
    if(item.post){
        var postdata = JSON.stringify(item.post);
        options.headers['Content-Length'] = postdata.length;
    }
    var req = http.request(options,function(res){
        var data = "";
        res.on("data",function(chunk){
            data += chunk;
        }).on("end",function(){
                var d = JSON.parse(data);
                console.log("received response ",data);
                var expres = item.result;
                for(var i in d){
                    if(!expres.hasOwnProperty(i)){
                        return callback(new Error("Unexpected field:"+i+"="+d[i]));
                    }
                    if(expres[i]!==d[i]){
                        return callback(new Error("Unexpected result for "+i+": expected"+expres[i]+", found:"+d[i]));
                    }
                }
                for(var i in expres){
                    if(!d.hasOwnProperty(i)){
                        return callback(new Error("Missing expected field:"+i+"="+expres[i]));
                    }
                }
                callback(null,d);
            });
    });
    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
        callback(e);
    });
    if(item.post)
        req.write(postdata);
    req.end();
};
async.mapSeries(testcases,requester,function(err,mapped){
    if(err)
        console.log("Error - "+err);
    else
        console.log("Completed");

});