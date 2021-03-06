/* * ************************************************************ 
 * 
 * Date: May 31, 2013
 * version: 1.0
 * programmer: Shani Mahadeva <satyashani@gmail.com>
 * Description:   
 * Javascript file scrapercursos.js
 * 
 * 
 * *************************************************************** */
var ws =  require('webserver');
var pg = require("webpage");
var jq = "jquery-1.10.1.min.js";
var fs = require("fs");

var gmailuser = {username : "amit.020585",password : "Rewq!234"};
var conf = JSON.parse(fs.read("conf.json"));
conf.captchaApi = conf.captchaApi || "dbc";


var versiondate = "2015-02-19 14:55";

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

var inputs = [
    {id: "firstname", type: "input", selector: "input[name='first-name']", required: true},
    {id: "lastname", type: "input", selector: "input[name='last-name']", required: true},
    {id: "companyname", type: "input", selector: "input[name='company-name']", required: false,default: ""},
    {id: "newcopyrightholder", type: "input", selector: "input#new-copyright-holder", required: true},
    {id: "email", type: "input", selector: "input[name='email']", required: true},
    {id: "countrycode", type: "select", selector: "select#country-code", required: true},
    {id: "crworkdesc0", type: "textarea", selector: "textarea[name='cr-work-desc0']", required: true},
    {id: "crworkurls0", type: "textarea", selector: "textarea[name='cr-work-urls0']", required: true},
    {id: "infringingurls0", type: "textarea", selector: "textarea[name='infringing-urls0']", required: true},
    {id: "crworkdesc1", type: "textarea", selector: "textarea[name='cr-work-desc1']", required: false},
    {id: "crworkurls1", type: "textarea", selector: "textarea[name='cr-work-urls1']", required: false},
    {id: "infringingurls1", type: "textarea", selector: "textarea[name='infringing-urls1']", required: false},
    {id: "crworkdesc2", type: "textarea", selector: "textarea[name='cr-work-desc2']", required: false},
    {id: "crworkurls2", type: "textarea", selector: "textarea[name='cr-work-urls2']", required: false},
    {id: "infringingurls2", type: "textarea", selector: "textarea[name='infringing-urls2']", required: false},
    {id: "crworkdesc3", type: "textarea", selector: "textarea[name='cr-work-desc3']", required: false},
    {id: "crworkurls3", type: "textarea", selector: "textarea[name='cr-work-urls3']", required: false},
    {id: "infringingurls3", type: "textarea", selector: "textarea[name='infringing-urls3']", required: false},
    {id: "crworkdesc4", type: "textarea", selector: "textarea[name='cr-work-desc4']", required: false},
    {id: "crworkurls4", type: "textarea", selector: "textarea[name='cr-work-urls4']", required: false},
    {id: "infringingurls4", type: "textarea", selector: "textarea[name='infringing-urls4']", required: false},
    {id: "crworkdesc5", type: "textarea", selector: "textarea[name='cr-work-desc5']", required: false},
    {id: "crworkurls5", type: "textarea", selector: "textarea[name='cr-work-urls5']", required: false},
    {id: "infringingurls5", type: "textarea", selector: "textarea[name='infringing-urls5']", required: false},
    {id: "crworkdesc6", type: "textarea", selector: "textarea[name='cr-work-desc6']", required: false},
    {id: "crworkurls6", type: "textarea", selector: "textarea[name='cr-work-urls6']", required: false},
    {id: "infringingurls6", type: "textarea", selector: "textarea[name='infringing-urls6']", required: false},
    {id: "crworkdesc7", type: "textarea", selector: "textarea[name='cr-work-desc7']", required: false},
    {id: "crworkurls7", type: "textarea", selector: "textarea[name='cr-work-urls7']", required: false},
    {id: "infringingurls7", type: "textarea", selector: "textarea[name='infringing-urls7']", required: false},
    {id: "crworkdesc8", type: "textarea", selector: "textarea[name='cr-work-desc8']", required: false},
    {id: "crworkurls8", type: "textarea", selector: "textarea[name='cr-work-urls8']", required: false},
    {id: "infringingurls8", type: "textarea", selector: "textarea[name='infringing-urls8']", required: false},
    {id: "crworkdesc9", type: "textarea", selector: "textarea[name='cr-work-desc9']", required: false},
    {id: "crworkurls9", type: "textarea", selector: "textarea[name='cr-work-urls9']", required: false},
    {id: "infringingurls9", type: "textarea", selector: "textarea[name='infringing-urls9']", required: false},
    {id: "agree2", type: "checkbox", selector: "input[name='agree2']", required: false,default: true},
    {id: "agree1", type: "checkbox", selector: "input[name='agree1']", required: false,default: true},
    {id: "agree5", type: "checkbox", selector: "input[name='agree5']", required: false,default: true}
];

