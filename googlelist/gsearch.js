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
    resultsperquery : 100,
    proxysource : "kingproxy",
    useproxies: true,
    timeout: 30000
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

var proxyApi = {
    kingProxy: function(callback){
        var page = pg.create();
        var url="http://kingproxies.com/api/v1/proxies.json?key="+conf.proxyapikey+"&limit=5&protocols=http&supports=google&type=anonymous";
        var proxyhome = "http://kingproxies.com";
        if(conf.env=='dev')  console.log("Loading proxies from kingproxies.com");
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
                });
                return d;
            },url);
            if(p.data && p.data.proxies){
                var proxies = [];
                p.data.proxies.forEach(function(px){
                    if(px.ip!="0.0.0.0" && px.port)
                        proxies.push(px);
                });
                if(proxies.length){
                    callback(null,proxies);
                }else{
                    callback(new Error("Bad_proxies:"+JSON.stringify(p.data.proxies)),null);
                }
            }
            else{
                callback(new Error("Failed:"+JSON.stringify(p)),null);
            }
        });
    },
    file: function(callback){
        if(conf.env=='dev')  console.log("Loading proxies from file proxies.json");
        if(!fs.isReadable("proxies.json"))
            return callback(new Error("file proxies.json not readable"),null);
        var data = JSON.parse(fs.read("proxies.json"));
        if(!data.length) callback(new Error("Proxy list empty",null))
        else callback(null,data);
    }
}

