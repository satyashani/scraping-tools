/**
 * Created by Shani(satyashani@gmail.com) on 22/3/15.
 */

var pg = require("webpage");
var sys = require("system");
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

for(var i=0;i<sys.args.length;i++) {
    if (sys.args[i] === 'useproxies=false') conf.useproxies = false;
}
logger.log("Starting with config:");
logger.log(JSON.stringify(conf));
var versiondate = "2015-03-25 8:56";

var emptyresultcount = 0;

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
    check404 : function(){
        return $("div#af-error-container").size() > 0;
    },
    getTpResult : function() {
        var table1 = $("div.maia-cols div.maia-col-5 div.layout-table-container tbody");
        var total1 = table1.find('tr:first').find("td").eq(1).text();
        var date = table1.find('tr').eq(7).find("td").eq(1).text(),d1 = "";
        if(date){
            var d = new Date(date);
            d1 = d.getFullYear()+"-"+(d.getMonth() > 8 ? "" : "0")+(d.getMonth()+1)+"-"+ (d.getDate() > 9 ? "" : "0")+d.getDate();
        }
        var total2 = table1.find('tr').eq(1).find("td").eq(1).text();
        var table2 = $("table[__gwtcellbasedwidgetimpldispatchingblur]").find('tr.PJDF32-b-b:first');
        var highestreporter = table2.size() > 1 ? table2.eq(1).find("td:first").text() : "";
        var highestreported = table2.size() > 1 ? table2.eq(1).find("td").eq(1).text() : "";
        if (total1 && total1.match(/^[0-9,]+$/) && highestreported && highestreported.match(/^[0-9,]+$/))
            return {
                totalrequests: total1, totalmedian: total2, topreporter: highestreporter, topreported: highestreported, date: d1
            };
        else return null;
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
        Proxies : function(proxies){
            if(!proxies.length)
                return sender.error("invalid_proxy_array_format");
            for(var i=0;i<proxies.length;i++){
                if(!proxies[i].ip || !proxies[i].port)
                    return sender.error("invalid_proxy_format:"+JSON.stringify(proxies[i]));
            }
            server.setProxies(proxies);
            sender.ok();
        },

        piracyReport : function(post){
            if(conf.useproxies && !server.proxies.length && conf.proxysource=="manual")
                return sender.error("proxy_list_empty");
            if(!post.q) return sender.error("missing_query_parameter:q");
            var url = "https://www.google.com/transparencyreport/removals/copyright/domains/"+post.q;
            var page = pg.create();
            page.settings.loadImages = false;
            page.settings.userAgent =  "Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1667.0 Safari/537.36";
            page.viewportSize = {width: 1366,height: 800};
            var timeout = server.timeout?server.timeout:60000,pagesloaded = 0,responded = false;
            var respond = function(err,result){
                if(!responded){
                    page.close();
                    if(conf.env == "dev"){
                        var erprint = (err?err.message:"none"), resprint = (result && result.totalrequests?result.totalrequests:0);
                        logger.log("responding for err: "+erprint+", results: "+resprint+", emptyresultcount = "+emptyresultcount);
                    }
                    responded = true;
                    if(!result || !result.hasOwnProperty('totalrequests') || !result.hasOwnProperty('chillingdata')){
                        emptyresultcount++;
                        if(emptyresultcount>=10){
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
                        if(result.hasOwnProperty('totalrequests') || result.hasOwnProperty('chillingdata') ){
                            emptyresultcount = 0;
                            sender.json({ok: true, q: post.q, result: result});
                        }
                        else{
                            sender.json({ok: false, q: post.q, result: result, error: "empty_result"});
                        }
                    }
                }
            };
            var getChillingData = function(dom,callback){
                var u = "https://www.chillingeffects.org/notices/search?utf8=%E2%9C%93&term="+dom;
                page.onLoadFinished = null;
                page.open(u,function(stat){
                    if(stat != 'success') return callback(new Error("failed to open"));
                    page.injectJs(jq);
                    var d = page.evaluate(function(){
                        var total = $("span.total-entries").size() ? $("span.total-entries").text().match(/[0-9]+/) : 0;
                        var sender = $("a.sender").eq(0).text();
                        return {totalresults: total && total.length ? total[0] : 0, sender: sender};
                    });
                    callback(null,d);
                });
            };
            var ontimeout = function(){
                if(!responded){
                    respond(new Error("proxy_timeout"),null);
                }
            };
            setTimeout(ontimeout,timeout);
            page.onConsoleMessage = logger.log;
            var getResult = function(callback){
                if(page.evaluate(jqEvals.check404)) return callback(new Error("404"));
                var eval = page.evaluate(jqEvals.getTpResult);
                if(conf.env ==='dev') {
    //                    fs.write("domainsearchpage.html", page.content);
                    page.render("domainsearchpage.png");
                }
                if(eval && eval.hasOwnProperty('totalrequests')) callback(null,eval);
                else
                    setTimeout(function(){
                        if(!responded) getResult(callback);
                    },1000);
            };
            var onLoad = function(){
                page.injectJs(jq);
                if(jqEvals.checkHasSorry(page)) return respond(new Error("proxy_failed"));
                if(page.url.match(/google.com\/sorry/i)){
                    logger.error("Google detected that we are a bot :-p");
                    respond(new Error("proxy_failed"),null);
                }else{
                    getResult(function(err,res){
                        getChillingData(post.q,function(errchill,reschill){
                            if(err && errchill) return respond(err);
                            else{
                                if(!res) res = {};
                                if(err) res.error = err.message;
                                res.chillingdata = {};
                                if(errchill) res.chillingdata.error = errchill.message;
                                else res.chillingdata = reschill;
                                respond(null,res);
                            }
                        });
                    });
                }
            };
            page.onLoadFinished = onLoad;

    //            page.onResourceRequested = function(req,nw){
    //                if(req.url.match(/undefined.cache.js/)){
    //                    logger.log("Replacing request : START",req.method,req.url);
    //                    nw.changeUrl("https://www.google.com/transparencyreport/gwt/B578A08772E3D63421EDD1E3B0DCBFF4.cache.js")
    //                }
    //            };
            page.open(url,function(status){
                if(!status=="success")
                    return respond(new Error("page_load_failed"));
                if(conf.env == "dev" ) logger.log("page url on open = "+page.url);
            });
        }

    }
};

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
            case "/piracyreport": methods.post.piracyReport(post); break;
            default : sender.ok(post); break;
        }
    }else{
        switch(req.url){
            case "/proxies" : methods.get.Proxies(); break;
            case "/timeout" : methods.get.Timeout(); break;
            case "/currentproxy" : methods.get.CurrentProxy(); break;
            case "/setnextproxy" : methods.get.NextProxy(); break;
            case "/version" : sender.json({"ok":true,"versiondate":versiondate}); break;
            default : sender.ok(); break;
        }
    }
};

var server = new serverClass(handler);
server.init();