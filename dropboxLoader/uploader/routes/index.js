/* * ************************************************************ 
 * Date: 28 Oct, 2015
 * programmer: Shani Mahadeva <satyashani@gmail.com>
 * Javascript file index.js
 * *************************************************************** */

var dropbox = require("../lib/dropbox");
var uploads = require("../lib/uploads");
var conf = require("../config");
var mime = require("mime");
var decrypt = require("../lib/crypto");

var upload = function(req,res){
    if(!req.body.url) return res.json({ok : false, status: 'error', message : 'File url not provided'});
    if(!req.body.filename) return res.json({ok: false, status: 'error', message: 'File name not provided'});
    if(!req.cookies['uid']) return res.json({ok : false, status: 'error', message: "You are not logged in"});
    var username = decrypt(req.cookies['uid'], conf.server.cryptkey);
    var path = "/"+username+"/"+req.body.filename;
    dropbox.upload(req.body.url,path,mime.lookup(req.body.url),function(err,id){
        if(!err) res.json({ok: true, job: id, status: 'added', message: "File added to upload queue"});
        else res.json({ok: false, message: err.message, status: 'error', job : id || null});
    });
};

var cancel = function(req,res){
    uploads.removeById(req.params.id,function(err,deleted){
        res.json({ok : !err && !!deleted, cancelled: deleted});
    });
};

var status = function(req,res){
    uploads.getById(req.params.id,function(err,row){
        res.json({ok : !err && !!row.status, status : row.status || (err ? 'error' : 'notfound'), message : row.message });
    });
};

module.exports = function(app){
    app.post("/upload",upload);
    app.get("/:id/status",status);
    app.get("/:id/cancel",cancel);
};