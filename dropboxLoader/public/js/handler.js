/**
 * Created by Shani(satyashani@gmail.com) on 22/11/14.
 */


var dbclient = new Dropbox.Client({ key: 'lycuobyql232wwf' ,token: "vwsVrfBEX7AAAAAAAAAAB0G3FyKl8oE_fkc1lXSg93sRV64c_Q8gr9ZjRSdeLAlX"});
var folder = $.url().param('foldername');
if(!folder) console.error("bad dropbox folder name",folder);
function upload(){
    if(dbclient && dbclient.isAuthenticated()){
        for(var i=0;i<this.files.length;i++){
            makeFileDiv(this.files[i]);
        }
    }else console.log("Auth error");
}

function resumeMethod(f,div){
    var reader = new FileReader(),lastGoodCursor = null,time = new Date().getTime();
    var chunk = 102400;
    var onComplete = function(cursor){
        dbclient.resumableUploadFinish(folder+'/'+f.name,cursor,function(err,stat){
            if(err) {
                console.log("Failed to finish upload.");
                onFail();
            }else {
                setPercent(100);
                div.find("p.status").text("Complete");
            }
        });
    }
    var onFail = function(err){
        div.find("p.status").text("Failed to upload");
    }
    var setPercent = function(p){
        var timediff = new Date().getTime() - time;
        time = new Date().getTime();
        console.log("progressing to ",p,"% in time ",timediff);
        var percent = p+"%";
        div.find("div.progress-bar").stop().animate({"width": percent},timediff).find("span").text(percent);
    }
    var onStep = function(err,cursor){
        if(!err && cursor){
            lastGoodCursor = cursor;
            if(cursor.offset && cursor.offset >= f.size){
                onComplete(cursor);
            }
            else{
                var p = (cursor.offset/f.size)*100;
                setPercent(p);
                var end = Math.min(f.size,cursor.offset+chunk);
                reader.onloadend = function(){
                    dbclient.resumableUploadStep(reader.result,cursor,onStep);
                }
                reader.readAsArrayBuffer(f.slice(cursor.offset,end));
            }
        }else onFail(err,cursor);
    }
    var end = Math.min(f.size,chunk);
    reader.onloadend = function(){
        dbclient.resumableUploadStep(reader.result,null,onStep);
    }
    reader.readAsArrayBuffer(f.slice(0,end));
}

function uploadFile(f,div){
    resumeMethod(f,div);
}

function makeFileDiv(file){
    var div = $("div#filediv").clone();
    div.find('p.filename').text(file.name);
    $("div#files").append(div);
    div.fadeIn();
    div.find("a#upload").click(function(e){
        e.preventDefault();
        div.find("div.progress").fadeIn('fast');
        uploadFile(file,div);
    })
    return div;
}

$(document).ready(function(){
    if(folder) $("input#dbupload").on("change",upload);
});