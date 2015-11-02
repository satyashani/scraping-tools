/* * ************************************************************ 
 * Date: 29 Oct, 2015
 * programmer: Shani Mahadeva <satyashani@gmail.com>
 * Javascript file uploads.js
 * *************************************************************** */

var config = require("../config");
var mysql = require("mysql");

var sqlcon = require("./sqlcon");

var db = config.mysql.database;


process.on("beforeExit",function(){
    sqlcon.close();
});

var createDb = function(cb){
    sqlcon.query("CREATE TABLE "+db+".uploads (id int primary key auto_increment,"+
            " url varchar(255), path varchar(255), status varchar(255), message TEXT)",[],cb);
};

exports.init = function(cb){
    sqlcon.connect(function(err){
        if(err) return cb(err);
        else{
            sqlcon.select("SELECT count(*) + 1 as tableexists FROM "+db+".uploads",[],function(err,row){
                if(row && row.tableexists){
                    cb(null,true);
                }else{
                    createDb(function(err){
                        cb(err, !err);
                    });
                }
            });
        }
    });
};

exports.getById = function(id,cb){
    sqlcon.select("SELECT * FROM "+db+".uploads WHERE id = ?",[id],cb);
};

var getByUrlPath = function(url,path,cb){
    sqlcon.select("SELECT * FROM "+db+".uploads WHERE url = ? AND path = ?",[url,path],cb);
};
exports.getByUrlPath = getByUrlPath;

exports.add = function(url,path,cb){
    getByUrlPath(url,path,function(err,data){
        if(data && data.id) return cb(null,data.id);
        else{
            sqlcon.insert("INSERT INTO "+db+".uploads (url,path,status,message) VALUES(?,?,?,?)",[url,path,'pending','File added to upload queue'],cb);
        }
    });
};

exports.removeById = function(id,cb){
    sqlcon.delete("DELETE FROM "+db+".uploads WHERE id = ?",[id],cb);
};

exports.removeByUrlPath = function(url,path,cb){
    sqlcon.delete("DELETE FROM "+db+".uploads WHERE url = ? AND path = ?",[url,path],cb);
};

exports.updateStatus = function(id,status,message,cb){
    sqlcon.query("UPDATE "+db+".uploads SET status = ?, message = ? WHERE id = ?",[status,message,id],cb);
};
