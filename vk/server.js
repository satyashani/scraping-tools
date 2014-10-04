/* * ************************************************************ 
 * 
 * Date: May 31, 2013
 * version: 1.0
 * programmer: Shani Mahadeva <satyashani@gmail.com>
 * Description:   
 * Javascript file scrapercursos.js
 * 
 * 
 * *************************************************************** */
var ws =  require('webserver');
var fs = require("fs");
var logger = require("./logger");
var handler = require("./handler");
var worker = require("./worker");
var conf = require("./conf");

var server = function(){
    this.started = false;
    this.proxies  = [];
    this.workers = [];
    this.requests = 0;
}

server.prototype.setProxies = function(p){
    this.proxies = p; return this;
}

server.prototype.changeProxy = function(){
    phantom.setProxy(this.proxies[Math.ceil(Math.random()*this.proxies.length)]);
    for(var i=0;i<this.workers.length;i++)
        this.workers.relogin = true;
    this.requests = 0;
}

/**
 *
 * @param conf Object having {usrename :'',password: ''}
 */
server.prototype.addWorker = function(config,callback){
    var o = this;
    var wrk = new worker(config);
    logger.log("adding worker with username:",config.username);
    wrk.login(function(err,res){
        if(!err && res===true)
            o.workers.push(wrk);
        else
            logger.log("Failed to add worker "+config.username+", error:"+err.message);
        callback(err,res);
    });
}

/**
 *
 * @param callback function(err,worker){}. error could be "no_workers" or "workers_busy";
 * @returns {*}
 */
server.prototype.getWorker = function(id,callback){
    if(!this.workers.length) callback(new Error("no_workers"),null);
    for(var i=0;i<this.workers.length;i++){
        if(this.workers[i].username===id){
            if(!this.workers[i].loggedin) return callback(new Error("not_logged_in"));
            if(this.workers[i].busy) return callback(new Error("worker_busy"));
            return callback(null,this.workers[i]);
        }
    }
    callback(new Error("worker_not_found"),null);
}

server.prototype.changeWorker = function(worker,callback){
    phantom.clearCookies();
    for(var i=0;i<this.workers.length;i++) this.workers[i] = null;
    this.workers = [];
    this.addWorker(worker,callback);
}

server.prototype.start = function(port){
    var o = this;
    this.started = ws.create().listen(port,function(req,res){
        handler(req,res,o);
    });
}

server.prototype.init = function(){
    var o = this;
    if(conf.proxies)
        o.proxies = conf.proxies;
    var tryLogin = function(i){
        o.addWorker(conf.workers[i],function(err,res){
            if(err){
                logger.log("Error logging in using ",conf.workers[i].username,":",err.message);
                if(i<conf.workers.length-1) tryLogin(i+1);
                else{
                    logger.log("All workers failed to login");
                    o.exit();
                }
            }else{
                o.start(conf.port);
                if(!o.started){
                    logger.log("Workers logged in but failed to start web server on port "+conf.port+", exiting.");
                    o.exit();
                }else{
                    logger.log("Web server started at port "+conf.port);
                }
            }
        });
    }
    tryLogin(0);
}

server.prototype.exit = function(){
    phantom.exit();
}

new server().init();