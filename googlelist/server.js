/**
 * Created by Shani(satyashani@gmail.com) on 22/3/15.
 */

var ws =  require('webserver');
var sys = require("system");
var fs = require("fs");
var conf = require("./conf.json");
var logger = require("./logger");

var confBase = {
    env : "dev", changeproxyreqlimit: 50,
    proxyapikey: "729fb2b0ef57fc06cdac1b5525c9b0",
    resultsperquery : 100,
    proxysource : "kingproxy",
    useproxies: true,
    timeout: 30000,
    port: 9092
};
for(var k in confBase)
    if(!conf.hasOwnProperty(k)) conf[k] = confBase[k];

if(sys.args.length && sys.args.length >= 2 && parseInt(sys.args[1]))
    conf.port = sys.args[1];

var proxyApi = {
    kingProxy: function(callback){
        var page = pg.create();
        var url="http://kingproxies.com/api/v1/proxies.json?key="+conf.proxyapikey+"&limit=5&protocols=http&supports=google&type=anonymous";
        var proxyhome = "http://kingproxies.com";
        if(conf.env=='dev')  logger.log("Loading proxies from kingproxies.com");
        page.open(proxyhome,function(){
            page.injectJs(jq);
            var p = page.evaluate(function(url){
                var d = {};
                $.ajax({
                    url: url,
                    async: false,
                    success: function(data){
                        d = data;
                    },
                    error: function(x){
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
        if(conf.env=='dev')  logger.log("Loading proxies from file proxies.json");
        if(!fs.isReadable("proxies.json"))
            return callback(new Error("file proxies.json not readable"),null);
        var data = JSON.parse(fs.read("proxies.json"));
        if(!data.length) callback(new Error("Proxy list empty",null));
        else callback(null,data);
    }
};


var server = function(handler){
    this.proxies  = [];
    this.currentproxy = 0;
    this.timeout = conf.timeout?conf.timeout:30000;
    this.conf = {};
    this.handler = handler;
    return this;
};

server.prototype.constructor = server;

server.prototype.setProxies = function(p){
    this.proxies = p;
    this.currentproxy = 0;
    return this.setProxy();
};

server.prototype.removeCurrentProxy = function(){
    if(this.proxies.length && this.currentproxy<this.proxies.length){
        this.proxies.splice(this.currentproxy,1);
        if(this.proxies.length)
            this.currentproxy = this.currentproxy%this.proxies.length;
        else this.currentproxy=0;
    }
};

server.prototype.nextProxy = function(){
    if(!conf.useproxies) return true;
    if(!this.proxies.length){
        this.refreshProxies(function(){
            if(conf.env=='dev' && this.proxies.length) logger.log("Proxies refreshed.");
        });
    }else{
        this.removeCurrentProxy();
        return this.setProxy();
    }
};

server.prototype.setProxy = function(){
    if(this.proxies.length){
        if(this.currentproxy>=this.proxies.length){
            logger.error("Current proxy index greater than proxy length, this shouldn't happen, it is a bug, contact script author.");
            return false;
        }
        var p = this.proxies[this.currentproxy];
        if(conf.env=='dev') logger.log("Changing proxy, new proxy = "+ p.ip);
        var type = p.type? p.type:"http";
        var user = p.user? p.user:"";
        var passwd = p.password? p.password:"";
        phantom.setProxy(p.ip, p.port,type,user,passwd);
        return true;
    }else{
        logger.error("Failed to change proxy, proxy list is empty or not enough proxies, check proxy setup.");
        return false;
    }
};

server.prototype.start = function(port){
    var o = this;
    return ws.create().listen(port,{'keepAlive': false},function(req,res){
        this.handler(req,res,o);
    });
};

server.prototype.refreshProxies = function(callback){
    var o = this;
    var onchange = function(err,data){
        if(!err){
            if(conf.env=='dev')  logger.log("Proxies loaded.");
            o.setProxies(data);
            callback();
        }
        else{
            logger.error(err.message);
            o.exit();
        }
    };
    if(conf.proxysource =='file'){
        proxyApi.file(onchange);
    }else if(conf.proxysource=="kingproxy"){
        proxyApi.kingProxy(onchange);
    }else{
        callback();
    }
};

server.prototype.startServer = function(){
    if(!this.start(conf.port)){
        logger.log('Failed to start web server on port "+conf.port+", exiting.');
        this.exit();
    }else{
        logger.log("Web server started at http://localhost:"+conf.port);
    }
};

server.prototype.init = function(){
    var o = this;
    o.timeout = conf.timeout;
    if(conf.useproxies)
        o.refreshProxies(function(){
            o.startServer();
        });
    else o.startServer();

};

server.prototype.exit = function(){
    phantom.exit();
};

module.exports = server;
