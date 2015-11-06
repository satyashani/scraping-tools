/* * ************************************************************ 
 * Date: 26 Oct, 2015
 * programmer: Shani Mahadeva <satyashani@gmail.com>
 * Javascript file directupload.js
 * *************************************************************** */

var dbclient = new Dropbox.Client({ key: dbApiConf.auth.key });

Dropbox.AuthDriver.Popup.oauthReceiver();
var authclient = null;

var States = {failed: 0,added: 1, error: 2,downloading: 3,downloaded: 4, complete: 5};
var StateClass = [
    "glyphicon glyphicon-warning-sign",
    "glyphicon glyphicon-transfer",
    "glyphicon glyphicon-warning-sign",
    "glyphicon glyphicon-transfer",
    "glyphicon glyphicon-transfer",
    "glyphicon glyphicon-ok"

];
var StateTitle = [
    "Upload request failed",
    "File upload requested",
    "Error",
    "File transfer in progress",
    "File transfer complete",
    "File uploaded"
];

var uploadHandler = function(url){
    this.url = url;
    this.filename = $.url(url).attr("file");
    this.job = null;
    this.interval = 0;
    this.makeDiv();
};

uploadHandler.prototype.upload = function(){
    var u = this.url;
    var me = this;
    $.ajax({
        url: "./uploader/upload",
        method: "POST",
        data: {
            url : u,
            filename: me.filename
        },
        success: function(data){
            var d = typeof data === 'string' ? JSON.parse(data) : data;
            me.setState(States[d.status],d.message);
            if(d.job) me.job = d.job;
            if(d.ok && d.job && d.status !== 'error'){
                me.track();
            }
        },
        error: function(s,t,r){
            me.setState(States.failed);
        }
    });
};

uploadHandler.prototype.setState = function(state,message){
    this.state = state;
//    if(state === States.complete || state === States.error || state === States.canceled) {
//        this.div.find("div#buttons a").slideUp('fast');
//    }
    if(state === States.failed || state === States.error|| state === States.complete){
        this.div.find("a#cancel").show();
    }
    this.div.find("div.status span").attr({"title":StateTitle[state]});
    for(var i=0;i<StateClass.length;i++){
        this.div.find("div.status span").removeClass(StateClass[i]);
    }
    this.div.find("div.message").text(message || StateTitle[state]);
    this.div.find("div.status span").attr({"title": (message || StateTitle[state])});
    this.div.find("div.status span").addClass(StateClass[state]);
};

uploadHandler.prototype.makeDiv = function(){
    var div = $("div#filediv").clone();
    div.removeAttr("id");
    this.status = div.find(".status").eq(0);
    div.find(".filename").eq(0).text(this.filename);
    $("div#files").append(div);
    div.fadeIn();
    div.find("a#upload").click(this.uploadClick.bind(this));
//    div.find("a#pause").click(this.pauseClick.bind(this));
    div.find("a#cancel").click(this.cancelClick.bind(this));
    this.div = div;
    div.find("a#upload").click();
};

uploadHandler.prototype.uploadClick = function(e){
    e.preventDefault();
    this.div.find("a#upload").hide();
//    this.div.find("a#pause").show();
//    this.div.find("a#cancel").show();
    this.upload();
};

uploadHandler.prototype.cancelClick = function(){
    var me = this;
    if(me.job){
        $.ajax({
            url: "./uploader/"+this.job+"/cancel",
            method: "GET",
            complete: function(data){
                me.div.slideUp();
            }
        });
    }else{
        me.div.slideUp();
    }
};

uploadHandler.prototype.track = function(){
    var me = this;
    var update = function(){
        $.ajax({
            url: './uploader/'+me.job+"/status",
            method: "GET",
            success: function(data){
                var d = typeof data === 'string' ? JSON.parse(data) : data;
                me.setState(States[d.status],d.message);
                if(!d.status.match(/error|complete/))
                    setTimeout(update,2000);
            },
            error: function(x,t,r){
                if(x.status === 200 && x.responseText){
                    var d = JSON.parse(x.responseText);
                    me.setState(States[d.status],d.message);
                    if(!d.status.match(/error|complete/))
                        setTimeout(update,2000);
                }else{
                    me.setState(States.error,t+":"+r);
                }
            }
        });
    };
    setTimeout(update,5000);
};

$(document).ready(function(){
    var button = Dropbox.createChooseButton({
        success: function(files){
            if(!dbclient.isAuthenticated() || !authclient)
                return console.log("App is not authenticated");
            files.forEach(function(f){
                new uploadHandler(f.link);
            });
        },
        multiselect: true,
        linkType: "direct"
    });
    $("#chooser").append(button);
    $("#logout").click(function(){
        dbclient.signOut();
    });
    
    dbclient.authDriver(new Dropbox.AuthDriver.Popup({
        receiverUrl: dbApiConf.redirecturl
    }));

    if(!dbclient.isAuthenticated()){
        dbclient.authenticate(function(error, client) {
            if (!error) authclient = client;
            else console.log(error);
        });
    }else{
        console.log("user logged in");
    }
});