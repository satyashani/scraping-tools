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
var pg = require("webpage");
var jq = "jquery-1.10.1.min.js";
var fs = require("fs");

var gmailuser = {username : "amit.020585",password : "Rewq!234"};

var handler = function(req,res,server){
    console.log(req.method+": "+req.url);

    var getPostData = function(){
        try{
            var data= JSON.parse(req.post);
            if(!data.workerid){
                sendError("missing_field:workerid");
                return false;
            }
            return data;
        }catch(e){
            sendError("bad_input:"+ e.message);
            return false;
        }
    }

    var handleGetDetails = function(){
        var data = getPostData();
        if(!data) return;
        if(!data.ids) return sendError("missing_field:id");
        server.getWorker(data.workerid,function(err,worker){
            if(err) sendError(err.message);
            else{
                worker.getDashboard(data.ids,function(errdash,response){
                    if(errdash)
                        sendError(errdash.message);
                    else
                        sendJson(response);
                });
            }
        });
    }

    var handleGetUrlInfo = function(){
        var data = getPostData();
        if(!data) return;
        if(!data.url) return sendError("missing_field:url");
        server.getWorker(data.workerid,function(err,worker){
            if(err) sendError(err.message);
            else{
                worker.getUrlDetails(data.url,function(errget,response){
                    if(errget)
                        sendError(errget.message);
                    else
                        sendJson(response);
                });
            }
        });
    }

    var handleGetConfIds = function(){
        var data = getPostData();
        if(!data) return;
        server.getWorker(data.workerid,function(err,worker){
            if(err) sendError(err.message);
            else{
                worker.getConfIds(function(errget,response){
                    if(errget)
                        sendError(errget.message);
                    else
                        sendJson(response);
                });
            }
        });
    }

    var handleGetConfIdByDate = function(){
        var data = getPostData();
        if(!data) return;
        if(!data.date) return sendError("missing_field:date");
        var date = new Date(Date.parse(data.date));
        server.getWorker(data.workerid,function(err,worker){
            if(err) sendError(err.message);
            else{
                worker.getConfIdByDate(date,function(errget,response){
                    if(errget)
                        sendError(errget.message);
                    else
                        sendJson(response);
                });
            }
        });
    }

    var handleGetReqCount = function(){
        var data = getPostData();
        if(!data) return;
        server.getWorker(data.workerid,function(err,worker){
            if(err) sendError(err.message);
            else{
                sendJson({count: worker.requests, since: worker.lastreset.getTime()});
                if(data.reset) worker.resetCount();
            }
        });
    }

    var sendJson = function(out){
        send(200,out,true);
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
        res.setHeader('Content-Length', out.length);
        res.write(out);
        res.closeGracefully();
    }

    if(req.method == "POST"){
        switch(req.url){
            case "/geturlinfo" : handleGetUrlInfo(); break;
            case "/getsubmissiondetails" : handleGetDetails(); break;
            case "/getidsbydate" : handleGetConfIdByDate(); break;
            case "/getcomfirmationids" : handleGetConfIds(); break;
            case "/getrequestcount" : handleGetReqCount(); break;
            default : sendOk(); break;
        }
    }else{
        switch(req.url){
            default : sendOk(); break;
        }
    }
}