var countrycodes = [
    {name: "Afghanistan", code: "AF"},
    {name: "Åland Islands", code: "AX"},
    {name: "Albania", code: "AL"},
    {name: "Algeria", code: "DZ"},
    {name: "American Samoa", code: "AS"},
    {name: "Andorra", code: "AD"},
    {name: "Angola", code: "AO"},
    {name: "Anguilla", code: "AI"},
    {name: "Antarctica", code: "AQ"},
    {name: "Antigua and Barbuda", code: "AG"},
    {name: "Argentina", code: "AR"},
    {name: "Armenia", code: "AM"},
    {name: "Aruba", code: "AW"},
    {name: "Ascension Island", code: "AC"},
    {name: "Australia", code: "AU"},
    {name: "Austria", code: "AT"},
    {name: "Azerbaijan", code: "AZ"},
    {name: "Bahamas", code: "BS"},
    {name: "Bahrain", code: "BH"},
    {name: "Bangladesh", code: "BD"},
    {name: "Barbados", code: "BB"},
    {name: "Belarus", code: "BY"},
    {name: "Belgium", code: "BE"},
    {name: "Belize", code: "BZ"},
    {name: "Benin", code: "BJ"},
    {name: "Bermuda", code: "BM"},
    {name: "Bhutan", code: "BT"},
    {name: "Bolivia", code: "BO"},
    {name: "Bosnia and Herzegovina", code: "BA"},
    {name: "Botswana", code: "BW"},
    {name: "Bouvet Island", code: "BV"},
    {name: "Brazil", code: "BR"},
    {name: "British Indian Ocean Territory", code: "IO"},
    {name: "British Virgin Islands", code: "VG"},
    {name: "Brunei", code: "BN"},
    {name: "Bulgaria", code: "BG"},
    {name: "Burkina Faso", code: "BF"},
    {name: "Burundi", code: "BI"},
    {name: "Cambodia", code: "KH"},
    {name: "Cameroon", code: "CM"},
    {name: "Canada", code: "CA"},
    {name: "Cape Verde", code: "CV"},
    {name: "Cayman Islands", code: "KY"},
    {name: "Central African Republic", code: "CF"},
    {name: "Chad", code: "TD"},
    {name: "Chile", code: "CL"},
    {name: "China", code: "CN"},
    {name: "Christmas Island", code: "CX"},
    {name: "Cocos (Keeling) Islands", code: "CC"},
    {name: "Colombia", code: "CO"},
    {name: "Comoros", code: "KM"},
    {name: "Congo (DRC)", code: "CD"},
    {name: "Congo (Republic)", code: "CG"},
    {name: "Cook Islands", code: "CK"},
    {name: "Costa Rica", code: "CR"},
    {name: "Côte d’Ivoire", code: "CI"},
    {name: "Croatia", code: "HR"},
    {name: "Cuba", code: "CU"},
    {name: "Cyprus", code: "CY"},
    {name: "Czech Republic", code: "CZ"},
    {name: "Denmark", code: "DK"},
    {name: "Djibouti", code: "DJ"},
    {name: "Dominica", code: "DM"},
    {name: "Dominican Republic", code: "DO"},
    {name: "Ecuador", code: "EC"},
    {name: "Egypt", code: "EG"},
    {name: "El Salvador", code: "SV"},
    {name: "Equatorial Guinea", code: "GQ"},
    {name: "Eritrea", code: "ER"},
    {name: "Estonia", code: "EE"},
    {name: "Ethiopia", code: "ET"},
    {name: "Falkland Islands (Islas Malvinas)", code: "FK"},
    {name: "Faroe Islands", code: "FO"},
    {name: "Fiji", code: "FJ"},
    {name: "Finland", code: "FI"},
    {name: "France", code: "FR"},
    {name: "French Guiana", code: "GF"},
    {name: "French Polynesia", code: "PF"},
    {name: "French Southern Territories", code: "TF"},
    {name: "Gabon", code: "GA"},
    {name: "Gambia", code: "GM"},
    {name: "Georgia", code: "GE"},
    {name: "Germany", code: "DE"},
    {name: "Ghana", code: "GH"},
    {name: "Gibraltar", code: "GI"},
    {name: "Greece", code: "GR"},
    {name: "Greenland", code: "GL"},
    {name: "Grenada", code: "GD"},
    {name: "Guadeloupe", code: "GP"},
    {name: "Guam", code: "GU"},
    {name: "Guatemala", code: "GT"},
    {name: "Guernsey", code: "GG"},
    {name: "Guinea-Bissau", code: "GW"},
    {name: "Guinea", code: "GN"},
    {name: "Guyana", code: "GY"},
    {name: "Haiti", code: "HT"},
    {name: "Heard & McDonald Islands", code: "HM"},
    {name: "Honduras", code: "HN"},
    {name: "Hong Kong", code: "HK"},
    {name: "Hungary", code: "HU"},
    {name: "Iceland", code: "IS"},
    {name: "India", code: "IN"},
    {name: "Indonesia", code: "ID"},
    {name: "Iran", code: "IR"},
    {name: "Iraq", code: "IQ"},
    {name: "Ireland", code: "IE"},
    {name: "Isle of Man", code: "IM"},
    {name: "Israel", code: "IL"},
    {name: "Italy", code: "IT"},
    {name: "Jamaica", code: "JM"},
    {name: "Japan", code: "JP"},
    {name: "Jersey", code: "JE"},
    {name: "Jordan", code: "JO"},
    {name: "Kazakhstan", code: "KZ"},
    {name: "Kenya", code: "KE"},
    {name: "Kiribati", code: "KI"},
    {name: "Kosovo", code: "XK"},
    {name: "Kuwait", code: "KW"},
    {name: "Kyrgyzstan", code: "KG"},
    {name: "Laos", code: "LA"},
    {name: "Latvia", code: "LV"},
    {name: "Lebanon", code: "LB"},
    {name: "Lesotho", code: "LS"},
    {name: "Liberia", code: "LR"},
    {name: "Libya", code: "LY"},
    {name: "Liechtenstein", code: "LI"},
    {name: "Lithuania", code: "LT"},
    {name: "Luxembourg", code: "LU"},
    {name: "Macau", code: "MO"},
    {name: "Macedonia (FYROM)", code: "MK"},
    {name: "Madagascar", code: "MG"},
    {name: "Malawi", code: "MW"},
    {name: "Malaysia", code: "MY"},
    {name: "Maldives", code: "MV"},
    {name: "Mali", code: "ML"},
    {name: "Malta", code: "MT"},
    {name: "Marshall Islands", code: "MH"},
    {name: "Martinique", code: "MQ"},
    {name: "Mauritania", code: "MR"},
    {name: "Mauritius", code: "MU"},
    {name: "Mayotte", code: "YT"},
    {name: "Mexico", code: "MX"},
    {name: "Micronesia", code: "FM"},
    {name: "Moldova", code: "MD"},
    {name: "Monaco", code: "MC"},
    {name: "Mongolia", code: "MN"},
    {name: "Montenegro", code: "ME"},
    {name: "Montserrat", code: "MS"},
    {name: "Morocco", code: "MA"},
    {name: "Mozambique", code: "MZ"},
    {name: "Myanmar (Burma)", code: "MM"},
    {name: "Namibia", code: "NA"},
    {name: "Nauru", code: "NR"},
    {name: "Nepal", code: "NP"},
    {name: "Netherlands", code: "NL"},
    {name: "New Caledonia", code: "NC"},
    {name: "New Zealand", code: "NZ"},
    {name: "Nicaragua", code: "NI"},
    {name: "Nigeria", code: "NG"},
    {name: "Niger", code: "NE"},
    {name: "Niue", code: "NU"},
    {name: "Norfolk Island", code: "NF"},
    {name: "North Korea", code: "KP"},
    {name: "Northern Mariana Islands", code: "MP"},
    {name: "Norway", code: "NO"},
    {name: "Oman", code: "OM"},
    {name: "Pakistan", code: "PK"},
    {name: "Palau", code: "PW"},
    {name: "Palestine", code: "PS"},
    {name: "Panama", code: "PA"},
    {name: "Papua New Guinea", code: "PG"},
    {name: "Paraguay", code: "PY"},
    {name: "Peru", code: "PE"},
    {name: "Philippines", code: "PH"},
    {name: "Pitcairn Islands", code: "PN"},
    {name: "Poland", code: "PL"},
    {name: "Portugal", code: "PT"},
    {name: "Puerto Rico", code: "PR"},
    {name: "Qatar", code: "QA"},
    {name: "Réunion", code: "RE"},
    {name: "Romania", code: "RO"},
    {name: "Russia", code: "RU"},
    {name: "Rwanda", code: "RW"},
    {name: "Saint Barthélemy", code: "BL"},
    {name: "Saint Helena", code: "SH"},
    {name: "Saint Kitts and Nevis", code: "KN"},
    {name: "Saint Lucia", code: "LC"},
    {name: "Saint Martin", code: "MF"},
    {name: "Saint Pierre and Miquelon", code: "PM"},
    {name: "Samoa", code: "WS"},
    {name: "San Marino", code: "SM"},
    {name: "São Tomé and Príncipe", code: "ST"},
    {name: "Saudi Arabia", code: "SA"},
    {name: "Senegal", code: "SN"},
    {name: "Serbia", code: "RS"},
    {name: "Seychelles", code: "SC"},
    {name: "Sierra Leone", code: "SL"},
    {name: "Singapore", code: "SG"},
    {name: "Slovakia", code: "SK"},
    {name: "Slovenia", code: "SI"},
    {name: "Solomon Islands", code: "SB"},
    {name: "Somalia", code: "SO"},
    {name: "South Africa", code: "ZA"},
    {name: "South Georgia & South Sandwich Islands", code: "GS"},
    {name: "South Korea", code: "KR"},
    {name: "Spain", code: "ES"},
    {name: "Sri Lanka", code: "LK"},
    {name: "St. Vincent & Grenadines", code: "VC"},
    {name: "Sudan", code: "SD"},
    {name: "Suriname", code: "SR"},
    {name: "Svalbard and Jan Mayen", code: "SJ"},
    {name: "Swaziland", code: "SZ"},
    {name: "Sweden", code: "SE"},
    {name: "Switzerland", code: "CH"},
    {name: "Syria", code: "SY"},
    {name: "Taiwan", code: "TW"},
    {name: "Tajikistan", code: "TJ"},
    {name: "Tanzania", code: "TZ"},
    {name: "Thailand", code: "TH"},
    {name: "Timor-Leste", code: "TL"},
    {name: "Togo", code: "TG"},
    {name: "Tokelau", code: "TK"},
    {name: "Tonga", code: "TO"},
    {name: "Trinidad and Tobago", code: "TT"},
    {name: "Tristan da Cunha", code: "TA"},
    {name: "Tunisia", code: "TN"},
    {name: "Turkey", code: "TR"},
    {name: "Turkmenistan", code: "TM"},
    {name: "Turks and Caicos Islands", code: "TC"},
    {name: "Tuvalu", code: "TV"},
    {name: "U.S. Outlying Islands", code: "UM"},
    {name: "U.S. Virgin Islands", code: "VI"},
    {name: "Uganda", code: "UG"},
    {name: "Ukraine", code: "UA"},
    {name: "United Arab Emirates", code: "AE"},
    {name: "United Kingdom", code: "GB"},
    {name: "United States", code: "US"},
    {name: "Uruguay", code: "UY"},
    {name: "Uzbekistan", code: "UZ"},
    {name: "Vanuatu", code: "VU"},
    {name: "Vatican City", code: "VA"},
    {name: "Venezuela", code: "VE"},
    {name: "Vietnam", code: "VN"},
    {name: "Wallis and Futuna", code: "WF"},
    {name: "Western Sahara", code: "EH"},
    {name: "Yemen", code: "YE"},
    {name: "Zambia", code: "ZM"},
    {name: "Zimbabwe", code: "ZW"},
    {name: "Unlisted", code: "ZZ"}
];


