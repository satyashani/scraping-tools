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
    env : "dev", changeproxyreqlimit: 50,
    proxyapikey: "729fb2b0ef57fc06cdac1b5525c9b0",
    resultsperpage : 100,
    useproxies: true
}

var useragents = fs.read("useragents.json");
var getUserAgent = function(){
    return useragents[Math.floor(Math.random()*useragents.length)];
}

var wl = JSON.parse(fs.read("whitelist.json"));
if(!wl.length)
    console.log("white list file whitelist.json is empty?");
for(var i=0;i<wl.length;i++){
    wl[i] = wl[i].replace(/http[s]*:\/\/|\/$|www\./g,"");
}
var whitelist = wl;

var handler = function(req,res,server){
    if(conf.env=='dev')
        console.log(req.method+": "+req.url);
    phantom.clearCookies();

    var handleSearch = function(){
        try{
            var tracinfo = JSON.parse(req.post);
            if(!tracinfo.q)
                return sendError("missing_query_parameter:q");
            if(!tracinfo.id)
                return sendError("missing_track_parameter:id");
            var q = tracinfo.q.replace(/ +/g,"+");
            var url = "https://www.google.com/search?hl=en&as_q="+q+"&num="+conf.resultsperpage;
            var page = pg.create();
            page.settings.userAgent = getUserAgent();
            page.open(url,function(status){
                if(!status=="success")
                    return sendError("google_not_loaded");
                page.injectJs(jq);
                var res = page.evaluate(function(){
                    var res = [];
                    $("div#ires li.g").each(function(){
                        var u = $(this).find("h3.r a").attr("href");
                        var match = u.match(/http[s]*:[^&]*/);
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
                    for(var f=0;f<filtered.length;f++){
                        if(filtered[f].url == r) return;
                    }
                    var dom = r.match(/http[s]*:\/\/([^\/\?]*)/);
                    filtered.push({url: r,domain: dom?dom[1]:false});
                })
                sendJson({ok: true, q: tracinfo.q, id: tracinfo.id, results: filtered});
                if(page.url.match(/google.com\/sorry/i)){
                    console.error("Google detected that we are a bot :-p, check image with id "+tracinfo.id);
                    page.render("page_id_"+tracinfo.id+".png");
                }
                server.requests++;
                server.nextProxy();
            })
        }catch(e){
            sendError("bad_json_request");
        }
    }

    var handleSetWhiteList = function(){
        try{
            var post = JSON.parse(req.post);
            if(!post.path){
                return sendError("missing_parameter:path")
            }
            if(!fs.isReadable(post.path))
                return sendError("path_not_readable:"+post.path);
            var wl = JSON.parse(fs.read(post.path));
            if(!wl.length)
                return sendError("white_list_empty?");
            for(var i=0;i<wl.length;i++){
                wl[i] = wl[i].replace(/http[s]*:\/\/|\/$|www\./g,"");
            }
            whitelist = wl;
            sendOk();
        }catch(e){
            sendError("bad_json_request");
        }
    }

    var handleCurrentProxy = function(){
        if(!server.proxies.length)
            return sendError("proxy_list_empty");
        sendJson(server.proxies[server.currentproxy]);
    }

    var handleSetNextProxy = function(){
        if(!server.proxies.length)
            return sendError("proxy_list_empty");
        var  resp =  {};
        resp.oldproxy = server.proxies[server.currentproxy];
        server.nextProxy();
        resp.newproxy = server.proxies[server.currentproxy];
        sendJson(resp);

    }

    var handleGetWhiteList = function(){
        send(200,whitelist,true);
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
            case "/search" :
                setTimeout(handleSearch,Math.random()*10000);
                break;
            case "/whitelist" : handleSetWhiteList(); break;
            default : sendOk(); break;
        }
    }else{
        switch(req.url){
            case "/proxies" : handleGetProxies(); break;
            case "/currentproxy" : handleCurrentProxy(); break;
            case "/setnextproxy" : handleSetNextProxy(); break;
            case "/whitelist" : handleGetWhiteList(); break;
            default : sendOk(); break;
        }
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
    var o = this;
    if(!conf.useproxies) return true;
    if(this.requests>conf.changeproxyreqlimit*server.proxies.length){
        this.refreshProxies(function(){
            if(conf.env=='dev') console.log("Proxies refreshed.");
            o.requests = 0;
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
    var url="http://kingproxies.com/api/v1/proxies.json?key="+conf.proxyapikey+"&limit=100&protocols=http&supports=google&type=anonymous";
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

server.prototype.startServer = function(){
    if(!this.start(conf.port)){
        console.log('Failed to start web server on port "+conf.port+", exiting.');
        this.exit();
    }else{
        console.log("Web server started at http://localhost:"+conf.port);
    }
}

server.prototype.init = function(){
    var o = this;
    conf = JSON.parse(fs.read("conf.json"));
    conf.env = conf.env? conf.env:"dev";
    conf.changeproxyreqlimit = conf.changeproxyreqlimit && !isNaN(conf.changeproxyreqlimit)?conf.changeproxyreqlimit:30;
    conf.resultsperpage = conf.resultsperpage?conf.resultsperpage:20;
    conf.port = conf.port?conf.port:9092;
    if(conf.useproxies)
        o.refreshProxies(function(){
            o.startServer();
        });
    else o.startServer();

}

server.prototype.exit = function(){
    phantom.exit();
}

new server().init();