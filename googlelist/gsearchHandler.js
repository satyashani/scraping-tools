/**
 * Created by Shani(satyashani@gmail.com) on 22/3/15.
 */

var pg = require("webpage");
var jq = "jquery-1.10.1.min.js";
var fs = require("fs");
var serverClass = require("./server");
var logger = require("./logger");
var conf = require("./conf.json");

var confBase = {
    env : "dev",
    resultsperquery : 100,
    useproxies: true,
    override: 'test'
};
for(var k in confBase)
    if(!conf.hasOwnProperty(k)) conf[k] = confBase[k];
logger.log("Starting with config:");
logger.log(JSON.stringify(conf));
var versiondate = "2015-03-22 12:37";
var useragents = fs.read("useragents.json");
var getUserAgent = function(){
    return useragents[Math.floor(Math.random()*useragents.length)];
};

var wl = JSON.parse(fs.read("whitelist.json"));
if(!wl.length)
    logger.log("white list file whitelist.json is empty?");
for(var i=0;i<wl.length;i++){
    wl[i] = wl[i].replace(/http[s]*:\/\/|\/$|www\./g,"");
}
var whitelist = wl;

var emptyresultcount = 0, google = "https://www.google.com";

var sender = {
    res: null,
    init: function(res){
        this.res = res;
    },
    send : function(status,data,isjson){
        this.res.statusCode = status;
        var json = arguments.length>2?isjson:true;
        this.res.setHeader('Content-Type', json?"application/json":"text/html");
        var out = json?JSON.stringify(data):data;
        this.res.write(out);
        this.res.closeGracefully();
    },
    html: function(html){
        this.send(200,html,false);
    },
    json: function(json){
        this.send(200,json,true);
    },
    ok: function(){
        this.send(200,{ok : true},true);
    },
    error: function(msg){
        this.send(200,{ok : false, error: msg},true);
    }
};

var jqEvals = {
    getPageResults : function(){
        var res = [];
        $("div#ires li.g").each(function(){
            var u = $(this).find("h3.r a").attr("href"),kw = $(this).find('span.st em,span.st b');
            if(u){
                var match = u.match(/url[\?q]*=(http[s]*[^&]*)/);
                var kwg = [];
                if(kw.size()){
                    kw.each(function(){
                        kwg.push($(this).text())
                    })
                }
                res.push({url: match?decodeURIComponent(match[1]):u, keywords: kwg});
            }
        });
        var tds = $("div#foot td"),hasMore = !!tds.size();
        tds.each(function(i){
            if(!$(this).find("a.fl").size() && !$(this).hasClass("b") && tds.eq(i+1).hasClass('b'))
                hasMore = false;
        });
        return { result: res, hasmore : hasMore};
    },
    clickNext : function(){
        var tds = $("div#foot td:not(.b)");
        tds.each(function(i){
            if(!$(this).find("a.fl").size())
                window.location.href = tds.eq(i+1).find("a.fl").attr("href");
        });
    },
    checkHasSorry : function(page){
        page.injectJs(jq);
        if(page.url.match(/sorry/)) return true;
        return page.evaluate(function(){
            if(!$("h1").size() || !$("h1").eq(0).text()) return false;
            return $("h1").eq(0).text().indexOf("sorry");
        });
    }
}

