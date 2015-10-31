/* * ************************************************************ 
 * Date: 28 Oct, 2015
 * programmer: Shani Mahadeva <satyashani@gmail.com>
 * Javascript file index.js
 * *************************************************************** */

var dropbox = require("../lib/dropbox");
var uploads = require("../lib/uploads");
var mime = require("mime");

var upload = function(req,res){
    if(!req.body.url) return res.json(400,{ok : false, error : 'File url not provided'});
    if(!req.body.path) return res.json(400,{ok: false, error: 'File path not provided'});
    dropbox.upload(req.body.url,req.body.path,mime.lookup(req.body.url),function(err,id){
        if(!err) res.json({ok: true, job: id, status: 'added'});
        else res.json({ok: false, error: err.message, status: 'error', job : id || null});
    });
};

var cancel = function(req,res){
    uploads.removeById(req.params.id,function(err,deleted){
        res.json({ok : !err && !!deleted, cancelled: deleted});
    });
};

var status = function(req,res){
    uploads.getById(req.params.id,function(err,row){
        res.json({ok : !err && !!row.status, status : row.status || (err ? err.message : 'no data')});
    });
};

module.exports = function(app){
    app.post("/upload",upload);
    app.get("/:id/status",status);
    app.get("/:id/cancel",cancel);
};