var  captchaApis = {
    "dbc": {
        reqlist: {},
        creds : {username: "hugs", password: "ugosara"},
        solve: function (captchafile, callback) {
            var dbc = captchaApis.dbc.creds;
            var page = pg.create(), urlchanges = 0, calledBack = false;
            page.content = "<html><body>" +
                "<form action='http://api.dbcapi.me/api/captcha' method='post' enctype='multipart/form-data'>" +
                "<input type='text'     name='username' value='" + dbc.username + "'>" +
                "<input type='password' name='password' value='" + dbc.password + "'>" +
                "<input id='captchafile' type='file'     name='captchafile' >" +
                "</form></body></html>";
            page.injectJs(jq);
            page.uploadFile("input#captchafile", captchafile);
            page.onConsoleMessage = logger.log;
            var caller = function (err, res) {
                if (!calledBack) {
                    calledBack = true;
                    callback(err, res);
                }
            }
            setTimeout(function () {
                caller(new Error("captcha_timeout"));
            }, conf.captchatimeout);
            page.onUrlChanged = function (url) {
                urlchanges++;
                logger.log("captcha_decode_step:url=" + url);
                var m = url.match(new RegExp("api\/captcha\/([0-9]+)"));
                if (m) {
                    var id = m[1];
                    page.injectJs(jq);
                    logger.log("captcha_decode_step:captcha uploaded");
                    var captcha = page.evaluate(function (captchaurl) {
                        var c = "", tries = 0;
                        var poll = function () {
                            tries++;
                            console.log("captcha_decode_step:poll try - " + tries);
                            for (i = 0, j = 0; i < 400000000; i++)
                                j++;
                            $.ajax({
                                url: captchaurl,
                                async: false,
                                headers: {"Accept": "application/json"},
                                success: function (data) {
                                    console.log("captcha_decode_step:captcha decoded - " + tries);
                                    if (data.text) {
                                        c = data;
                                    }
                                    else if (tries < 5) {
                                        poll();
                                    }
                                },
                                error: function (x, t) {
                                    c = new Error(t);
                                    console.log("captcha_decode_step:error from DBC page - " + t);
                                    if (tries < 5) {
                                        poll();
                                    }
                                }
                            })
                        };
                        poll();
                        return c;
                    }, url);
                    captchaApis.dbc.reqlist[captchafile] = id;
                    if (captcha.text)
                        caller(null, captcha.text);
                    else
                        caller(new Error("dbc_api_error:" + JSON.stringify(captcha)), null);
                } else if (urlchanges >= 2)
                    caller(new Error("dbc_api_redirect_failed:" + url), null);
            };
            page.evaluate(function () {
                $("form").submit();
            });
        },
        report: function(filename){
            var page = pg.create();
            var post = "username="+ captchaApis.dbc.creds.username+"&password="+ captchaApis.dbc.creds.password;
            page.open("http://api.dbcapi.me/api/captcha/"+captchaApis.dbc.reqlist[filename]+"/report",'POST',post,function(stat){
                if(stat != 'success') console.error("Failed to send captcha error request");
            });
        },
        remove: function(filename){
            fs.remove(filename);
            if(captchaApis.dbc.reqlist.hasOwnProperty(filename)) delete captchaApis.dbc.reqlist[filename];
        }
    },
    "bpc": {
        solve:
            function(captchafile,callback){
                var bpckey = "e5740194374a84031346a48321b32e58";
                var page = pg.create(),urlchanges= 0,timeout=false;
                var captcha = fs.read(captchafile).replace("base64:","");
                page.content = "<html><body>" +
                    "<form id='uploadform' action='http://bypasscaptcha.com/upload.php' method='post' enctype='multipart/form-data'>"+
                    "<input type='text' name='key' value='"+bpckey+"'>"+
                    "<textarea name='file' id='captchafile'>"+captcha+"</textarea>"+
                    "<input type='text' name='gen_task_id' value='1'>"+
                    "<input type='text' name='base64_code' value='1'>"+
                    "<input type='text' name='vendor_key'>"+
                    "<input type='submit' value='Submit'>"+
                    "</form></body></html>";
                page.injectJs(jq);
                page.onConsoleMessage = logger.log;
                setTimeout(function(){
                    timeout=true;
                    callback(new Error("captcha_timeout"));
                },conf.captchatimeout);
                page.onLoadFinished = function(){
                    urlchanges++;
                    page.injectJs(jq);
                    var hasform = page.evaluate(function(){
                        return $("form#uploadform").size();
                    });
                    if(hasform){
                        if(urlchanges <= 2)
                            return;
                        else
                            callback(new Error("error submitting captcha form"));
                    }
                    logger.log("captcha_decode_step:url="+page.url);
                    var content = page.evaluate(function(){
                        return $("body").text();
                    });
                    var lines = content.split("\n");
                    var  res = {};
                    lines.forEach(function(l){
                        var m = l.match(/([A-z]+) (.*)/);
                        if(m){
                            res[m[1].toLowerCase()] = m[2];
                        }
                    });
                    if(res.error) callback(new Error(res.error));
                    else if(!res.value) callback(new Error("No value in captcha response."));
                    else callback(null,res.value);
                };
                page.evaluate(function(){
                    $("form").submit();
                });
            },
        report: function(filename){

        },
        remove: function(filename){
            fs.remove(filename);
        }
    }
};