var methods = {
    get: {
        Timeout : function(){
            sender.json({ok: true,timeout: server.timeout});
        },
        CurrentProxy : function(){
            if(!server.proxies.length)
                return sender.error("proxy_list_empty");
            sender.json(server.proxies[server.currentproxy]);
        },
        WhiteList : function(){
            sender.json(whitelist);
        },
        NextProxy : function(){
            if(!server.proxies.length)
                return sender.error("proxy_list_empty");
            var  resp =  {};
            resp.oldproxy = server.proxies[server.currentproxy];
            server.nextProxy();
            resp.newproxy = server.proxies[server.currentproxy];
            sender.json(resp);
        },
        Proxies : function(){
            sender.json(server.proxies);
        }
    },
    post: {
        WhiteList : function(post){
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
            sender.ok();
        },

        Timeout : function(post){
            if(isNaN(post.timeout)) sender.error("bad_milliseconds_value");
            else{
                server.timeout = post.timeout;
                sender.ok();
            }
        },
        Proxies : function(proxies){
            if(!proxies.length)
                return sendError("invalid_proxy_array_format");
            for(var i=0;i<proxies.length;i++){
                if(!proxies[i].ip || !proxies[i].port)
                    return sender.error("invalid_proxy_format:"+JSON.stringify(proxies[i]));
            }
            server.setProxies(proxies);
            sender.ok();
        },
        Search : function(tracinfo){
            if(conf.useproxies && !server.proxies.length && conf.proxysource=="manual")
                return sender.error("proxy_list_empty");
            if(!tracinfo.q) return sendError("missing_query_parameter:q");
            if(!tracinfo.id) return sendError("missing_track_parameter:id");
            var q = tracinfo.q;
            var num = parseInt(tracinfo.num) || conf.resultsperquery;
            var url = "https://www.google.com/search?q="+q;
            var page = pg.create();
            page.settings.userAgent = getUserAgent();
            page.settings.loadImages = false;
            page.viewportSize = {width: 1366,height: 800};
            var timeout = server.timeout || conf.timeout || 30000, pagesloaded = 0,responded = false,timeoutretry=0;
            var totalres = [];
            var respond = function(err,result){
                if(!responded){
                    page.close();
                    if(conf.env == "dev"){
                        var erprint = (err?err.message:"none"), resprint = (result && result.length?result.length:0);
                        logger.log("responding for err: "+erprint+", results: "+resprint+", emptyresultcount = "+emptyresultcount);
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
                        sender.error(err.message);
                    }
                    else{
                        if(!result.length){
                            sender.json({ok: false, q: q, id: tracinfo.id, result: result, error: "empty_result"});
                        }
                        else{
                            emptyresultcount = 0;
                            sender.json({ok: true, q: q, id: tracinfo.id, result: result});
                        }
                    }
                }
            };
            var ontimeout = function(){
                if(totalres.length && timeoutretry < 10){
                    setTimeout(ontimeout,timeout);
                    timeoutretry++;
                }else{
                    if(!responded){
                        respond(new Error("proxy_timeout"),null);
                    }
                }
            };
            setTimeout(ontimeout,timeout);
            page.onConsoleMessage = logger.log;
            var onLoad = function(){
                if(conf.env == "dev") logger.log("result page loaded = "+page.url);
                page.injectJs(jq);
                if(jqEvals.checkHasSorry(page)) return respond(new Error("proxy_failed"));
                var eval = page.evaluate(jqEvals.getPageResults);
                totalres  = totalres.concat(eval.result);
                if(conf.env=='dev') logger.log("total results = "+totalres.length+", has more result = "+eval.hasmore);
//                fs.write("page_"+totalres.length+".html",page.content);
//                page.render("page_"+totalres.length+".png");
                if(eval.hasmore && eval.result.length && totalres.length < num){
                    page.evaluate(jqEvals.clickNext);
                }else{
                    if(!totalres || !totalres.length){
                        if(conf.env == "dev"){
                            page.render("images/resultPage_"+tracinfo.id+".png");
                            fs.write("html/page_"+ tracinfo.id+".html",page.content);
                        }
                        logger.log("No results: page url = "+page.url);
                    }
                    var filtered = [];
                    totalres.forEach(function(r){
                        for(var i=0;i<whitelist.length;i++){
                            if(whitelist[i] && r.url.match(new RegExp(whitelist[i],"i"))) return;
                        }
                        for(var f=0;f<filtered.length;f++){
                            if(filtered[f].url == r.url) return;
                        }
                        var dom = r.url.match(/http[s]*:\/\/([^\/\?]*)/);
                        r.domain = dom?dom[1]:false;
                        filtered.push(r);
                    });
                    if(page.url.match(/google.com\/sorry/i)){
                        logger.error("Google detected that we are a bot :-p, check image with id "+tracinfo.id);
                        respond(new Error("proxy_failed"),null);
                    }else{
                        respond(null,filtered);
                    }
                }
            };
            var onGoogleLoaded = function(){
                if(!page.url.match(/google/))
                    return respond(new Error("google_redirected:"+page.url));
                page.injectJs(jq);
                if(jqEvals.checkHasSorry(page))
                    return respond(new Error("proxy_failed"));
                if(!page.url.match(/www\.google\.com/)){
                    var hasprefurl = page.evaluate(function(){
                        return $('a[href*="setprefdomain"]').size();
                    });
                    if(hasprefurl){
                        if(conf.env == "dev") logger.log("Redirecting to google.com from "+page.url);
                        page.evaluate(function(){
                            window.location.href = $('a[href*="setprefdomain"]').attr("href");
                        });
                    }
                    else{
                        if(conf.env =="dev") logger.log("Loaded page "+page.url+" doesn't have link to set preferred domain");
                        respond(new Error("cant_load_us_site"));
                    }
                }else{
                    if(conf.env == "dev") logger.log("Google page being used - "+page.url);
                    page.onLoadFinished = onLoad;
                    page.evaluate(function(query){
                        window.location.href = "http://www.google.com/search?q="+encodeURIComponent(query).replace(/ /g,'+');
                    },q);
                    if(conf.env == "dev") page.render("images/searchpage_"+tracinfo.id+".png");
                }
            };
            var onUrlChange =  function(){
                if(page.url.match(/google/)){
                    page.onLoadFinished = onGoogleLoaded;
                }else {
                    if(conf.env =='dev') logger.log("Url loaded = "+page.url);
                }
            };
            page.onUrlChanged = onUrlChange;
            page.open(google,function(status){
                if(!status=="success")
                    return respond(new Error("page_load_failed"));
                if(conf.env == "dev" ) logger.log("page url on open = "+page.url);
                if(page.url.match(/google/)){
                    page.onUrlChanged = null;
                    page.onLoadFinished = onGoogleLoaded;
                    onGoogleLoaded();
                }
            });
        }
    }
}

var handler = function(req,res){
    if(conf.env=='dev')
        logger.log(req.method+": "+req.url);
    phantom.clearCookies();
    sender.init(res);

    if(req.method == "POST"){
        var post = {};
        try{
            post = JSON.parse(req.post);
        }catch(e){
            return sender.error("bad_json_request");
        }
        switch(req.url){
            case "/proxies" : methods.post.Proxies(post); break;
            case "/timeout" : methods.post.Timeout(post); break;
            case "/search" : methods.post.Search(post);   break;
            case "/whitelist" : methods.post.WhiteList(post); break;
            default : sender.ok(post); break;
        }
    }else{
        switch(req.url){
            case "/proxies" : methods.get.Proxies(); break;
            case "/timeout" : methods.get.Timeout(); break;
            case "/currentproxy" : methods.get.CurrentProxy(); break;
            case "/setnextproxy" : methods.get.NextProxy(); break;
            case "/whitelist" : methods.get.WhiteList(); break;
            case "/version" : sender.json({"ok":true,"versiondate":versiondate}); break;
            default : sender.ok(); break;
        }
    }
};

var server = new serverClass(handler);
server.init();