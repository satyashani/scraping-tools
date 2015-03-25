/**
 * Created by Shani(satyashani@gmail.com) on 24/3/15.
 */

var pg = require("webpage");
var sys = require("system");
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

for(var i=0;i<sys.args.length;i++){
    if(sys.args[i] === 'useproxies=false') conf.useproxies = false;
}
logger.log("Starting with config:");
logger.log(JSON.stringify(conf));
var versiondate = "2015-03-25 8:56";
var useragents = fs.read("useragents.json");
var getUserAgent = function(){
    return useragents[Math.floor(Math.random()*useragents.length)];
};

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
        getHtml : function(post){
            if(!post.url) return sender.error("missing_query_parameter:url");
            var page = pg.create();
            page.settings.userAgent = getUserAgent();
            page.settings.loadImages = false;
            page.viewportSize = {width: 1366,height: 800};
            page.onError = null;
            var timeout = server.timeout?server.timeout:120000,totalrequests = 0,responded = false;
            var resourceWait = 3000,
                url = post.url;

            var count = 0,renderTimeout=0;

            var pageClose = function(){
                page.onResourceReceived = null;
                page.onResourceRequested = null;
                page.close();
            };

            setTimeout(function(){
                if(!responded){
                    responded = true;
                    pageClose();
                    sender.error("pageload_timeout");
                }
            },timeout);

            function sendContent() {
                if(!responded) {
                    responded = true;
                    sender.html(page.content);
                    pageClose();
                }
            }

            page.onResourceRequested = function () {
                count += 1;
                totalrequests++;
                if(renderTimeout) clearTimeout(renderTimeout);
            };

            page.onResourceReceived = function (res) {
                if (!res.stage || res.stage === 'end') {
                    count -= 1;
                    if (totalrequests > 1 && count === 0 && !responded) {
                        renderTimeout = setTimeout(sendContent, resourceWait);
                    }
                }
            };

            page.open(url, function (status) {
                //            forcedRenderTimeout = setTimeout(sendContent, maxRenderWait);
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
            case "/gethtml": methods.post.getHtml(post); break;
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