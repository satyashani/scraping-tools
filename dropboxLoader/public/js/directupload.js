/* * ************************************************************ 
 * Date: 26 Oct, 2015
 * programmer: Shani Mahadeva <satyashani@gmail.com>
 * Javascript file directupload.js
 * *************************************************************** */

//Enable below line for testing the tool by setting uid cookie
//document.cookie = 'uid={"ct":"olWq6s5bkzkhIfWW25V1bg==","iv":"25cc6f1375b6e137bb93acb4157aa640","s":"48bd12a541928e75"}';
var dbclient = new Dropbox.Client({ key: dbApiConf.auth.key });

Dropbox.AuthDriver.Popup.oauthReceiver();
var authclient = null;

var States = {
    failed: 0,pending: 1,added: 2, error: 3,downloading: 4,downloaded: 5, complete: 6,
    Code: ['failed','pending','added','error','downloading','downloaded','complete'],
    Class : [
        "glyphicon glyphicon-warning-sign",
        "glyphicon glyphicon-transfer",
        "glyphicon glyphicon-transfer",
        "glyphicon glyphicon-warning-sign",
        "glyphicon glyphicon-transfer",
        "glyphicon glyphicon-transfer",
        "glyphicon glyphicon-ok"

    ],
    Title: [
        "Upload request failed",
        "Waiting to start transfer",
        "File upload requested",
        "Error",
        "File transfer in progress",
        "File transfer complete",
        "File uploaded"
    ]
};

var uploadHandler = function(info,opts){
    this.url = info.link;
    this.filename = info.name;
    this.bytes = info.bytes;
    this.job = null;
    this.interval = 0;
    this.autoStart = opts && opts.hasOwnProperty('autostart') ? !!opts.autostart : true;
    this.onStateChange = opts && opts.onStateChange && typeof opts.onStateChange === 'function' ? opts.onStateChange : null;
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
            filename: me.filename,
            bytes: me.bytes
        },
        success: function(data){
            var d = typeof data === 'string' ? JSON.parse(data) : data;
            if(d.job) me.job = d.job;
            me.setState(States[d.status],d.message);
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
    if(this.onStateChange) this.onStateChange({state : States.Code[state], message : message || States.Title[state] })
//    if(state === States.complete || state === States.error || state === States.canceled) {
//        this.div.find("div#buttons a").slideUp('fast');
//    }
    if(state === States.failed || state === States.error|| state === States.complete){
        this.div.find("a#cancel").show();
    }
    this.div.find("div.status span").attr({"title":States.Title[state]});
    for(var i=0;i<States.Class.length;i++){
        this.div.find("div.status span").removeClass(States.Class[i]);
    }
    this.div.find("div.message").text(message || States.Title[state]);
    this.div.find("div.status span").attr({"title": (message || States.Title[state])});
    this.div.find("div.status span").addClass(States.Class[state]);
};

uploadHandler.prototype.makeDiv = function(){
    var div = $("div#filediv").clone();
    div.removeAttr("id");
    this.status = div.find(".status").eq(0);
    div.find(".filename").eq(0).text(this.filename);
    div.find(".size").eq(0).text((this.bytes/1048576).toFixed(2)+"MB");
    $("div#files").append(div);
    div.fadeIn();
    div.find("a#upload").click(this.uploadClick.bind(this));
//    div.find("a#pause").click(this.pauseClick.bind(this));
    div.find("a#cancel").click(this.cancelClick.bind(this));
    this.div = div;
    if(this.autoStart) div.find("a#upload").click();
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
    // Commented code was meant to be used for dierct upload to dropbox, 
    // which can be used later if dropbox api starts working.
    $("#chooser").click(function(e){
        e.preventDefault();
        Dropbox.choose({
            success: function(files){
//                if(!dbclient.isAuthenticated() || !authclient)
//                    return console.log("App is not authenticated");
                files.forEach(function(f){
                    var uj = new uploadHandler(f,{
                        onStateChange : function(state){
                            console.log(state,uj.job);
                        }
                    });
                    
                });
            },
            multiselect: true,
            linkType: "direct",
            extensions: dbApiConf.chooserExt && dbApiConf.chooserExt.length ? dbApiConf.chooserExt : ['.mp3', '.flac', '.aiff', '.wav', '.aif']
        });
    });
//    $("#logout").click(function(){
//        dbclient.signOut();
//    });
//    
//    dbclient.authDriver(new Dropbox.AuthDriver.Popup({
//        receiverUrl: dbApiConf.redirecturl
//    }));
//
//    if(!dbclient.isAuthenticated()){
//        dbclient.authenticate(function(error, client) {
//            if (!error) authclient = client;
//            else console.log(error);
//        });
//    }else{
//        console.log("user logged in");
//    }
});