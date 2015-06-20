/**
 * Created by Shani(satyashani@gmail.com) on 17/6/15.
 */

var pg = require("webpage");
var logger = require("./logger");
var fs = require("fs");
var jq = "jquery-1.10.1.min.js";

var conf = JSON.parse(fs.read("conf.json"));

var captchaApis = {
    "dbc": {
        reqlist: {},
        creds : {username: "hugs", password: "ugosara"},
        solve: function (captchafile, callback) {
            var dbc = captchaApis.dbc.creds;
            var page = pg.create(), urlchanges = 0, calledBack = false;
            page.content = "<html><body>" +
                "<form action='http://api.dbcapi.me/api/captcha' method='post' enctype='multipart/form-data'>" +
                "<input type='text'     name='username' value='" + dbc.username + "'>" +
                "<input type='password' name='password' value='" + dbc.password + "'>" +
                "<input id='captchafile' type='file'     name='captchafile' >" +
                "</form></body></html>";
            page.injectJs(jq);
            page.uploadFile("input#captchafile", captchafile);
            page.onConsoleMessage = logger.log;
            var caller = function (err, res) {
                if (!calledBack) {
                    calledBack = true;
                    callback(err, res);
                }
            }
            setTimeout(function () {
                caller(new Error("captcha_timeout"));
            }, conf.captchatimeout);
            page.onUrlChanged = function (url) {
                urlchanges++;
                logger.log("captcha_decode_step:url=" + url);
                var m = url.match(new RegExp("api\/captcha\/([0-9]+)"));
                if (m) {
                    var id = m[1];
                    page.injectJs(jq);
                    logger.log("captcha_decode_step:captcha uploaded");
                    var captcha = page.evaluate(function (captchaurl) {
                        var c = "", tries = 0;
                        var poll = function () {
                            tries++;
                            console.log("captcha_decode_step:poll try - " + tries);
                            for (i = 0, j = 0; i < 400000000; i++)
                                j++;
                            $.ajax({
                                url: captchaurl,
                                async: false,
                                headers: {"Accept": "application/json"},
                                success: function (data) {
                                    console.log("captcha_decode_step:captcha decoded - " + tries);
                                    if (data.text) {
                                        c = data;
                                    }
                                    else if (tries < 5) {
                                        poll();
                                    }
                                },
                                error: function (x, t) {
                                    c = new Error(t);
                                    console.log("captcha_decode_step:error from DBC page - " + t);
                                    if (tries < 5) {
                                        poll();
                                    }
                                }
                            })
                        };
                        poll();
                        return c;
                    }, url);
                    captchaApis.dbc.reqlist[captchafile] = id;
                    if (captcha.text)
                        caller(null, captcha.text);
                    else
                        caller(new Error("dbc_api_error:" + JSON.stringify(captcha)), null);
                } else if (urlchanges >= 2)
                    caller(new Error("dbc_api_redirect_failed:" + url), null);
            };
            page.evaluate(function () {
                $("form").submit();
            });
        },
        report: function(filename){
            var page = pg.create();
            var post = "username="+ captchaApis.dbc.creds.username+"&password="+ captchaApis.dbc.creds.password;
            page.open("http://api.dbcapi.me/api/captcha/"+captchaApis.dbc.reqlist[filename]+"/report",'POST',post,function(stat){
                if(stat != 'success') console.error("Failed to send captcha error request");
            });
        },
        remove: function(filename){
            fs.remove(filename);
            if(captchaApis.dbc.reqlist.hasOwnProperty(filename)) delete captchaApis.dbc.reqlist[filename];
        }
    },
    "bpc": {
        solve:
            function(captchafile,callback){
                var bpckey = "e5740194374a84031346a48321b32e58";
                var page = pg.create(),urlchanges= 0,timeout=false;
                var captcha = fs.read(captchafile).replace("base64:","");
                page.content = "<html><body>" +
                    "<form id='uploadform' action='http://bypasscaptcha.com/upload.php' method='post' enctype='multipart/form-data'>"+
                    "<input type='text' name='key' value='"+bpckey+"'>"+
                    "<textarea name='file' id='captchafile'>"+captcha+"</textarea>"+
                    "<input type='text' name='gen_task_id' value='1'>"+
                    "<input type='text' name='base64_code' value='1'>"+
                    "<input type='text' name='vendor_key'>"+
                    "<input type='submit' value='Submit'>"+
                    "</form></body></html>";
                page.injectJs(jq);
                page.onConsoleMessage = logger.log;
                setTimeout(function(){
                    timeout=true;
                    callback(new Error("captcha_timeout"));
                },conf.captchatimeout);
                page.onLoadFinished = function(){
                    urlchanges++;
                    page.injectJs(jq);
                    var hasform = page.evaluate(function(){
                        return $("form#uploadform").size();
                    });
                    if(hasform){
                        if(urlchanges <= 2)
                            return;
                        else
                            callback(new Error("error submitting captcha form"));
                    }
                    logger.log("captcha_decode_step:url="+page.url);
                    var content = page.evaluate(function(){
                        return $("body").text();
                    });
                    var lines = content.split("\n");
                    var  res = {};
                    lines.forEach(function(l){
                        var m = l.match(/([A-z]+) (.*)/);
                        if(m){
                            res[m[1].toLowerCase()] = m[2];
                        }
                    });
                    if(res.error) callback(new Error(res.error));
                    else if(!res.value) callback(new Error("No value in captcha response."));
                    else callback(null,res.value);
                };
                page.evaluate(function(){
                    $("form").submit();
                });
            },
        report: function(filename){

        },
        remove: function(filename){
            fs.remove(filename);
        }
    }
};

module.exports = captchaApis;