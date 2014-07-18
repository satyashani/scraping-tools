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

    var handleGet = function(){
        //Put a worker to task
        var data = {};
        try{
            var data = JSON.parse(req.post);
            server.getWorker(function(err,worker){
                if(err) sendError(err.message);
                else{
                    console.log("Got worker from server");
                    worker.getDashboard(data,function(errfilling,response){
                        if(errfilling)
                            sendError(errfilling.message);
                        else
                            sendJson(response);
                    });
                }
            });
        }catch(e){
            return sendError("bad_input:"+ e.message);
        }
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
    if(req.method == "POST" && req.url == "/get")
        handleGet();
    else sendOk();
}

var worker = function(conf){
    var username = conf.username?conf.username:gmailuser.username;
    var password = conf.password?conf.password:gmailuser.password;
    this.username = username;
    var changes = 0;
    this.busy = false; this.loggedin = false;
    var page = pg.create();
    this.relogin = false;
    var that = this;
    this.getDashboard = function(ids,callback){
        //Open Dmca Dashboard
        that.busy = true;
        page.injectJs(jq);
        page.onConsoleMessage = function(x){console.log(x)};
        var reports = page.evaluate(function(){
            var rows = $("table#grid tbody tr");
            if(!rows || ! rows.size()) return new Error("No submitted links found.");
            var reports = [];
            rows.each(function(){
                var item = {};
                var a = $(this).find("a[href*='dmca-dashboard-details']").eq(0);
                var id = $(this).find("td.id-column").eq(0).text();
                item.url = a.attr('href');
                item.id = id;
                reports.push(item);
            });
            return reports;
        });
        page.render("dashboard.png");
        if(reports instanceof Error){
            that.busy = false;
            return callback(reports);
        }
        if(!reports || !reports.length){
            that.busy = false;
            return callback(new Error("Url list is empty at dashboard!!"));
        }
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
            }
        }

        page.onUrlChanged = function(url){
            console.log("Url changed to "+url);
            page.injectJs(jq);
            if(changes >=4) return callback(new Error("Could not log in"));
            if(/dmca-dashboard/i.test(url) && changes > 1){
                page.onLoadFinished = null;
                page.onUrlChanged = null;
                that.loggedin = true;
                console.log("Logged in using "+that.username);
                callback(true);
            }
            changes++;
        };
        page.open("https://www.google.com/webmasters/tools/dmca-dashboard?hl=en&pid=0&pli=1",function(stat){
            if(stat == "success"){
                page.injectJs(jq);
                page.evaluate(function(username,password){
                    $("input[type='email']").val(username);
                    $("input[type='password']").val(password);
                    $("input#signIn").click();
                },username,password);
            }else{
                console.log("Worker : "+username+" Failed to login, page did not open");
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
server.prototype.getWorker = function(callback){
    if(!this.workers.length) callback(new Error("no_workers"),null);
    for(var i=0;i<this.workers.length;i++){
        if(this.workers[i].loggedin && !this.workers[i].busy)
            return callback(null,this.workers[i]);
        else{
            console.log("worker "+i+" is "+(this.workers[i].loggedin?"logged in,":"not logged in,")+(this.workers[i].busy?"busy":"free"));
        }
    }
    callback(new Error("workers_busy"),null);
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