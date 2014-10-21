/**
 * Created by Shani (satyashani@gmail.com) on 2/10/14.
 */

var pg = require("webpage");
var logger = require("./logger");
var jq = "jquery-1.10.1.min.js";
var countries = require("./countries.json");
var cities = require("./cities.json");
var mainconf = require("./conf.json");

var worker = function(config){
    this.username = config.username;
    this.loggedin = false;
    var page = pg.create(); this.relogin = false;
    var that = this;
    page.onConsoleMessage =  function(){
        var args = ["pageMessage:"].concat(Array.prototype.slice.call(arguments));
        logger.log.apply(logger,args);
    };
    page.onError = function(err,trace){ logger.log("pageError:",err.message)};

    this.search = function(term,type,callback){
        var url = "http://vk.com/search?c[q]="+term+"&c[section]="+type;
        console.log("type="+type,"url=",url);
        page.open(url,function(stat){
            if(stat !== "success") return callback(new Error("error_opening_page:http://vk.com/search"),null);
            logger.log("search page loaded");
            page.injectJs(jq);
            if(type==='audio'){
                page.onCallback = function(){
                    var res = page.evaluate(function(){
                        var items = $("td#results div.audio"),res = [];
                        items.each(function(){
                            var o = {
                                audioUrl: $(this).find('input').eq(0).val(),
                                searchLink: $(this).find('b a').attr("href"),
                                searchTitle: $(this).find("b").text(),
                                title: $(this).find('span.title').text(),
                                userLink: $(this).find('span.user a').attr("href")
                            };
                            res.push(o);
                        });
                        return res;
                    });
                    callback(null,res);
                };
                page.evaluate(function(){
                    var items = $("td#results div.audio"),size = 0;
                    var scroll = function(){
                        window.scrollTo(0,$("body").height());
                        setTimeout(function(){
                            items = $("td#results div.audio");
                            if(size<items.size()) {
                                size = items.size();
                                scroll();
                            }
                            else window.callPhantom();
                        },5000)
                    }
                    scroll();
                });
            }
            else if(type==='video'){
                page.onCallback = function(){
                    var res = page.evaluate(function(){
                        var items = $("div#results div.search_video_row_cont"),res = [];
                        console.log("finally items:",items.size());
                        items.each(function(){
                            var o = {
                                videoUrl: "http://vk.com"+$(this).find('a.search_video_row_relative').attr("href"),
                                title: $(this).find('div.search_video_raw_info_name').text(),
                                duration :$(this).find("div.search_video_row_duration").text()
                            };
                            res.push(o);
                        });
                        return res;
                    });
                    callback(null,res);
                };
                page.evaluate(function(){
                    var items = $("div#results div.search_video_row_cont"),size = 0;
                    console.log("items:",items.size());
                    var scroll = function(){
                        window.scrollTo(0,$("body").height());
                        setTimeout(function(){
                            console.log("after scroll items:",items.size());
                            items = $("td#results div.search_video_row_cont");
                            if(size<items.size()) {
                                size = items.size();
                                scroll();
                            }
                            else window.callPhantom();
                        },5000)
                    }
                    scroll();
                });
            }
            else{
                callback(new Error("unknown_type:"+type));
            }
        });
    }

    this.login = function(callback){
        this.loggedin = false;
        var that = this;
        page.clearCookies();
        logger.log("Login request for "+config.username);
        var calledback = false;
        var caller = function(err,res){
            if(calledback) return;
            calledback = true;
            callback(err,res);
        };
        setTimeout(function(){
            caller(new Error("login_timeout"));
        },mainconf.timeout);
        var postbody = "email="+config.username+"&pass="+config.password;
        page.open("http://vk.com",function(stat){
            if(stat !== "success"){
                caller(new Error("error_opening_page:vk.com"),null);
            }else{
                page.onUrlChanged = function(url){
                    page.onUrlChanged = null;
                    if(url.match(/vk\.com\/id[0-9]+/)){
                        that.loggedin = true;
                        caller(null,true);
                    }else{
                        page.render("afterlogin.png");
                        logger.log("login_failed:url=",url);
                        caller(new Error("login_failed"));
                    }
                };
                page.injectJs(jq);
                page.evaluate(function(conf){
                    $("input#quick_email").val(conf.username);
                    $("input#quick_pass").val(conf.password);
                    $("button#quick_login_button").click();
                },config);
            }
        });
    }

    this.getCurrentLoggedIn = function(callback){
        page.open("https://vk.com",function(opened){
            if(opened !== "success")
                return callback(new Error("error_opening_page"),null);
            page.injectJs(jq);
            callback(null,page.evaluate(function(){
                var id = $("a#myprofile").attr("href").replace("/","")
                return {id: id, name : $("div#profile_info div.page_name").eq(0).text()};
            }));
        });
    }

    this.submitDmca = function(formdata,callback) {
        var fields = [
            {id: "tickets_text", required: true, type: "textarea", value: ""},
            {id: "tickets_links", required: true, type: "textarea", value: ""},
            {id: "person", required: true, type: 'radiobtn', value: "legal"},
            {id: "tickets_dmca_name", type: "input", required: false, value: ""},
            {id: "tickets_dmca_email", type: "input", required: true, value: ""},
            {id: "tickets_dmca_region", type: "input", required: false, value: ""},
            {id: "tickets_dmca_address", type: "input", required: true, value: ""},
            {id: "tickets_dmca_corp", type: "input", required: false, value: ""},
            {id: "tickets_dmca_repr", type: "input", required: false, value: ""},
            {id: "tickets_dmca_post", type: "input", required: false, value: ""},
            {id: "tickets_dmca_country_wrap", type: "select", required: true, value: 1},
            {id: "tickets_dmca_city_wrap", type: "select", required: true, value: 1},
            {id: "support_dmca_agree_owner", type: "checkbox", required: false, value: false},
            {id: "support_dmca_agree_unauthorized", type: "checkbox", required: false, value: false},
            {id: "support_dmca_agree_perjury", type: "checkbox", required: false, value: false},
            {id: "support_dmca_agree_email", type: "checkbox", required: false, value: false},
            {id: "support_dmca_agree_inform", type: "checkbox", required: false, value: false},
            {id: "support_dmca_agree_rules", type: "checkbox", required: false, value: true},
            {id: "support_dmca_agree_owner_legal", type: "checkbox", required: false, value: true},
            {id: "support_dmca_agree_unauthorized_legal", type: "checkbox", required: false, value: true},
            {id: "support_dmca_agree_perjury_legal", type: "checkbox", required: false, value: true},
            {id: "support_dmca_agree_email_legal", type: "checkbox", required: false, value: true},
            {id: "support_dmca_agree_inform_legal", type: "checkbox", required: false, value: true}
        ];
        for (var i = 0; i < fields.length; i++) {
            if (formdata.hasOwnProperty(fields[i].id)) fields[i].value = formdata[fields[i].id];
            else if (fields[i].required) return callback(new Error("missing_required_field:" + fields[i].id));
            if (fields[i].id === 'tickets_dmca_city_wrap') {
                for (var j = 0; j < cities.length; j++)
                    if (cities[j].name === formdata.tickets_dmca_city_wrap) {
                        fields[i].value = cities[j].value;
                        break;
                    }
            }
            if (fields[i].id === 'tickets_dmca_country_wrap') {
                for (var j = 0; j < countries.length; j++)
                    if (countries[j].name === formdata.tickets_dmca_country_wrap) {
                        fields[i].value = countries[j].value;
                        break;
                    }
            }
        }
        var calledback = false;
        var caller = function(err,res){
            if(calledback) return;
            calledback = true;
            callback(err,res);
        };
        page.open("https://vk.com/support?act=new_dmca",function(stat){
            if(stat !== "success") return caller(new Error("error_opening_page"),null);
            setTimeout(function(){
                page.render("dmcatimeout.png");
                page.onUrlChanged = null;
                caller(new Error("submit_timeout"));
            },30000);
            logger.log("dmca page opened");
            page.injectJs(jq);
            page.onUrlChanged = function (url) {
                logger.log("submitDmca:submitUrl =", url);
                var m = url.match(/act=show&id=([0-9]+)/);
                if (m){
                    page.onUrlChanged = null;
                    caller(null, {ok: true, qid: m[1]});
                }
            };
            page.evaluate(function (data) {
                data.forEach(function (d) {
                    if (d.type === 'input' || d.type === 'textarea') $(d.type + "#" + d.id).val(d.value);
                    else if (d.type === 'checkbox' && d.value === true) $("div#" + d.id + ".checkbox").click();
                    else if (d.type === 'radiobtn') $("div.radiobtn").eq(d.value === 'legal' ? 1 : 0).click();
                    else if (d.type === 'select') $("div#" + d.id + " input#selectedItems").val(d.value);
                });
                $("button#tickets_send").click();
            }, fields);
        });
    };

    this.getTicketStatus = function(ticketid,callback){
        page.open("http://vk.com/support",function(stat){
            if(stat !== "success") return caller(new Error("error_opening_page"),null);
            page.injectJs(jq);
            var res = page.evaluate(function(t){
                var list = $("div#tickets_list div.tu_row");
                for(var i=0;i<list.size();i++){
                    var url = list.eq(i).find("a.tu_last").attr("href");
                    if(url && url.indexOf(t)>-1){
                        var text = list.eq(i).find("div.tu_row_comment").text();
                        console.log("status:",text);
                        var status = text && text.indexOf("pending")>-1?"pending":(text.indexOf("has an answer")>-1?"answered":"unknown");
                        return {ok:true,status: status};
                    }
                }
                return {ok: false, status: 'not_found'};
            },ticketid);
            callback(null, res);
        })
    };
}

module.exports = worker;