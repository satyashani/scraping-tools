/**
 * Created by Shani(satyashani@gmail.com) on 22/11/14.
 */

var types = ['image/jpeg','application/pdf','audio/mpeg','video/mpeg'];
var chunkSize = 1024*1024;
var dbclient = new Dropbox.Client({ key: 'lycuobyql232wwf' ,token: "vwsVrfBEX7AAAAAAAAAAB0G3FyKl8oE_fkc1lXSg93sRV64c_Q8gr9ZjRSdeLAlX"});
var folder = $.url().param('foldername');
if(!folder) console.error("bad dropbox folder name",folder);


var xhrListener = function(dbXhr) {
    dbXhr.xhr.upload.addEventListener("progress", function(event) {

    });
    return true;  // otherwise, the XMLHttpRequest is canceled
};
dbclient.onXhr.addListener(xhrListener);



function showError(err){
    $("div#error").text(err).hide().stop().fadeIn('fast');
    setTimeout(function(){ $("div#error").fadeOut('fast') },5000);
}

var States = {init: 0,running: 1, error: 2,paused: 3,canceled: 4, complete: 5};
var StateClass = [
    "glyphicon glyphicon-play",
    "glyphicon glyphicon-transfer",
    "glyphicon glyphicon-warning-sign",
    "glyphicon glyphicon-pause",
    "glyphicon glyphicon-stop",
    "glyphicon glyphicon-ok"

];
var StateTitle = [
    "Start Upload",
    "Uploading",
    "Upload failed",
    "Upload paused",
    "Upload cancalled",
    "Uploaded"
];
var Uploader = function(file){
    this.file = file;
    this.chunk = chunkSize;
    this.makeDiv();
    this.state = States.init;
    this.lastCursor = null;
    this.reader = new FileReader();
};

Uploader.prototype.setState = function(state,message){
    this.state = state;
    if(state === States.complete || state === States.error || state === States.canceled) {
        this.div.find("div#buttons a").slideUp('fast');
    }
    this.div.find("div.status span").attr({"title":StateTitle[state]});
    for(var i=0;i<StateClass.length;i++){
        this.div.find("div.status span").removeClass(StateClass[i]);
    }
    this.div.find("div.status span").attr({"title":StateTitle[state]+(message?message:"")});
    this.div.find("div.status span").addClass(StateClass[state]);
};

Uploader.prototype.makeDiv = function(){
    var div = $("div#filediv").clone();
    div.removeAttr("id");
    div.find('div.filename').text(this.file.name);
    $("div#files").append(div);
    div.fadeIn();
    div.find("a#upload").click(this.uploadClick.bind(this));
    div.find("a#pause").click(this.pauseClick.bind(this));
    div.find("a#cancel").click(this.cancelClick.bind(this));
    this.div = div;
};


Uploader.prototype.setPercent = function(p){
    var timediff = new Date().getTime() - this.time;
    this.time = new Date().getTime();
    console.log("progressing to ",p,"% in time ",timediff);
    var percent = p.toFixed(2)+"%";
    this.div.find("div.progress-bar").stop().animate({"width": percent},timediff)
    this.div.find("div.progress-bar span").text(percent);
};

Uploader.prototype.uploadClick = function(e){
    e.preventDefault();
    this.div.find("a#upload").hide();
    this.div.find("a#pause").show();
    this.div.find("a#cancel").show();
    this.div.find("div.progress").fadeIn('fast');
    this.startResumableUpload();
};

Uploader.prototype.pauseClick = function(e){
    e.preventDefault();
    if(this.state == States.canceled || this.state == States.error) return;
    if(this.state == States.paused){
        this.div.find("a#pause").text("Pause");
        this.setState(States.running);
        this.step(null,this.lastCursor);
    }else if(this.state == States.running){
        this.div.find("a#pause").text("Resume");
        this.setState(States.paused);
    }
};

Uploader.prototype.cancelClick = function(e){
    e.preventDefault();
    this.setState(States.canceled);
};

Uploader.prototype.onComplete = function(){
    var my = this;
    dbclient.resumableUploadFinish(folder + '/' + this.file.name, this.lastCursor, function (err, stat) {
        if (err) my.setState(States.error,err);
        else my.setState(States.complete);
    });
};

Uploader.prototype.step = function(err,cursor){
    var my = this;
    if (!err && cursor) {
        this.lastCursor = cursor;
        if (cursor.offset && cursor.offset >= this.file.size) {
            this.onComplete();
        }
        else {
            if(this.state === States.paused || this.state === States.canceled) return;
            this.setState(States.running);
            var end = Math.min(my.file.size, cursor.offset + this.chunk);
            this.reader.readAsArrayBuffer(my.file.slice(cursor.offset, end));
        }
    } else this.setState(States.error,err);
};

Uploader.prototype.startResumableUpload = function() {
    var my = this;
    this.time = new Date().getTime();
    var end = Math.min(this.file.size, this.chunk);
    this.reader.onloadend = function () {
        var xhr = dbclient.resumableUploadStep(my.reader.result, my.lastCursor, my.step.bind(my));
        xhr.upload.onprogress = function(e){
            var l = my.lastCursor ? my.lastCursor.offset : 0;
            var p = ((l + e.loaded)/my.file.size)*100;
            my.setPercent(p);
        };
    }
    this.reader.readAsArrayBuffer(this.file.slice(0, end));
};

Uploader.prototype.constructor = Uploader;

function addUpload(){
    if(dbclient && dbclient.isAuthenticated()){
        for(var i=0;i<this.files.length;i++){
            if(types.indexOf(this.files[i].type) > -1)
                new Uploader(this.files[i]);
            else showError("Mime type "+this.files[i].type+" of file "+this.files[i].name+" not allowed!!");
        }
    }else console.log("Auth error");
}

$(document).ready(function(){
    if(folder){
        $("input#dbupload").change(addUpload);
        $("a#addUpload").click(function(e){
            e.preventDefault();
            $("input#dbupload").click();
        });
    }
});