var worker = function(conf){
    var username = conf.username?conf.username:gmailuser.username;
    var password = conf.password?conf.password:gmailuser.password;
    this.username = username;
    var changes = 0;
    this.busy = false; this.loggedin = false; this.requests = 0,this.lastreset=new Date();
    var page = pg.create();
    page.onConsoleMessage = function(){console.log.apply(console,arguments);};
    var dashboardurl = "https://www.google.com/webmasters/tools/dmca-dashboard?rlf=all&grid.s=500";
    this.relogin = false;
    var that = this;
    this.resetCount = function(){this.requests = 0; this.lastreset = new Date()};
    this.requestCheck = function(){
        this.requests++;
        if(new Date().getTime() - this.lastreset.getTime() > 86400000) this.resetCount();
    }
    this.openDashboard = function(callback){
        this.requestCheck();
        page.open(dashboardurl,function(stat){
            if(!stat=='success'){
                page.render("dashboard.png");
                return callback(new Error("Failed to open dmca dashboard."));
            }
            setTimeout(function(){
                page.injectJs(jq);
                callback(null);
            },2000);
        });
    };
    this.getConfIds = function(callback){
        var ids = [];
        page.onLoadFinished = function(){
            page.injectJs(jq);
            var counts = page.evaluate(function(){
                var t = $("div.table-range-text").eq(0).text();
                var m = t.match(/(\d+)\-(\d+) of (\d+)/);
                return {total: parseInt(m[3]),read: parseInt(m[2])};
            });
            var newids = page.evaluate(function(){
                var rows = $("table#grid tbody tr");
                if(!rows || ! rows.size()) return [];
                var reports = [];
                rows.each(function(){
                    var a = $(this).find("td.date-column a");
                    var id = $(this).find("td.id-column").text();
                    reports.push(id);
                });
                return reports;
            });
            ids = ids.concat(newids);
            if(counts.read<counts.total){
                page.open(dashboardurl+"&grid.r="+(counts.read+1));
            }else{
                page.onLoadFinished = null;
                callback(null,ids);
            }
        }
        page.open(dashboardurl,function(status){
            if(status!='success') callback(new Error("failed to open dashboard."));
        });
    };
    this.getUrlDetails = function(url,callback){
        that.openDashboard(function(err){
            if(err) return callback(err);
            page.onLoadFinished = function(){
                if(!page.url.match(/url\-match/i)){
                    console.log("Search result page url = "+page.url);
                    return;
                }
                page.onLoadFinished = null;
                page.injectJs(jq);
                var foundSubmitUrl = page.evaluate(function(){
                    var size = $("table#grid tbody a").size();
                    if(!size) return size;
                    return "https://www.google.com"+$("table#grid tbody a").attr("href")+"&approved.s=100&pending.s=100&rejected.s=100";
                });
                if(!foundSubmitUrl){
                    page.render("urlsearchpage.png");
                    return callback(new Error("No dmca submission found for this url."));
                }
                page.open(foundSubmitUrl,function(stat){
                    if(!stat=='success') return callback(new Error("Error opening url details page: "+foundSubmitUrl));
                    page.injectJs(jq);
                    var res = page.evaluate(function(url){
                        var links = $("table.grid div.url-item a"),result={};
                        for(var i=0;i<links.size();i++){
                            if(links.eq(i).attr("href")===url){
                                result.status = links.eq(i).parents("table.grid").attr("id");
                                result.message = links.eq(i).parents("tr").find("td.rightmost").text();
                                break;
                            }
                        }
                        return result;
                    },url);
                    callback(null,res);
                });
            };
            page.evaluate(function(url){
                $('input[name="url-match"]').val(url);
                $("form.url-match-form").submit();
            },url);
        })
    }

    this.getConfIdByDate = function(date,callback){
        var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        var dt = months[date.getMonth()]+" "+(date.getDate())+", "+date.getFullYear();
        var ids = [];
        page.onLoadFinished = function(){
            page.injectJs(jq);
            var counts = page.evaluate(function(){
                var t = $("div.table-range-text").eq(0).text();
                var m = t.match(/(\d+)\-(\d+) of (\d+)/);
                return {total: m.length>3?parseInt(m[3]):0,read: m.length>2?parseInt(m[2]):0};
            });
            var newids = page.evaluate(function(date){
                var rows = $("table#grid tbody tr");
                if(!rows || ! rows.size()) return [];
                var reports = [];
                rows.each(function(){
                    var a = $(this).find("td.date-column a");
                    var id = $(this).find("td.id-column").text();
                    if(a.text().indexOf(date)>-1)
                        reports.push(id);
                });
                return reports;
            },dt);
            ids = ids.concat(newids);
            if(counts.read<counts.total){
                page.open(dashboardurl+"&grid.r="+(counts.read+1));
            }else{
                page.onLoadFinished = null;
                callback(null,ids);
            }
        }
        page.open(dashboardurl,function(status){
            if(status!='success') callback(new Error("failed to open dashboard."));
        });
    }
    this.getDashboard = function(ids,callback){
        that.openDashboard(function(err){
            if(err) return callback(err);
            page.onConsoleMessage = function(x){console.log(x)};
            var baseurl = page.evaluate(function(){
                var rows = $("table#grid tbody tr");
                if(!rows || ! rows.size()) return false;
                return rows.eq(0).find("a[href*='dmca-dashboard-details']").eq(0).attr('href');
            });
            if(!baseurl) return callback(new Error("No details url on dashboard"));
            var reports = [];
            ids.forEach(function(id){
                reports.push({id: id, url: baseurl.replace(/dmcatid=.*\&/,"dmcatid="+id+"&")});
            });
            var done = 0,results = [];
            var onEnd = function(){
                done++;
                if(done===reports.length){
                    that.busy = false;
                    callback(null,results);
                }
            }
            reports.forEach(function(report,i){
                if(ids.indexOf(report.id)===-1) return onEnd();
                var mypage = pg.create(),myurl = "https://www.google.com"+report.url+"&approved.s=100&pending.s=100&rejected.s=100";
                mypage.onLoadFinished = function(){
                    mypage.injectJs(jq)
                    var onDetailsPage = mypage.evaluate(function(){
                        return $("table#approved").size() || $("table#rejected").size() || $("table#pending").size();
                    });
                    if(onDetailsPage){
                        setTimeout(function(){
                            var res = mypage.evaluate(function(){
                                var res = {
                                    approved: [],rejected: [],pending: []
                                };
                                $("table#approved div.url-item a").each(function(){
                                    res.approved.push($(this).attr('href'));
                                });
                                $("table#rejected div.url-item a").each(function(){
                                    res.rejected.push($(this).attr('href'));
                                });
                                $("table#pending div.url-item a").each(function(){
                                    res.pending.push($(this).attr('href'));
                                });
                                return res;
                            });
                            if(res.approved.length || res.pending.length || res.rejected.length){
                                results.push({id: report.id, results: res});
                                onEnd();
                            }
                        },3000);
                    }
                };
                mypage.open(myurl);
            });
        })
    }

    this.login = function(callback){
        this.loggedin = false;
        var that = this;
        page.clearCookies();
        console.log("Login request for "+username);
        page.onLoadFinished = function(){
            var url = page.url;
            page.injectJs(jq);
            if(url.match(/ServiceLogin/)){
                console.log("At login page..");
                page.evaluate(function(username,password){
                    $("input[type='email']").val(username);
                    $("input[type='password']").val(password);
                    $("input#signIn").click();
                },username,password);
            }else{
                page.render("loginpage.png");
            }
        }

        page.onUrlChanged = function(url){
            console.log("Url changed to "+url);
            page.injectJs(jq);
            if(changes >=4) return callback(new Error("Could not log in"));
            if(/settings/i.test(url) && changes > 1){
                page.onLoadFinished = null;
                page.onUrlChanged = null;
                that.loggedin = true;
                console.log("Logged in using "+that.username);
                callback(true);
            }
            changes++;
        };
        page.open("https://accounts.google.com/ServiceLogin",function(stat){
            if(stat == "success"){
                page.injectJs(jq);
                page.evaluate(function(username,password){
                    $("input[type='email']").val(username);
                    $("input[type='password']").val(password);
                    $("input#signIn").click();
                },username,password);
            }else{
                console.log("Worker : "+username+" Failed to login, Login page did not open");
            }
        });
    }
}

