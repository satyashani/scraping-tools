/* ************************************************************* 
 * 
 * Date: May 29, 2014 
 * version: 1.0
 * programmer: Shani Mahadeva <satyashani@gmail.com>
 * Description:   
 * Javascript file 
 * 
 * 
 * *************************************************************** */

var jq = "jquery-1.10.1.min.js";
var url="http://kingproxies.com/api/v1/proxies.json?key=729fb2b0ef57fc06cdac1b5525c9b0&limit=5&country_code=US&protocols=http&response_time=fast&supports=google";
phantom.setProxy("")
var page = require("webpage").create();
page.open("http://kingproxies.com",function(status){

    page.injectJs(jq);

    var p = page.evaluate(function(url){
        var d = {};
        $.ajax({
            url: url,
            async: false,
            success: function(data){
                d = data;
            },
            error: function(x,t,r){
                d = new Error(JSON.stringify(x));
            }
        })
        return d;
    },url);
    console.log(JSON.stringify(p));
    phantom.setProxy(p.data.proxies[0].ip,p.data.proxies[0].port,'http', '', '');
    page.open("http://www.google.com",function(status){
        if(status!=="success")
            console.log("failed to open google from proxy");
        page.render("googlefromproxy.png");
    })
})