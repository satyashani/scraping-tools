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

var noop = function(err){
    if(err) console.log(err.message);
};

dropbox.prototype.upload = function(fileurl,path,mime,size,cb){
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
                uploads.updateStatus(id,'error',err.message,noop);
            };
            var callback = function(res){
                var data = "";
                res.on('data',function(d){
                    data+= d;
                }).on("end",function(){
                    try{
                        var j = JSON.parse(data);
                        if(j.bytes)
                            uploads.updateStatus(id,'complete',"File uploaded successfully",noop);
                        else
                            uploads.updateStatus(id,'complete',"File uploaded with errors",noop);
                    }catch(e){
                        uploads.updateStatus(id,'complete',"File uploaded with errors",noop);
                    }
                }).on("error",function(err){
                    onError(new Error("Dropbox API response error:"+err.message));
                });
            };
            var resCallback = function(res){
                var recv = 0, prev = 0;
                var req = https.request(opt,callback);
                req.on("error",function(err){
                    onError(new Error("Dropbox API request error:"+err.message));
                });
                res.on("data",function(data){
                    recv += data.length;
                    if(Math.floor(recv/size*20) > prev){
                        prev = Math.floor(recv/size*20);
                        uploads.updateStatus(id,'downloading','File transfer '+Math.round(recv*100/size)+"%",noop);
                    }
                });
                res.on("error",function(err){
                    onError(new Error("File response error:"+err.message));
                });
                res.on("close",function(){
                    uploads.updateStatus(id,'downloaded','File transfer complete',noop);
                });
                res.pipe(req);
            };
            var filereq = ishttps ? https.get(fileurl,resCallback) : http.get(fileurl,resCallback);
            filereq.on("error",function(err){
                onError(new Error("File request error:"+err.message));
            });
        });
    });
};

dropbox.prototype.chunkedUpload = function(fileurl,path,mime,size,cb){
    var t = this.token;
    var ishttps = fileurl.match(/^https/);
    var uploadid = null, bytes = 0;
    uploads.getByUrlPath(fileurl,path,function(err,data){
        if(data && data.id) return cb(new Error("File already added for upload"),data.id);
        uploads.add(fileurl,path,function(err,id){
            cb(null,id);
          
            var onError = function(err){
                uploads.updateStatus(id,'error',err.message,noop);
            };

            var createReq = function(endcb){
                var p = '/1/chunked_upload';
                if(uploadid && bytes) p += "?upload_id="+uploadid+"&offset="+bytes;
                var opt = {
                    hostname: 'content.dropboxapi.com',
                    path: p, method: 'PUT',
                    headers: { 'Content-Type': mime, 'Authorization' : "Bearer "+t }
                };
                var callback = function(res){
                    var data = "";
                    res.on('data',function(d){ data+= d; }).on("end",function(){
                        try{
                            var j = JSON.parse(data);
                            if(!j.upload_id){
                                endcb(new Error("Upload failed, bad response from dropbox, response : "+data),j);
                            }else{
                                uploadid = j.upload_id;
                                bytes = j.offset;
                                endcb(null,j);
                            }
                        }catch(e){
                            endcb(new Error("Invalid dropbox response, not a json : "+data),data);
                        }
                    }).on("error",function(err){
                        endcb(new Error("Dropbox API response error:"+err.message));
                    });
                };

                var req = https.request(opt,callback);
                req.on("error",function(err){
                    endcb(new Error("Dropbox API upload request error:"+err.message));
                });
                return req;
            };

            var commit = function(){
                var opt = {
                    hostname: 'content.dropboxapi.com', path: '/1/commit_chunked_upload/auto/'+path,
                    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization' : "Bearer "+t }
                };
                var callback = function(res){
                    var data = "";
                    res.on('data',function(d){
                        data+= d;
                    }).on("end",function(){
                        try{
                            var j = JSON.parse(data);
                            if(j.size)
                                uploads.updateStatus(id,'complete',"File uploaded successfully",noop);
                            else
                                uploads.updateStatus(id,'complete',"File uploaded with errors, response "+data,noop);
                        }catch(e){
                            uploads.updateStatus(id,'complete',"File uploaded with errors, bad json response from dropbox "+data,noop);
                        }
                    }).on("error",function(err){
                        onError(new Error("Dropbox API download response error:"+err.message));
                    });
                };

                var req = https.request(opt,callback);
                req.write("overwrite=true&upload_id="+uploadid);
                req.end();
            };


            var resCallback = function(res){
//                console.log("Starting upload");
                var recv = 0, prev = 0, breakon = 140, reqtotal = 1, currentreq = null;
                var reqCb = function(err,data){
//                    console.log("Inside end cb",err,data,recv);
                    if(err){
                        res.destroy();
                        onError(err);
                    }
                    else{
                        if(data.offset >= size)
                            commit();
                        else{
                            reqtotal++;
//                            console.log("Creating requext",reqtotal);
                            currentreq = createReq(reqCb);
//                            console.log("Resuming input");
                            res.resume();
                        }
                    }
                };
                currentreq = createReq(reqCb);
                res.on("data",function(data){
                    recv += data.length;
                    if(Math.floor(recv/size*20) > prev){
                        prev = Math.floor(recv/size*20);
                        uploads.updateStatus(id,'downloading','File transfer '+Math.round(recv*100/size)+"%",noop);
                    }
                    currentreq.write(data);
                    if(recv >= breakon * reqtotal * 1024 * 1024){
//                        console.log("Pausing input");
                        res.pause();
                        currentreq.end();
                    }
                }).on("end",function(){
                    currentreq.end();
                });
                res.on("error",function(err){
                    onError(new Error("File receive error:"+err.message));
                }).on("close",function(){
                    uploads.updateStatus(uploadid,'downloaded','File transfer complete',noop);
                });
            };
            var filereq = ishttps ? https.get(fileurl,resCallback) : http.get(fileurl,resCallback);
            filereq.on("error",function(err){
                onError(new Error("File request error:"+err.message));
            });

        });
    });
    
};

module.exports = new dropbox();
