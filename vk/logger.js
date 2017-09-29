
/**
 * Created by Shani (satyashani@gmail.com)  on 2/10/14.
 */
var logger = {
    error:function(){
        var date = new Date();
        var d = date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate()+" "+date.getHours()+":"+date.getMinutes()+":"+date.getSeconds();
        var args = [d," -- "].concat(Array.prototype.slice.call(arguments));
        console.error.apply(console,args);
    },
    log:function(){
        var date = new Date();
        var d = date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate()+" "+date.getHours()+":"+date.getMinutes()+":"+date.getSeconds();
        var args = [d," -- "].concat(Array.prototype.slice.call(arguments));
        console.log.apply(console,args);
    }
};

module.exports =  logger;