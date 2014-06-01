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

var conf = {
    env : "dev", changeproxyreqlimit: 30,
    proxyapikey: "729fb2b0ef57fc06cdac1b5525c9b0"
}

var whitelist = JSON.parse(fs.read("whitelist.json"));

var handler = function(req,res,server){
    if(conf.env=='dev')
        console.log(req.method+": "+req.url);

    var handleSearch = function(){
        try{
            var tracinfo = JSON.parse(req.post);
            if(!tracinfo.track || !tracinfo.artist)
                return sendError("missing_track_or_artist");
            var q = (tracinfo.track+" "+tracinfo.artist).replace(/ +/g,"+");
            var url = "https://www.google.com/search?hl=en&as_q="+q+"&num="+conf.resultsperpage;
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
                if(!res || !res.length){
                    page.render("lastgooglesearch.png");
                    console.log("No results: page url = "+page.url);
                }
                var filtered = [];
                res.forEach(function(r){
                    for(var i=0;i<whitelist.length;i++){
                        if(r.match(new RegExp(whitelist[i],"i"))) return;
                    }
                    filtered.push(r);
                })
                sendJson(filtered);
                if(page.url.match(/google.com\/sorry/i)){
                    phantom.clearCookies();
                    server.nextProxy();
                }
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
    if(server.requests>conf.changeproxyreqlimit){
        if(conf.env=='dev') console.log("request limit for proxy reached");
        server.nextProxy();
    }
}

var server = function(){
    this.proxies  = [];
    this.currentproxy = 0;
    this.requests = 0;
    this.conf = {};
}

server.prototype.setProxies = function(p){
    this.proxies = p;
    this.currentproxy = 0;
    return this.setProxy();
}

server.prototype.nextProxy = function(){
    if(this.currentproxy==this.proxies.length-1){
        this.refreshProxies(function(){
            if(conf.env=='dev') console.log("Proxies refreshed.");
        });
    }else{
        this.currentproxy = (this.currentproxy+1)%this.proxies.length;
        return this.setProxy();
    }
}

server.prototype.setProxy = function(){
    if(this.proxies.length){
        if(this.currentproxy>=this.proxies.length){
            console.error("Current proxy index greater than proxy length, this shouldn't happen, it is a bug, contact script author.");
            return false;
        }
        var p = this.proxies[this.currentproxy];
        if(conf.env=='dev') console.log("Changing proxy after "+this.requests+" requests, new proxy = "+ p.ip);
        phantom.setProxy(p.ip, p.port);
        this.requests = 0;
        return true;
    }else{
        console.error("Failed to change proxy, proxy list is empty or not enough proxies, check proxy setup.");
        return false;
    }
}

server.prototype.start = function(port){
    var o = this;
    return ws.create().listen(port,function(req,res){
        handler(req,res,o);
    });
}

server.prototype.refreshProxies = function(callback){
    var o = this;
    var page = pg.create();
    var url="http://kingproxies.com/api/v1/proxies.json?key="+conf.proxyapikey+"&limit=5&country_code=US&protocols=http&supports=google";
    var proxyhome = "http://kingproxies.com";
    if(conf.env=='dev')  console.log("changing proxies.");
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
            var proxies = [];
            p.data.proxies.forEach(function(px){
                if(px.ip!="0.0.0.0" && px.port)
                proxies.push(px);
            });
            if(proxies.length){
                o.setProxies(proxies);
                callback();
            }else{
                console.error("All the proxies received had bad ip address."+JSON.stringify(p.data.proxies));
                o.exit();
            }
        }
        else{
            console.error("Could not refresh Proxies, please troubleshoot and restart server.");
            console.error("Response from proxy api - "+JSON.stringify(p));
            o.exit();
        }
    });
}

server.prototype.init = function(){
    var o = this;
    conf = JSON.parse(fs.read("conf.json"));
    conf.env = conf.env? conf.env:"dev";
    conf.changeproxyreqlimit = conf.changeproxyreqlimit && !isNaN(conf.changeproxyreqlimit)?conf.changeproxyreqlimit:30;
    conf.resultsperpage = conf.resultsperpage?conf.resultsperpage:20;
    o.refreshProxies(function(){
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