var decodeCatpcha = function(captchafile,callback){
    if(conf.captchaApi && captchaApis.hasOwnProperty(conf.captchaApi)){
        captchaApis[conf.captchaApi].solve(captchafile,callback);
    }else{
        callback(new Error("Unknown captcha api:"+conf.captchaApi));
    }
};

var handler = function(req,res,server){
    logger.log(req.method+": "+req.url);
    server.requests++;
    if(server.requests>30)
        server.changeProxy();

    var handleSetProxies = function(){
        server.setProxies(req.post.split(","));
        sendOk();
    };


    var getPostData = function(checkfields){
        try{
            var data= JSON.parse(req.post);
            if(checkfields && checkfields.length){
                for(var i=0;i<checkfields.length;i++){
                    if(!data.hasOwnProperty(checkfields[i])){
                        sendError("missing_field:"+checkfields[i]);
                        return false;
                    }
                }
            }
            return data;
        }catch(e){
            sendError("bad_input:"+ e.message);
            return false;
        }
    };

    var handleDmca = function(){
        var data = getPostData(["workerid"]);
        if(data){
            var formdata = [].concat(inputs);
            for(var i=0;i<formdata.length;i++){
                if(formdata[i].required && !data[formdata[i].id])
                    return sendError("required_field_missing:"+formdata[i].id);
                else
                    formdata[i].value = data[formdata[i].id]?data[formdata[i].id]:(formdata[i].default?formdata[i].default:"");
                if(formdata[i].id=="countrycode" && data[formdata[i].id].length>2){
                    for(var j=0;j<countrycodes.length;j++){
                        if(countrycodes[j].name == data[formdata[i].id]){
                            formdata[i].value = countrycodes[j].code;
                            break;
                        }
                    }
                }
            }
            formdata.push({"id": "signature", type: "input", selector: "input#signature",value: data.firstname+" "+data.lastname});
            var d = new Date();
            var datestring = (d.getMonth()+1) +"/"+ d.getDate()+"/"+d.getFullYear();
            formdata.push({id: "signaturedate", type: "input", selector: "input#signature-date", value: datestring});

            //Put a worker to task
            server.getWorker(data.workerid,function(err,worker){
                if(err) sendError(err.message);
                else{
                    logger.log("Got worker from server");
                    worker.fillform(formdata,function(errfilling,res){
                        if(errfilling)
                            sendError(errfilling.message);
                        else {
                            var response = {ok : true};
                            if(res){
                                for(var k in res) response[k] = res[k];
                            }
                            send(200,response,true);
                        }
                    });
                }
            });
        }
    };

    var handleChangeWorker = function(){
        var worker = getPostData(["workerid","password"]);
        worker.username = worker.workerid;
        server.changeWorker(worker,function(err,res){
            if(!err && res) sendOk();
            else sendError(err.message);
        })
    };

    var handleRefreshWorker = function(){
        var data = getPostData(["workerid"]);
        server.getWorker(data.workerid,function(err,worker){
            if(err) sendError(err.message);
            else{
                worker.refresh(function(err,res){
                    if(!err && res) sendOk();
                    else sendError(err.message);
                });
            }
        });
    };

    var handleGetCurrentWorker = function(){
        var u = server.workers[0].username;
        server.getWorker(u,function(err,worker){
            if(err) return sendError("no worker logged in");
            worker.getCurrentLoggedIn(function(err,res){
                if(err) sendError(err.message);
                else send(200,res,true);
            })
        });
    };

    var handleChangeCaptcha = function(){
        var data = getPostData(["captchasource"]);
        if(data){
            if(!captchaApis.hasOwnProperty(data.captchasource))
                return sendError("Unknow captcha api "+data.captchasource);
            conf.captchaApi = data.captchasource;
            sendOk();
        }
    };

    var handleGetProxies = function(){
        send(200,server.proxies,true);
    };


    var sendOk = function(){
        send(200,{ok : true},true);
    };

    var sendError = function(msg){
        send(200,{ok : false, error: msg},true);
    };

    var send = function(status,data,isjson){
        res.statusCode = status;
        var json = arguments.length>2?isjson:true;
        res.setHeader('Content-Type', json?"application/json":"text/html");
        var out = json?JSON.stringify(data):data;
        res.setHeader('Content-Length', out.length);
        res.write(out);
        res.closeGracefully();
    };

    if(req.method == "POST"){
        switch(req.url){
            case "/proxies" : handleSetProxies(); break;
            case "/submitdmca" : handleDmca(); break;
            case "/changeworker": handleChangeWorker(); break;
            case "/refreshworker": handleRefreshWorker(); break;
            case "/changecaptcha" : handleChangeCaptcha(); break;
            case "/": sendOk(); break;
            default : sendError("Unknown POST route:"+req.url); break;
        }
    }else{
        switch(req.url){
            case "/proxies" : handleGetProxies(); break;
            case "/currentworker" : handleGetCurrentWorker(); break;
            case "/currentcaptcha" : send(200,{"ok":true,"captchasource":conf.captchaApi},true); break;
            case "/version" : send(200,{"ok":true,"versiondate":versiondate},true); break;
            case "/": sendOk(); break;
            default : sendError("Unknown GET route: "+req.url); break;
        }
    }
};

