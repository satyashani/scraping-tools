/**
 * Created by Shani(satyashani@gmail.com) on 22/11/14.
 */


var dbclient = new Dropbox.Client({ key: 'app-key' ,token: "oauth2.0-token"});

function upload(){
    if(dbclient && dbclient.isAuthenticated()){
        for(var i=0;i<this.files.length;i++){
            var f = this.files[i];
            var xhr = dbclient.writeFile(f.name,f,function(error,stat){
                if(error){
                    console.error("Failed to upload ", f.name,error);
                    $("#status").text(error);
                }
                else{
                    console.log(stat);
                    $("#status").text(stat);
                }
            });
            xhr.addEventListener('progress', function(e) {
                var done = e.position || e.loaded, total = e.totalSize || e.total;
                $("#progress").text('xhr progress: ' + (Math.floor(done/total*1000)/10) + '%');
            }, false);
            xhr.onreadystatechange = function(e) {
                if ( 4 == this.readyState ) {
                    $("#status").text("Complete");
                }
            };
        }
    }else console.log("Auth error");
}

$(document).ready(function(){
    $("input#dbupload").on("change",upload);
});