/**
 * Created by Shani (satyashani@gmail.com) on 2/10/14.
 */
var logger = require("./logger");
var versiondate = "2015-04-11 11:52";
var conf = require("./conf.json");

var handler = function(req,res,server){
    logger.log(req.method+": "+req.url);
    server.requests++;
    if(server.requests>30)
        server.changeProxy();

    var getPostData = function(checkfields){
        try{
            var data= JSON.parse(req.post);
            if(checkfields && checkfields.length){
                for(var i=0;i<checkfields.length;i++){
                    if(!data.hasOwnProperty(checkfields[i])){
                        sendError("missing_field:"+checkfields[i]);
                        return false;
                    }
                }
            }
            return data;
        }catch(e){
            sendError("bad_input:"+ e.message);
            return false;
        }
    }

    var handleSearch = function(){
        var data = getPostData(["workerid",'term','type']);
        if(!data) return;
        server.getWorker(data.workerid,function(err,worker){
            if(err) return sendError("worker not logged in");
            else{
                worker.search(data.term,data.type,function(err,res){
                    if(err) sendError(err.message);
                    else send(200,res,true);
                });
            }
        });
    }

    var handleSubmitDmca = function(){
        var data = getPostData(["workerid"]);
        if(!data) return;
        server.getWorker(data.workerid,function(err,worker){
            if(err) return sendError("worker not logged in");
            else{
                worker.submitDmca(data,function(err,res){
                    if(err) sendError(err.message);
                    else send(200,res,true);
                });
            }
        });
    }

    var handleTicketStatus = function(){
        var data = getPostData(["workerid",'ticketid']);
        if(!data) return;
        server.getWorker(data.workerid,function(err,worker){
            if(err) return sendError("worker not logged in");
            else{
                worker.getTicketStatus(data.ticketid,function(err,res){
                    if(err) sendError(err.message);
                    else send(200,res,true);
                });
            }
        });
    }

    var handleChangeWorker = function(){
        var worker = getPostData(["workerid","password"]);
        worker.username = worker.workerid;
        server.changeWorker(worker,function(err,res){
            if(!err && res) sendOk();
            else sendError(err.message);
        })
    }

    var handleGetCurrentWorker = function(){
        var u = server.workers[0].username;
        server.getWorker(u,function(err,worker){
            if(err) return sendError("no worker logged in");
            worker.getCurrentLoggedIn(function(err,res){
                if(err) sendError(err.message);
                else send(200,res,true);
            })
        });
    }

    var handleCleanup = function(){
        var worker = getPostData(["workerid"]);
        server.getWorker(worker.workerid,function(err,worker){
            if(err) return sendError("no worker logged in");
            worker.cleanup(function(){
                if(err) sendError(err.message);
                else sendOk();
            });
        });
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
//        res.setHeader('Content-Length', out.length);
        res.write(out);
        res.closeGracefully();
    }

    if(req.method == "POST"){
        switch(req.url){
            case "/submitdmca" : handleSubmitDmca(); break;
            case "/search" : handleSearch(); break;
            case "/ticketstatus" : handleTicketStatus(); break;
            case "/changeworker": handleChangeWorker(); break;
            case "/": sendOk();
            default : sendError("Unknown POST route:"+req.url); break;
        }
    }else{
        switch(req.url){
            case "/currentworker" : handleGetCurrentWorker(); break;
            case "/cleanup" : handleCleanup(); break;
            case "/version" : send(200,{"ok":true,"version":versiondate},true); break;
            case "/": sendOk();
            default : sendError("Unknown GET route: "+req.url); break;
        }
    }
}

module.exports = handler;
