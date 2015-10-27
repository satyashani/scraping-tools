/* * ************************************************************ 
 * Date: 26 Oct, 2015
 * programmer: Shani Mahadeva <satyashani@gmail.com>
 * Javascript file directupload.js
 * *************************************************************** */

var dbclient = new Dropbox.Client({ key: dbApiConf.auth.key });

Dropbox.AuthDriver.Popup.oauthReceiver();
var authclient = null;

var uploadHandler = function(url){
    this.url = url;
    this.div = $("<div><span class='filename'></span><span class='status'></span></div>");
    this.job = null;
    this.interval = 0;
    $("#files").append(this.div);
    this.status = this.div.find(".status").eq(0);
    this.filespan = this.div.find(".filename").eq(0);
    this.upload();
};

uploadHandler.prototype.upload = function(){
//    var u = this.url;
    var u = 'https://dl.dropboxusercontent.com/1/view/4xo2ctkjomzljuh/Apps/twaptest/004.jpg';
    var url = $.url(u);
    var me = this;
    me.filespan.text(url.attr("file"));
    $.ajax({
        url: "https://api.dropbox.com/1/save_url/auto/username/"+url.attr("file"),
        method: "POST",
        data: {
            url : u
        },
        headers: {
            "Authorization" : "Bearer "+dbApiConf.auth.token
        },
        success: function(data){
            var d = typeof data === 'string' ? JSON.parse(data) : data;
            me.status.text("Upload requested, status : "+d.status);
            me.job = d.job;
            me.track();
        },
        error: function(s,t,r){
            me.status.text("Failed to start upload");
        }
    });
};

uploadHandler.prototype.track = function(){
    var me = this;
    var update = function(){
        $.ajax({
            url: "https://api.dropbox.com/1/save_url_job/"+me.job,
            method: "GET",
            headers: {
                "Authorization" : "Bearer "+dbApiConf.auth.token
            },
            success: function(data){
                console.log(data);
                var d = typeof data === 'string' ? JSON.parse(data) : data;
                console.log(d);
                me.status.text("Status : "+d.status);
                if(d.status === "FAILED")
                    me.status.text("Status : "+d.status+", Error : "+d.error);
                else if(d.status === 'PENDING' || d.status === 'DOWNLOADING'){
                    setTimeout(update,2000);
                }
            },
            error: function(x,t,r){
                if(x.status === 200 && x.responseText){
                    var d = JSON.parse(x.responseText);
                    me.status.text("Status : "+d.status);
                    if(d.status === "FAILED")
                        me.status.text("Status : "+d.status+", Error : "+d.error);
                    else if(d.status === 'PENDING' || d.status === 'DOWNLOADING'){
                        setTimeout(update,2000);
                    }
                }else{
                    me.status.text(t+", Error : "+r);
                    console.log("Tracker error:",x,t,r);
                }
            }
        });
    };
    setTimeout(update,2000);
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
        receiverUrl: "http://localhost/dmcaserver/dropboxLoader/loggedin.html"
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