var worker = function(config){
    var username = config.username?config.username:gmailuser.username;
    var password = config.password?config.password:gmailuser.password;
    this.username = username;
    var changes = 0;
    this.busy = false; this.loggedin = false;
    var page = pg.create(); this.relogin = false;
    var that = this;
    var dashboardurl = "https://www.google.com/webmasters/tools/dmca-dashboard?rlf=all&grid.s=500";
    page.onError = function(err,trace){};
    this.refresh = function(callback){
        page.close();
        page = pg.create();
        page.onError = function(err,trace){};
        this.login(callback);
    };
    this.openDashboard = function(callback){
        page.onLoadFinished = function(){
            page.onLoadFinished = null;
            page.injectJs(jq);
            callback(null);
        };
        page.open(dashboardurl,function(stat){
            if(!stat=='success'){
                var time = new Date().toString().replace(/ /g,'_');
                page.render("images/dashboard.+"+time+".png");
                return callback(new Error("Failed to open dmca dashboard."));
            }
        });
    };
    this.getUrlDetails = function(url,callback){
        that.openDashboard(function(err){
            if(err) return callback(err);
            page.onLoadFinished = function(){
                if(!page.url.match(/url\-match/i)){
                    logger.log("Search result page url = "+page.url);
                    return callback(new Error("Could not open dashboard url page"));
                }
                page.onLoadFinished = null;
                page.injectJs(jq);
                var res = page.evaluate(function(){
                    var out = {};
                    out.size = $("table#grid tbody a").size();
                    if(!out.size) return out;
                    out.id = $("table#grid tbody tr.first td.id-column").text();
                    return out;
                });
                if(!res.id){
                    var time = new Date().toString().replace(/ /g,'_');
                    page.render("images/urlsearchpage."+time+".png");
                    return callback(new Error("confirmation id not found"));
                }else callback(null,res);
            };
            page.evaluate(function(url){
                $('input[name="url-match"]').val(url);
                $("form.url-match-form").submit();
            },url);
        })
    };
    var getConfId = function(urls,callback){
        if(urls.length){
            var u = urls.shift();
            that.openDashboard(function(err){
                if(err) return getConfId(urls,callback);
                else that.getUrlDetails(urls,function(err,res){
                    if(err || !res || !res.id) return getConfId(urls,callback);
                    else callback(null,res);
                });
            });
        }else{
            callback(null,{id: ""});
        }
    };
    var filldmca = function(dmcaformdata,callback){
        logger.log("About to fill form as "+username);
        var confcheckurl = [];
        for(var i=0;i<dmcaformdata.length;i++){
            if(dmcaformdata[i].id==='infringingurls0'){
                confcheckurl = dmcaformdata[i].value.split(",").slice(0,2);
                break;
            }
        }
        if(!confcheckurl.length) return callback(new Error("no urls were given for submission"));
        page.onCallback = function(imgdata){
            page.onCallback = null;
            if(!imgdata){
                var time = new Date().toString().replace(/ /g,'_');
                page.render("images/captcha_error."+time+".png");
                return callback(new Error("dmca_captcha_not_loaded"),null);
            }
            if(imgdata.length < 20){
                return setTimeout(function(){
                    page.switchToFrame(imgdata);
                    page.injectJs(jq);
                    page.onError = function(msg){
                        console.log('iframe page error',msg);
                    };
                    page.onConsoleMessage = function(msg){
                        console.log('iframe page message',msg);
                    };
                    var hasspan = page.evaluate(function(){
                        var span = $('span#recaptcha-anchor');
                        console.log("number of recaptcha span = ",span.size());
                        if(span.size())
                            span.trigger("click");
                        return span.size();
                    });
                    if(hasspan){
                        setTimeout(function(){
                            page.render("afterclickonspan.png");
                            callback(new Error("this error shuold be removed"));
                        },5000);
                    }else{
                        page.render("images/captcha_no_clickspan."+time+".png");
                        callback(new Error("no captcha span for click"));
                    }
                },5000  );
            }
            var filename = "./captcha/captcha_"+new Date().getTime()+".txt";
            fs.write(filename,imgdata,"w");
            logger.log("retrieved captcha and wrote to file "+filename);
            decodeCatpcha(filename,function(err,decodedcaptcha){
                var dmcaurlchanges = 0,dmcapageloads = 0;
                if(err) return callback(err,null);
                logger.log("captcha decoded to be "+decodedcaptcha);
                page.onLoadFinished = function(){
                    var url = page.url;
                    dmcapageloads++;
                    if(dmcapageloads>4) return;
                    if(dmcapageloads==4)
                        return callback(new Error("dmca_submit_error_bad_url:"+url),null);
                    if(url.match(/dmca-submission-success/)){
                        page.onUrlChanged = null;
                        page.onLoadFinished = null;
                        getConfId(confcheckurl,callback);
                    }
                    else if(url.match(/dmca-notice-ac/)){
                        page.injectJs(jq);
                        var errors = page.evaluate(function(){
                            var errors = "";
                            console.log("Found errors in submit page - "+$("div.errormsg").size());
                            $("div.errormsg").each(function(){
                                errors += $(this).text();
                            });
                            return errors;
                        });
                        page.onLoadFinished = null;
                        if(errors){
                            var time = new Date().toString().replace(/ /g,'_');
                            page.render("aftersubmit_error"+time+".png");
                            if(errors.indexOf("Incorrect response. Please try again")>-1 && captchaApis.hasOwnProperty(conf.captchaApi)){
                                captchaApis[conf.captchaApi].report(filename);
                            }else{
                                captchaApis[conf.captchaApi].remove(filename);
                            }
                            callback(new Error(errors),null);
                        }
                        else
                            callback(new Error("bad_captcha"),null);
                    }
                };
                page.onUrlChanged = function(url){
                    dmcaurlchanges++;
                    logger.log("dmca url after submit - "+url);
                };
                page.evaluate(function(captcha,formdatajson){
                    var formdata = JSON.parse(formdatajson),groups = 0;
                    formdata.forEach(function(f){
                        if(f.id.match(/crworkdesc\d+/) && f.value) groups++;
                    });
                    for(var i=1;i<groups;i++) $("#add-group-link").click();
                    $("input#recaptcha_response_field").val(captcha);
                    formdata.forEach(function(f){
                        if(f.id=="newcopyrightholder"){
                            $("select#cr-holder").find("option").remove();
                            $("select#cr-holder").append($("<option value='"+ f.value+"'>"+f.value+"</option>"));
                            $("select#cr-holder").val(f.value);
                        }else if(f.type=="input" || f.type=="select")
                            $(f.selector).val(f.value);
                        else if(f.type=="textarea" && f.value)
                            $(f.selector).text(f.value);
                        else if(f.type=="checkbox"){
                            $(f.selector).prop('checked', f.value);
                        }
                    });
                    $("form#dmca").submit();
                },decodedcaptcha,JSON.stringify(dmcaformdata));
            })
        }
        page.onResourceError = function(resourceError) {
            page.reason = resourceError.errorString;
            page.reason_url = resourceError.url;
        };
        page.open("https://www.google.com/webmasters/tools/dmca-notice?hl=en&pid=0",function(opened){
            if(opened == "success"){
                page.injectJs(jq);
                logger.log("dmca page loaded by "+username);
                page.onConsoleMessage = logger.log;
                page.evaluate(function(){
                    setTimeout(function(){
                        if(!$("img#recaptcha_challenge_image").size()){
                            console.log("captcha found = "+$("img#recaptcha_challenge_image").size());
                            if($('iframe[title="recaptcha widget"]').size()){
                                console.log("Found and iframe of name "+$('iframe[title="recaptcha widget"]').attr('name'))
                                return window.callPhantom($('iframe[title="recaptcha widget"]').attr('name'));
                            }
                            return window.callPhantom(null);
                        }
                        $("<img/>").load(function(){
                            var img = document.getElementById("recaptcha_challenge_image");
                            // Create an empty canvas element
                            var canvas = document.createElement("canvas");
                            canvas.width = img.width;
                            canvas.height = img.height;
                            var ctx = canvas.getContext("2d");
                            ctx.drawImage(img, 0, 0);
                            var imgdata = canvas.toDataURL("image/jpeg").replace(/^data:image\/(png|jpg|jpeg);base64,/, "base64:");
                            window.callPhantom(imgdata);
                        }).error(function(x,t,r){
                            window.callPhantom(false);
                        }).attr({src :$("img#recaptcha_challenge_image").attr("src")});
                    },5000);
                });
            }
            else
                callback(new Error("error_opening_dmca_page:"+page.reason),null);
        });
    }
    this.login = function(callback){
        this.loggedin = false;
        var that = this,serviceLogin=false;
        var time = new Date().toString().replace(/ /g,'_');
        page.clearCookies();
        logger.log("Login request for "+username);
        var timeout = false;
        setTimeout(function(){
            if(!that.loggedin){
                timeout = true;
                page.onLoadFinished = null;
                callback(new Error("login_timeout"));
            }
        },20000);
        page.onLoadFinished = function(){
            var url = page.url;
            logger.log("login page redirect url=",url);
            page.injectJs(jq);
            if(timeout) return;
            var loginerror = page.evaluate(function(){
                if(!that.loggedin){
                    var errorspan = $("span.error-msg");
                    if(!errorspan.size()) return false;
                    else return errorspan.text().trim();
                }
            });
            if(loginerror){
                page.render("images/dashboardloginerror."+time+".png");
                return callback(new Error("Login page error:"+loginerror));
            }
            if(changes >=4) return callback(new Error("Could not log in"));
            if(/LoginVerification|VerifiedPhoneInterstitial/i.test(url)){
                page.render("images/dashboardloginverify."+time+".png");
                return callback(new Error("login failed: requires verification"));
            }
            if(/dmca-notice/i.test(url) && serviceLogin){
                that.loggedin  = true;
                page.onLoadFinished = null;
                logger.log("Logged in using "+that.username);
                var testpage = function(){
                    page.injectJs(jq);
                    var loaded = page.evaluate(function(){
                        return $("input#signature").size();
                    });
                    if(loaded) callback(null,true);
                    else{
                        page.render("images/dmcaafterlogin."+time+".png");
                        setTimeout(testpage,500);
                    }
                }
                testpage();
            }
            if(url.match(/ServiceLogin/)){
                serviceLogin = true;
                page.evaluate(function(username,password){
                    $("input[type='email']").val(username);
                    $("input[type='password']").val(password);
                    $("input#signIn").click();
                },username,password);
            }
            changes++;
        }
        page.open("https://www.google.com/webmasters/tools/dmca-notice?hl=en&pid=0",function(stat){
            if(stat == "success"){
                page.injectJs(jq);
                page.evaluate(function(username,password){
                    $("input[type='email']").val(username);
                    $("input[type='password']").val(password);
                    $("input#signIn").click();
                },username,password);
            }else{
                logger.log("Worker : "+username+" Failed to login, page did not open");
            }
        });
    }
    this.fillform = function(dmcaformdata,callback){
        this.busy = true;
        var that = this;
        filldmca(dmcaformdata,function(err,res){
            callback(err,res);
            if(that.relogin){
                that.login(function(loggedin){
                    if(loggedin==true)
                        logger.log("Worker: "+username+" logged in again.");
                    else
                        logger.log("Worker: "+username+" failed to login.");
                    this.relogin = false;
                });
            }
            that.busy = false;
        })
    }
    this.getCurrentLoggedIn = function(callback){
        page.open("https://www.google.com/webmasters/tools/dmca-notice?hl=en&pid=0",function(opened){
            if(opened !== "success")
                return callback(new Error("error_opening_dmca_page"),null);
            page.injectJs(jq);
            logger.log("dmca page loaded by "+username);
            page.onConsoleMessage = logger.log;
            var tries = 0;
            var checkAccountDetails = function(){
                var res = page.evaluate(function(){
                    if(!$("a[title*='Account']").size()) return false;
                    var t = $("a[title*='Account']").eq(0).attr('title');
                    var m = t.match(/Account ([A-z ]*)\s*\((.*)\)/);
                    if(!m) m = t.match(/Account(\s*)(.*@.*)/);
                    return {title: t, email: m?m[2]:"-",name:m?m[1]:'-'};
                });
                if(!res){
                    if(tries<5){
                        tries++;
                        setTimeout(checkAccountDetails,500);
                    }else{
                        callback(new Error("account details failed to load in  2500ms"));
                    }
                }else{
                    callback(null,res);
                }
            }
            checkAccountDetails();
        });
    }
}

