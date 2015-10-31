/* * ************************************************************ 
 * Date: 29 Oct, 2015
 * programmer: Shani Mahadeva <satyashani@gmail.com>
 * Javascript file dropbox.js
 * *************************************************************** */

var http = require("http");
var https = require("https");
var config = require("../config");
var uploads = require("./uploads");

var dropbox = function(){
    this.token = config.dropbox.token || "";
    this.key = config.dropbox.key || "";
    this.secret = config.dropbox.secret || "";
    if(!this.key) console.error("Dropbox key is not set in config");
    if(!this.secret) console.error("Dropbox secret is not set in config");
    this.login(function(err){
        if(err) console.error("Could not login to dropbox, error :",err.message);
    });
};

dropbox.prototype.login = function(cb){
    if(this.token) cb();
    else{
        cb(new Error("Login Failed, token not set"));
    }
};

var noop = function(){};

dropbox.prototype.upload = function(fileurl,path,mime,cb){
    if(!this.token) return cb(new Error("Not logged in to dropbox"));
    var t = this.token;
    uploads.getByUrlPath(fileurl,path,function(err,data){
        if(data && data.id) return cb(new Error("File already added for upload"),data.id);
        uploads.add(fileurl,path,function(err,id){
            cb(null,id);
            var ishttps = fileurl.match(/^https/);
            var opt = {
                hostname: 'content.dropboxapi.com',
                path: '/1/files_put/auto/'+path,
                method: 'PUT',
                headers: {
                  'Content-Type': mime,
                  'Authorization' : "Bearer "+t
                }
            };
            var onError = function(err){
                uploads.updateStatus(id,"Error:"+err.message,noop);
            };
            var callback = function(res){
                var data = "";
                res.on('data',function(d){
                    data+= d;
                }).on("end",function(){
                    uploads.updateStatus(id,'complete:'+data,noop);
                }).on("error",onError);
            };
            var resCallback = function(res){
                var req = https.request(opt,callback);
                req.on("error",onError);
                res.on("readable",function(){
                    uploads.updateStatus(id,'downloading');
                }).on("error",onError);
                res.on("close",function(){
                    uploads.updateStatus(id,'downloaded');
                });
                res.pipe(req);
            };
            ishttps ? https.get(fileurl,resCallback) : http.get(fileurl,resCallback);
        });
    });
};

module.exports = new dropbox();
