/**
 * Created by Shani(satyashani@gmail.com) on 22/11/14.
 */

var types = ['image/jpeg','application/pdf','audio/mpeg','video/mpeg'];
var dbclient = new Dropbox.Client({ key: 'lycuobyql232wwf' ,token: "vwsVrfBEX7AAAAAAAAAAB0G3FyKl8oE_fkc1lXSg93sRV64c_Q8gr9ZjRSdeLAlX"});
var folder = $.url().param('foldername');
if(!folder) console.error("bad dropbox folder name",folder);

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
    this.makeDiv();
    this.state = States.init;
    this.lastCursor = null;
}

Uploader.prototype.setState = function(state,message){
    this.state = state;
    if(state === States.complete) {
        this.setPercent(100);
    }
    this.div.find("div.status span").attr({"title":StateTitle[state]})
    for(var i=0;i<StateClass.length;i++){
        this.div.find("div.status span").removeClass(StateClass[i]);
    }
    this.div.find("div.status span").attr({"title":StateTitle[state]+(message?message:"")})
    this.div.find("div.status span").addClass(StateClass[state]);
}

Uploader.prototype.makeDiv = function(){
    var div = $("div#filediv").clone();
    div.find('div.filename').text(this.file.name);
    $("div#files").append(div);
    div.fadeIn();
    div.find("a#upload").click(this.uploadClick.bind(this));
    this.div = div;
}


Uploader.prototype.setPercent = function(p){
    var timediff = new Date().getTime() - this.time;
    this.time = new Date().getTime();
    console.log("progressing to ",p,"% in time ",timediff);
    var percent = p+"%";
    this.div.find("div.progress-bar").stop().animate({"width": percent},timediff).find("span").text(percent);
}

Uploader.prototype.uploadClick = function(e){
    e.preventDefault();
    this.div.find("a#upload").hide();
    this.div.find("a#pause").show();
    this.div.find("a#cancel").show();
    this.div.find("div.progress").fadeIn('fast');
    this.startResumableUpload();
}

Uploader.prototype.pauseClick = function(e){
    e.preventDefault();
    if(this.state == States.paused){

    }else if(this.state == States.running){
        this.setState(States.paused);
    }
}

Uploader.prototype.startResumableUpload = function() {
    var my = this;
    var f = my.file;
    var reader = new FileReader(), lastGoodCursor = null;
    var chunk = 102400;
    this.time = new Date().getTime();
    var onComplete = function (cursor) {
        dbclient.resumableUploadFinish(folder + '/' + f.name, cursor, function (err, stat) {
            if (err) {
                console.log("Failed to finish upload.");
                onFail(err);
            } else {
                my.setState(States.complete);
            }
        });
    }
    var onFail = function (err) {
        my.setState(States.error,err);
    }
    var onStep = function (err, cursor) {
        if (!err && cursor) {
            my.lastCursor = cursor;
            if (cursor.offset && cursor.offset >= f.size) {
                onComplete(cursor);
            }
            else {
                my.setState(States.running);
                var p = (cursor.offset / f.size) * 100;
                my.setPercent(p);
                var end = Math.min(f.size, cursor.offset + chunk);
                reader.onloadend = function () {
                    dbclient.resumableUploadStep(reader.result, cursor, onStep);
                }
                reader.readAsArrayBuffer(f.slice(cursor.offset, end));
            }
        } else onFail(err);
    }
    var end = Math.min(f.size, chunk);
    reader.onloadend = function () {
        dbclient.resumableUploadStep(reader.result, null, onStep);
    }
    reader.readAsArrayBuffer(f.slice(0, end));
}

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
        $("input#dbupload").on("change",addUpload);
        $("a#addUpload").click(function(e){
            e.preventDefault();
            $("input#dbupload").click();
        });
    }
});