var server = function(){
    this.started = false;
	this.proxies  = [];
    this.workers = [];
    this.requests = 0;
}

server.prototype.setProxies = function(p){
	this.proxies = p; return this;
}

server.prototype.changeProxy = function(){
    phantom.setProxy(this.proxies[Math.ceil(Math.random()*this.proxies.length)]);
    for(var i=0;i<this.workers.length;i++)
        this.workers.relogin = true;
    this.requests = 0;
}

/**
 *
 * @param conf Object having {usrename :'',password: ''}
 */
server.prototype.addWorker = function(config,callback){
    var o = this;
    var wrk = new worker(config);
    logger.log("adding worker with username:",config.username);
    wrk.login(function(err,res){
        if(!err && res===true)
            o.workers.push(wrk);
        else
            logger.log("Failed to add worker "+config.username+", error:"+err.message);
        callback(err,res);
    });
}

/**
 *
 * @param callback function(err,worker){}. error could be "no_workers" or "workers_busy";
 * @returns {*}
 */
server.prototype.getWorker = function(id,callback){
    if(!this.workers.length) callback(new Error("no_workers"),null);
    for(var i=0;i<this.workers.length;i++){
        if(this.workers[i].username===id){
            if(!this.workers[i].loggedin) return callback(new Error("not_logged_in"));
            if(this.workers[i].busy) return callback(new Error("worker_busy"));
            return callback(null,this.workers[i]);
        }
    }
    callback(new Error("worker_not_found"),null);
}

server.prototype.changeWorker = function(worker,callback){
    phantom.clearCookies();
    for(var i=0;i<this.workers.length;i++) this.workers[i] = null;
    this.workers = [];
    this.addWorker(worker,callback);
}

server.prototype.start = function(port){
    var o = this;
    this.started = ws.create().listen(port,function(req,res){
        handler(req,res,o);
    });
}

server.prototype.init = function(){
    var o = this;
    if(conf.proxies)
        o.proxies = conf.proxies;
    var failedlogins = 0;
    var tryLogin = function(i){
        o.addWorker(conf.workers[i],function(err,res){
            if(err){
                logger.log("Error logging in using ",conf.workers[i].username,":",err.message);
                if(i<conf.workers.length-1) tryLogin(i+1);
                else{
                    logger.log("All workers failed to login");
                    o.exit();
                }
            }else{
                o.start(conf.port);
                if(!o.started){
                    logger.log("Workers logged in but failed to start web server on port "+conf.port+", exiting.");
                    o.exit();
                }else{
                    logger.log("Web server started at port "+conf.port);
                }
            }
        });
    }
    tryLogin(0);
}

server.prototype.exit = function(){
	phantom.exit();
}

new server().init();