var server = function(){
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
server.prototype.addWorker = function(conf){
    var o = this;
    var wrk = new worker(conf);
    wrk.login(function(res){
        if(res===true){
            o.workers.push(wrk);
        }else{
            console.log("Failed to add worker for conf - "+JSON.stringify(conf));
        }
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

server.prototype.start = function(port){
    var o = this;
    return ws.create().listen(port,function(req,res){
        handler(req,res,o);
    });
}

server.prototype.init = function(){
    var o = this;
    var conf = JSON.parse(fs.read("conf.json"));
    if(conf.proxies)
        o.proxies = conf.proxies;
    for(var i=0;i<conf.workers.length;i++){
        o.addWorker(conf.workers[i]);
    }
    var timeout = 10000,retries=0;
    var checkWorkersAndStart = function(){
        if(!o.workers.length){
            if(retries<6){
                retries++;
                console.log("Waiting for workers to log in, attempt "+retries);
                setTimeout(checkWorkersAndStart,timeout);
            }else{
                console.log("Workers failed to login in "+(retries*timeout)+" seconds, quitting.");
                o.exit();
            }
        }else{
            if(!o.start(conf.port)){
                console.log('Workers logged in but failed to start web server, exiting.');
                o.exit();
            }else{
                console.log("Web server started at http://localhost:"+conf.port);
            }
        }
    }
    checkWorkersAndStart();
}

server.prototype.exit = function(){
    phantom.exit();
}

new server().init();