var emptyresultcount = 0, google = "https://www.google.com";
var handler = function(req,res,server){
    if(conf.env=='dev')
        console.log(req.method+": "+req.url);
    phantom.clearCookies();

    var getPageResults = function(){
        var res = [];
        $("div#ires li.g").each(function(){
            var u = $(this).find("h3.r a").attr("href");
            var match = u.match(/\/url\?q=(http[s]*[^&]*)/);
            res.push(match?decodeURIComponent(match[1]):u);
        });
        var tds = $("div#foot td"),hasMore = !!tds.size();
        tds.each(function(i){
            if(!$(this).find("a.fl").size() && !$(this).hasClass("b") && tds.eq(i+1).hasClass('b'))
                hasMore = false;
        });
        return { result: res, hasmore : hasMore};
    };

    var clickNext = function(){
        var tds = $("div#foot td:not(.b)");
        tds.each(function(i){
            if(!$(this).find("a.fl").size())
                window.location.href = tds.eq(i+1).find("a.fl").attr("href");
        });
    };

    var checkHasSorry = function(page){
        page.injectJs(jq);
        if(page.url.match(/sorry/)) return true;
        return page.evaluate(function(){
            if(!$("h1").size() || !$("h1").eq(0).text()) return false;
            return $("h1").eq(0).text().indexOf("sorry");
        });
    }

    var handleSearch = function(){
        if(conf.useproxies && !server.proxies.length && conf.proxysource=="manual")
            return sendError("proxy_list_empty");
        try{
            var tracinfo = JSON.parse(req.post);
            if(!tracinfo.q)
                return sendError("missing_query_parameter:q");
            if(!tracinfo.id)
                return sendError("missing_track_parameter:id");
            var q = tracinfo.q;
            var num = parseInt(tracinfo.num)?parseInt(tracinfo.num):conf.resultsperquery;
            var url = "https://www.google.com/search?q="+q;
            var page = pg.create();
            page.settings.userAgent = getUserAgent();
            page.viewportSize = {width: 1366,height: 800};
            var timeout = server.timeout?server.timeout:30000,pagesloaded = 0,responded = false,timeoutretry=0;
            var totalres = [];
            var respond = function(err,result){
                if(!responded){
                    if(conf.env == "dev"){
                        var erprint = (err?err.message:"none"), resprint = (result && result.length?result.length:0);
                        console.log("responding for err: "+erprint+", results: "+resprint+", emptyresultcount = "+emptyresultcount);
                    }
                    responded = true;
                    if(!result || !result.length){
                        emptyresultcount++;
                        if(emptyresultcount>=1){
                            server.nextProxy();
                            emptyresultcount=0;
                        }
                    }
                    if(err){
                        if(emptyresultcount && err.message.match(/proxy/)){
                            server.nextProxy();
                            emptyresultcount=0;
                        }
                        sendError(err.message);
                    }
                    else{
                        if(!result.length){
                            sendJson({ok: false, q: q, id: tracinfo.id, result: result, error: "empty_result"});
                        }
                        else{
                            emptyresultcount = 0;
                            sendJson({ok: true, q: q, id: tracinfo.id, result: result});
                        }
                    }
                }
            };
            var ontimeout = function(){
                if(totalres.length && timeoutretry < 10){
                    setTimeout(ontimeout,timeout)
                    timeoutretry++;
                }else{
                    if(!responded){
                        respond(new Error("proxy_timeout"),null);
                    }
                }
            };
            setTimeout(ontimeout,timeout);
            page.onConsoleMessage = function(x){ console.log(x);};
            var onLoad = function(){
                if(conf.env == "dev") console.log("result page loaded = "+page.url);
                page.injectJs(jq);
                if(checkHasSorry(page)) return respond(new Error("proxy_failed"));
                var eval = page.evaluate(getPageResults);
                totalres  = totalres.concat(eval.result);
                if(conf.env=='dev') console.log("total results = "+totalres.length+", has more result = "+eval.hasmore);
//                fs.write("page_"+totalres.length+".html",page.content);
//                page.render("page_"+totalres.length+".png");
                if(eval.hasmore && eval.result.length && totalres.length < num){
                    page.evaluate(clickNext);
                }else{
                    if(!totalres || !totalres.length){
                        if(conf.env == "dev"){
                            page.render("resultPage_"+tracinfo.id+".png");
                            fs.write("page_"+ tracinfo.id+".html",page.content);
                        }
                        console.log("No results: page url = "+page.url);
                    }
                    var filtered = [];
                    totalres.forEach(function(r){
                        for(var i=0;i<whitelist.length;i++){
                            if(whitelist[i] && r.match(new RegExp(whitelist[i],"i"))) return;
                        }
                        for(var f=0;f<filtered.length;f++){
                            if(filtered[f].url == r) return;
                        }
                        var dom = r.match(/http[s]*:\/\/([^\/\?]*)/);
                        filtered.push({url: r,domain: dom?dom[1]:false});
                    });
                    if(page.url.match(/google.com\/sorry/i)){
                        console.error("Google detected that we are a bot :-p, check image with id "+tracinfo.id);
                        respond(new Error("proxy_failed"),null);
                    }else{
                        respond(null,filtered);
                    }
                }
            }
            var onGoogleLoaded = function(){
                if(!page.url.match(/google/))
                    return respond(new Error("google_redirected:"+page.url));
                page.injectJs(jq);
                if(checkHasSorry(page))
                    return respond(new Error("proxy_failed"));
                if(!page.url.match(/www\.google\.com/)){
                    var hasprefurl = page.evaluate(function(){
                        return $('a[href*="setprefdomain"]').size();
                    });
                    if(hasprefurl){
                        if(conf.env == "dev") console.log("Redirecting to google.com from "+page.url);
                        page.evaluate(function(){
                            window.location.href = $('a[href*="setprefdomain"]').attr("href");
                        });
                    }
                    else{
                        if(conf.env =="dev") console.log("Loaded page "+page.url+" doesn't have link to set preferred domain");
                        respond(new Error("cant_load_us_site"));
                    }
                }else{
                    if(conf.env == "dev") console.log("Google page being used - "+page.url);
                    page.onLoadFinished = onLoad;
                    page.evaluate(function(query){
                        window.location.href = "http://www.google.com/search?q="+query;
                    },q);
                    if(conf.env == "dev") page.render("searchpage.png");
                }
            };
            var onUrlChange =  function(){
                if(page.url.match(/google/)){
                    page.onLoadFinished = onGoogleLoaded;
                }else {
                    if(conf.env =='dev') console.log("Url loaded = "+page.url);
                }
            }
            page.onUrlChanged = onUrlChange;
            page.open(google,function(status){
                if(!status=="success")
                    return respond(new Error("page_load_failed"));
                if(conf.env == "dev" ) console.log("page url on open = "+page.url);
                if(page.url.match(/google/)){
                    page.onUrlChanged = null;
                    page.onLoadFinished = onGoogleLoaded;
                    onGoogleLoaded();
                }
            });
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

    var handleSetProxies = function(){
        try{
            var proxies = JSON.parse(req.post);
            if(!proxies.length)
                return sendError("invalid_proxy_array_format");
            for(var i=0;i<proxies.length;i++){
                if(!proxies[i].ip || !proxies[i].port)
                    return sendError("invalid_proxy_format:"+JSON.stringify(proxies[i]));
            }
            server.setProxies(proxies);
            sendOk();
        }catch(e){
            sendError("bad_json");
        }
    }

    var handleGetTimeout = function(){
        send(200,server.timeout,true);
    }

    var handleSetTimeout = function(){
        var t = parseInt(req.post);
        if(isNaN(t)) sendError("bad_milliseconds_value");
        else{
            server.timeout = t;
            sendOk();
        }
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
            case "/proxies" : handleSetProxies(); break;
            case "/timeout" : handleSetTimeout(); break;
            case "/search" :
                handleSearch();
                break;
            case "/whitelist" : handleSetWhiteList(); break;
            default : sendOk(); break;
        }
    }else{
        switch(req.url){
            case "/proxies" : handleGetProxies(); break;
            case "/timeout" : handleGetTimeout(); break;
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
    this.timeout = conf.timeout?conf.timeout:30000;
    this.conf = {};
}

server.prototype.setProxies = function(p){
    this.proxies = p;
    this.currentproxy = 0;
    return this.setProxy();
}

server.prototype.removeCurrentProxy = function(){
    if(this.proxies.length && this.currentproxy<this.proxies.length){
        this.proxies.splice(this.currentproxy,1);
        if(this.proxies.length)
            this.currentproxy = this.currentproxy%this.proxies.length;
        else this.currentproxy=0;
    };
}

server.prototype.nextProxy = function(){
    var o = this;
    if(!conf.useproxies) return true;
    if(!this.proxies.length){
        this.refreshProxies(function(){
            if(conf.env=='dev' && this.proxies.length) console.log("Proxies refreshed.");
        });
    }else{
        this.removeCurrentProxy();
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
        if(conf.env=='dev') console.log("Changing proxy, new proxy = "+ p.ip);
        var type = p.type? p.type:"http";
        var user = p.user? p.user:"";
        var passwd = p.password? p.password:"";
        phantom.setProxy(p.ip, p.port,type,user,passwd);
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
    var onchange = function(err,data){
        if(!err){
            if(conf.env=='dev')  console.log("Proxies loaded.");
            o.setProxies(data)
            callback();
        }
        else{
            console.error(err.message);
            o.exit();
        }
    }
    if(conf.proxysource =='file'){
        proxyApi.file(onchange);
    }else if(conf.proxysource=="kingproxy"){
        proxyApi.kingProxy(onchange);
    }else{
        callback();
    }
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
    conf.resultsperquery = conf.resultsperquery?conf.resultsperquery:100;
    conf.port = conf.port?conf.port:9092;
    conf.timeout = conf.timeout?conf.timeout:30000;
    o.timeout = conf.timeout;
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