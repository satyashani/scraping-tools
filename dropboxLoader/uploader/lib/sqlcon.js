/* * ************************************************************ 
 * Date: 31 Oct, 2015
 * programmer: Shani Mahadeva <satyashani@gmail.com>
 * Javascript file sqlcon.js
 * *************************************************************** */


var config = require("../config");
var mysql = require("mysql");

var sqlcon = {
    conn : null, 
    connect: function(cb){
        sqlcon.conn = mysql.createConnection({
            host     : config.mysql.host,
            port     : config.mysql.port,
            user     : config.mysql.user,
            password : config.mysql.password,
            database : config.mysql.database,
            dateStrings : true
      });
      sqlcon.conn.connect(cb);
    },
    
    querystream: function(sql,params){
        return sqlcon.conn.query(sql,params).stream();
    },
    
    query: function(sql,params,cb){
        sqlcon.conn.query(sql,params,cb);
    },
    
    select : function(sql,params,cb){
        sqlcon.conn.query(sql,params,function(err,rows){
            cb(err,rows && rows.length ? rows[0] : rows);
        });
    },
    
    selectAll : function(sql,params,cb){
        sqlcon.conn.query(sql,params,cb);
    },
    
    insert : function(sql,params,cb){
        sqlcon.conn.query(sql,params,function(err,data){
            cb(err, data ? data.insertId : data);
        });
    },
    
    delete: function(sql,params,cb){
        sqlcon.conn.query(sql,params,function(err,res){
            cb(err,res ? res.affectedRows : res);
        });
    },
    
    close: function(){
        sqlcon.conn.end();
    }
};


module.exports = sqlcon;