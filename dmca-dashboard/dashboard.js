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

var versiondate = "2014-09-04 8:52";

var logger = {
    error:function(){
        var date = new Date();
        var d = date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate()+" "+date.getHours()+":"+date.getMinutes()+":"+date.getSeconds();
        var args = [d," -- "].concat(Array.prototype.slice.call(arguments));
        console.error.apply(console,args);
    },
    log:function(){
        var date = new Date();
        var d = date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate()+" "+date.getHours()+":"+date.getMinutes()+":"+date.getSeconds();
        var args = [d," -- "].concat(Array.prototype.slice.call(arguments));
        console.log.apply(console,args);
    }
}

var handler = function(req,res,server){
    logger.log(req.method+": "+req.url);

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

    var handleGetUrlCountByDate = function(){
        var data = getPostData();
        if(!data) return;
        if(!data.date) return sendError("missing_field:date");
        var date = new Date(Date.parse(data.date));
        server.getWorker(data.workerid,function(err,worker){
            if(err) sendError(err.message);
            else{
                worker.getUrlCountByDate(date,function(errget,response){
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

    var handleChangeWorker = function(){
        var worker = getPostData();
        if(!worker.workerid || !worker.password)
            return sendError("missing_workerid_or_password");
        worker.username = worker.workerid;
        server.changeWorker(worker,function(err,res){
            if(!err && res) sendOk();
            else sendError(err.message);
        })
    }


    var handleGetCurrentWorker = function(){
        if(!server.workers.length || !server.workers[0].loggedin) return sendError("no workers");
        var u = server.workers[0].username;
        server.getWorker(u,function(err,worker){
            if(err) return sendError("No worker logged in");
            worker.getCurrentLoggedIn(function(err,res){
                if(err) sendError(err.message);
                else send(200,res,true);
            })
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
//        res.setHeader('Content-Length', out.length);
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
            case "/geturlcountbydate" : handleGetUrlCountByDate(); break;
            case "/changeworker" : handleChangeWorker(); break;
            default : sendOk(); break;
        }
    }else{
        switch(req.url){
            case "/currentworker" : handleGetCurrentWorker(); break;
            case "/version" : send(200,{"ok":true,"versiondate":versiondate},true); break;
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
    page.onConsoleMessage = logger.log;
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
                var time = new Date().toString().replace(/ /g,'_');
                page.render("images/dashboard.+"+time+".png");
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
                    logger.log("Search result page url = "+page.url);
                    return;
                }
                page.onLoadFinished = null;
                page.injectJs(jq);
                var res = page.evaluate(function(){
                    var out = {};
                    out.size = $("table#grid tbody a").size();
                    if(!out.size) return out;
                    out.url = "https://www.google.com"+$("table#grid tbody tr.first td.date-column a").attr("href")+"&approved.s=100&pending.s=100&rejected.s=100";
                    out.id = $("table#grid tbody tr.first td.id-column").text();
                    out.date = $("table#grid tbody tr.first td.date-column").text();
                    return out;
                });
                if(!res.url){
                    var time = new Date().toString().replace(/ /g,'_');
                    page.render("images/urlsearchpage."+time+".png");
                    return callback(new Error("No dmca submission found for this url."));
                }
                page.open(res.url,function(stat){
                    if(!stat=='success') return callback(new Error("Error opening url details page: "+res.url));
                    page.injectJs(jq);
                    var tries = 0,hasDetails = false;
                    var checkhasdetails = function(){
                        hasDetails = page.evaluate(function(){
                            return $("table.grid div.url-item a").size();
                        });
                        if(!hasDetails){
                            if(tries<10){
                                tries++;
                                setTimeout(checkhasdetails,500);
                            }else{
                                callback(new Error("url details failed to load in  5000ms"));
                            }
                        }else{
                            var out = page.evaluate(function(url){
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
                            res.message = out.message?out.message:" ";
                            res.status = out.status?out.status:" ";
                            delete res.size;
                            delete res.url;
                            callback(null,res);
                        }
                    }
                    checkhasdetails();
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
                return {total: m && m.length>3?parseInt(m[3]):0,read: m && m.length>2?parseInt(m[2]):0};
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

    this.getUrlCountByDate = function(date,callback){
        var dt = date.getFullYear()*10000+(date.getMonth()+1)*100+date.getDate();
        var urlcount = 0;
        page.onLoadFinished = function(){
            page.injectJs(jq);
            var results = page.evaluate(function(date){
                var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                var t = $("div.table-range-text").eq(0).text();
                var m = t.match(/(\d+)\-(\d+) of (\d+)/);
                var result = {hasmore: false, totalurls: 0, read: m && m.length>2?parseInt(m[2]):0};
                var rows = $("table#grid tbody tr");
                if(!rows || ! rows.size()) return result;
                if(m) result.hasmore = parseInt(m[2])<parseInt(m[3]);
                for(var i=0;i<rows.size();i++){
                    var a = $(rows.eq(i)).find("td.date-column a");
                    if(a.size() && a.text()){
                        var m = a.text().match(/([A-z]+) ([0-9]+), ([0-9]+)/);
                        var rowdate = m?parseInt(m[3])*10000+(months.indexOf(m[1])+1)*100+parseInt(m[2]):false;
                        if(rowdate){
                            if(rowdate==date){
                                result.totalurls += parseInt($(rows.eq(i)).find("td.number").eq(0).text());
                            }
                            if(rowdate<date){
                                result.hasmore=false;
                                return result;
                            }
                        }
                    }else return result;

                }
                return result;
            },dt);
            urlcount+=results.totalurls;
            if(results.hasmore){
                page.open(dashboardurl+"&grid.r="+(results.read+1));
            }else{
                page.onLoadFinished = null;
                callback(null,{urlcount: urlcount});
            }
        }
        page.open(dashboardurl,function(status){
            if(status!='success') callback(new Error("failed to open dashboard."));
        });
    };

    this.getDashboard = function(ids,callback){
        that.openDashboard(function(err){
            if(err) return callback(err);
            page.onConsoleMessage = logger.log;
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
        logger.log("Login request for "+username);
        var timeout = false,serviceLogin = false;
        setTimeout(function(){
            if(!that.loggedin){
                timeout = true;
                page.onLoadFinished = null;
                callback(new Error("login_timeout"));
            }
        },20000);
        var time = new Date().toString().replace(/ /g,'_');
        page.onLoadFinished = function(){
            var url = page.url;
            logger.log("login page redirect url=",url);
            page.injectJs(jq);
            if(timeout) return;
            var loginerror = page.evaluate(function(){
                var errorspan = $("span.error-msg");
                if(!errorspan.size()) return false;
                else return errorspan.text().trim();
            });
            if(loginerror){
                page.render("images/dashboardloginerror."+time+".png");
                return callback(new Error("Login page error:"+loginerror));
            }
            if(changes >=4) return callback(new Error("Could not log in"));
            if(/LoginVerification|VerifiedPhoneInterstitial/i.test(url)){
                page.render("images/dashboardloginverify."+time+".png");
                return callback(new Error("login failed: requires verification"));
            }
            if(/dmca-dashboard/i.test(url) && serviceLogin){
                that.loggedin  = true;
                page.onLoadFinished = null;
                logger.log("Logged in using "+that.username);
                var testpage = function(){
                    page.injectJs(jq);
                    var loaded = page.evaluate(function(){
                        return $("form.url-match-form").size();
                    });
                    if(loaded) callback(null,true);
                    else{
                        page.render("images/dashboardafterlogin."+time+".png");
                        setTimeout(testpage,500);
                    }
                }
                testpage();
            }
            if(url.match(/ServiceLogin/)){
                serviceLogin = true;
                page.evaluate(function(username,password){
                    $("input[type='email']").val(username);
                    $("input[type='password']").val(password);
                    $("input#signIn").click();
                },username,password);
            }
            changes++;
        }
        page.open("https://www.google.com/webmasters/tools/dmca-dashboard",function(stat){
            if(stat !== "success"){
                logger.log("Worker : "+username+" Failed to login, Login page did not open");
                callback(new Error("login_page_load_failed"));
            }
        });
    }

    this.getCurrentLoggedIn = function(callback){
        page.open("https://www.google.com/webmasters/tools/dmca-dashboard?hl=en&pid=0",function(opened){
            if(opened !== "success")
                return callback(new Error("error_opening_dmca_page"),null);
            page.injectJs(jq);
            page.onConsoleMessage = logger.log;
            var tries = 0;
            var checkAccountDetails = function(){
                var res = page.evaluate(function(){
                    if(!$("a[title*='Account']").size()) return false;
                    var t = $("a[title*='Account']").eq(0).attr('title');
                    var m = t.match(/Account ([A-z ]*)\s*\((.*)\)/);
                    if(!m) m = t.match(/Account(\s*)(.*@.*)/);
                    return {title: t, email: m?m[2]:"-",name:m?m[1]:'-'};
                });
                if(!res){
                    if(tries<5){
                        tries++;
                        setTimeout(checkAccountDetails,500);
                    }else{
                        callback(new Error("account details failed to load in  2500ms"));
                    }
                }else{
                    callback(null,res);
                }
            }
            checkAccountDetails();
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
server.prototype.addWorker = function(config,callback){
    var o = this;
    var wrk = new worker(config);
    wrk.login(function(err,res){
        if(!err && res===true)
            o.workers.push(wrk);
        else
            logger.log("Failed to add worker "+config.username+", error:"+err.message);
        callback(err,res);
    });
}

server.prototype.changeWorker = function(worker,callback){
    phantom.clearCookies();
    for(var i=0;i<this.workers.length;i++) this.workers[i] = null;
    this.workers = [];
    this.addWorker(worker,callback);
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
    this.started = ws.create().listen(port,function(req,res){
        handler(req,res,o);
    });
}

server.prototype.init = function(){
    var o = this;
    var conf = JSON.parse(fs.read("conf.json"));
    if(conf.proxies)
        o.proxies = conf.proxies;
    var failedlogins = 0;
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