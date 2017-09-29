/**
 * Created by Shani (satyashani@gmail.com) on 2/10/14.
 */

var pg = require("webpage");
var logger = require("./logger");
var fs = require("fs");
var jq = "jquery-1.10.1.min.js";
var countries = require("./countries.json");
var cities = require("./cities.json");
var mainconf = require("./conf.json");

var worker = function(config){
    this.username = config.username;
    this.loggedin = false;
    var page = pg.create(); this.relogin = false;
    page.settings.userAgent = "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:32.0) Gecko/20100101 Firefox/32.0";
    page.settings.loadImages = false;
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
                        var items = $("div#results div.audio_info,div.search_results div.audio_info"),res = [];
                        items.each(function(){
                            var o = {
                                audioUrl: $(this).find('a.audio_performer').attr("href"),
                                searchLink: $(this).find('a.audio_performer').attr("href"),
                                searchTitle: $(this).find("a.audio_performer").text(),
                                title: $(this).find('span.audio_title span.audio_title_inner').text(),
                                userLink: $(this).find('span.audio_author a').attr("href")
                            };
                            res.push(o);
                        });
                        return res;
                    });
                    callback(null,res);
                };
                page.evaluate(function(){
                    var items = $("div#results div.audio_info,div.search_results div.audio_info"),size = 0;
                    var scroll = function(){
                        window.scrollTo(0,$("body").height());
                        setTimeout(function(){
                            items = $("div#results div.audio_info,div.search_results div.audio_info");
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
                        var items = $("div#results div.video_item"),res = [];
                        console.log("finally items:",items.size());
                        items.each(function(){
                            var o = {
                                videoUrl: "http://vk.com"+$(this).find('div.video_item_info a.video_item_title').attr("href"),
                                title: $(this).find('div.video_item_info a.video_item_title').text(),
                                views :$(this).find("div.video_item_add_info span.video_item_views").text(),
                                duration :$(this).find("div.video_item_thumb div.video_thumb_duration").text()
                            };
                            res.push(o);
                        });
                        return res;
                    });
                    callback(null,res);
                };
                page.evaluate(function(){
                    var items = $("div#results div.video_item"),size = 0;
                    console.log("items:",items.size());
                    var scroll = function(){
                        window.scrollTo(0,$("body").height());
                        setTimeout(function(){
                            console.log("after scroll items:",items.size());
                            items = $("div#results div.video_item");
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
            if(err) page.render("login_error.png");
            callback(err,res);
        };
        setTimeout(function(){
            caller(new Error("login_timeout"));
        },mainconf.timeout);
        var postbody = "email="+config.username+"&pass="+config.password;
        var starttime = new Date().getTime();
        page.open("http://vk.com",function(stat){
            if(stat !== "success"){
                caller(new Error("error_opening_page:vk.com"),null);
            }else{
                logger.log("Login page opened in",(new Date().getTime() - starttime)/1000,'seconds');
                page.onUrlChanged = function(url){
                    page.onUrlChanged = null;
                    if(url.match(/vk\.com\/([A-za-z]+|id[0-9-]+)$/)){
                        that.loggedin = true;
                        logger.log("Logged-in in ",(new Date().getTime()-starttime)/1000,' seconds');
                        caller(null,true);
                    }else{
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
            {id: "tickets_dmca_real_address", type: "input", required: true, value: ""},
            {id: "tickets_dmca_phone", type: "input", required: true, value: ""},
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
            {id: "support_dmca_agree_inform_legal", type: "checkbox", required: false, value: true},
            {id: "files", type: "file", required: false, value: []}
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
//            if(fields[fields.length-1].id==='files' && fields[fields.length-1].value.length){
//                fields[fields.length-1].value.forEach(function(f){
//                    page.onFilePicker = function(){
//                        console.log("filepicker opened, returning ",f);
//                        return f;
//                    }
//                    page.evaluate(function(){
//                        $("span.add_media_lnk").trigger("click");
//                        $("a.add_media_type_1_doc nobr").trigger("click");
//                        setTimeout(function(){
//                           if($("input#tickets_doc_inputnew").size())
//                               $("input#tickets_doc_inputnew").trigger("click");
//                           else if($("input[type='file']").size())
//                               $("input[type='file']").trigger("click");
//                           else console.log("No file input button found");
//                        },100);
//                    });
//                });
//            }
//            page.onUrlChanged = null;
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
        page.open("http://vk.com/support?act=show&id="+ticketid,function(stat){
            if(stat !== "success") return callback(new Error("error_opening_page"),null);
            page.injectJs(jq);
            var res = page.evaluate(function(t){
                var list = $("div.tickets_reply_text");
                if(!list.size()) return {ok: true, status: "unknown_ticket_id"}
                else if(list.size()==1) return {ok: true, status: "pending"}
                else{
                    if(list.eq(1).text().indexOf("removed")>-1)
                        return {ok: true, status: "removed"}
                    else if(list.eq(1).text().indexOf("declined")>-1)
                        return {ok: true, status: "rejected"}
                    else
                        return {ok: true, status: "answered"}
                }
            },ticketid);
            callback(null, res);
        })
    };

    this.cleanup = function(callback){
        page.close();
        this.login(callback);
    }
}

module.exports = worker;