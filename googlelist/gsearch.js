/* ************************************************************* 
 * 
 * Date: May 31, 2014 
 * version: 1.0
 * programmer: Shani Mahadeva <satyashani@gmail.com>
 * Description:   
 * Javascript file 
 * 
 * 
 * *************************************************************** */
var ws =  require('webserver');
var pg = require("webpage");
var jq = "jquery-1.10.1.min.js";
var fs = require("fs");

var env="dev", changeproxyreqlimit = 30;
var handler = function(req,res,server){
    if(env=='dev')
        console.log(req.method+": "+req.url);

    var handleSearch = function(){
        try{
            var tracinfo = JSON.parse(req.post);
            if(!tracinfo.track || !tracinfo.artist)
                return sendError("missing_track_or_artist");
            var q = (tracinfo.track+" "+tracinfo.artist).replace(/ +/g,"+");
            var url = "https://www.google.com/search?hl=en&as_q="+q;
            var page = pg.create();
            page.open(url,function(status){
                if(!status=="success")
                    return sendError("google_not_loaded");
                page.injectJs(jq);
                var res = page.evaluate(function(){
                    var res = [];
                    $("div#ires li.g").each(function(){
                        var u = $(this).find("h3.r a").attr("href");
                        var match = u.match(/http:[^&]*/);
                        res.push(match?match[0]:u);
                    })
                    return res;
                })
                if(!res || !res.length)
                    page.render("googlesearch.png");
                sendJson(res);
            })
        }catch(e){
            sendError("bad_json_request");
        }
    }

    var handleGetProxies = function(){
        send(200,server.proxies,true);
    }

    var sendJson = function(json){
        send(200,json,true);
    }

    var sendOk = function(){
        send(200,{ok : true},true);
    }

    var sendError = function(msg){
        send(200,{ok : false, error: msg},true);
    }

    var send = function(status,data,isjson){
        res.statusCode = status;
        var json = arguments.length>2?isjson:true;
        res.setHeader('Content-Type', json?"application/json":"text/html");
        var out = json?JSON.stringify(data):data;
        res.setHeader('Content-Length', out.length);
        res.write(out);
        res.closeGracefully();
    }

    if(req.method == "POST"){
        switch(req.url){
            case "/search" : handleSearch(); break;
            default : sendOk(); break;
        }
    }else{
        switch(req.url){
            case "/proxies" : handleGetProxies(); break;
            default : sendOk(); break;
        }
    }

    server.requests++;
    if(server.requests>changeproxyreqlimit){
        if(env=='dev') console.log("request limit for proxy reached");
        server.changeProxy();
    }
}

var server = function(){
    this.proxies  = [];
    this.requests = 0;
    this.conf = {};
}

server.prototype.setProxies = function(p){
    this.proxies = p; return this;
}

server.prototype.changeProxy = function(){
    var p = this.proxies[Math.ceil(Math.random()*(this.proxies.length-1))];
    if(env=='dev') console.log("Changing proxy after "+this.requests+" requests, new proxy = "+ p.ip);
    phantom.setProxy(p.ip, p.port);
    this.requests = 0;
}

server.prototype.start = function(port){
    var o = this;
    return ws.create().listen(port,function(req,res){
        handler(req,res,o);
    });
}

server.prototype.refreshProxies = function(apikey,refreshtime,callback){
    var o = this;
    var page = pg.create();
    var url="http://kingproxies.com/api/v1/proxies.json?key="+apikey+"&limit=5&country_code=US&protocols=http&supports=google";
    var proxyhome = "http://kingproxies.com";
    if(env=='dev')  console.log("changing proxies.");
    page.open(proxyhome,function(status){
        page.injectJs(jq);
        var p = page.evaluate(function(url){
            var d = {};
            $.ajax({
                url: url,
                async: false,
                success: function(data){
                    d = data;
                },
                error: function(x,t,r){
                    d = new Error(JSON.stringify(x));
                }
            })
            return d;
        },url);
        if(p.data && p.data.proxies){
            o.setProxies(p.data.proxies);
            callback();
        }
        else{
            console.error("Could not refresh Proxies, please troubleshoot and restart server.");
            console.error("Response from proxy api - "+JSON.stringify(p));
            o.exit();
        }
    });
    setTimeout(o.refreshProxies,refreshtime || 14400000);
}

server.prototype.init = function(){
    var o = this;
    var conf = JSON.parse(fs.read("conf.json"));
    env = conf.env?conf.env:"dev";
    changeproxyreqlimit = conf.changeproxyreqlimit && !isNaN(conf.changeproxyreqlimit)?conf.changeproxyreqlimit:30;
    o.refreshProxies(conf.proxyapikey,conf.refreshtime || 4*3600*1000,function(){
        if(!o.start(conf.port)){
            console.log('Failed to start web server on port "+conf.port+", exiting.');
            o.exit();
        }else{
            console.log("Web server started at http://localhost:"+conf.port);
        }
    })

}

server.prototype.exit = function(){
    phantom.exit();
}

new server().init();