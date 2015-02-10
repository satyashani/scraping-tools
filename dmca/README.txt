STARTING DMCA PHANTOM SERVER

1. Edit the conf.json to suit environment
	* Edit port on which to run server
	* Add Workers configuration( email and password values as objects in an array) that will be used to login to google.
2. If you need to run this as an upstart script, edit paths in dmcaserver.conf, copy conf file to /etc/init(could be different
	on debian) and then run the command "sudo start dmcaserver"
3. If not willing to use upstart simply run the command -
	"phantomjs gserver.js > access.log 2> error.log &"
4. Wait for the server to say "web server started"

Ready to roll :-)

Update : 2015-02-10
Add field 'workerid' in each POST Data to select the worker. e.g. {'workerid': 'amit.020585'}


ROUTES:
GET /                       ->  Server check
GET /version                ->  Server version date check
POST /submitdmca            ->  Get list of confirmation ids and their links from dashboard.
	POST BODY
	{
		"workerid"		    :		"amit.020585",
	    "firstname"		    :		"amit",
	    "lastname"		    :		"rai",
	    "companyname"		:		"sony music",
	    "newcopyrightholder":		"sony music",
	    "email"		        :		"amit.020585@gmail.com",
	    "countrycode"		:		"India",
	    "crworkdesc0"		:		"Sony music copyright",
	    "crworkurls0"		:		"http://www.sonymusic.com/videos/t-i-no-medicore/",
	    "infringingurls0"   :       "http://www.mirrorcreator.com/files/0CQ6SJQB/iTI-No_Mediocre.zip_links",

	    "crworkdesc1"		:		"Sony music copyright",
	    "crworkurls1"		:		"http://www.sonymusic.com/videos/t-i-no-medicore/",
	    "infringingurls1"   :       "http://www.mirrorcreator.com/files/0CQ6SJQB/iTI-No_Mediocre.zip_links",
	    ...
	    ...  // same three fields with 0 to 9 at the end
	    ...
	    "crworkdesc9"		:		"Sony music copyright",
	    "crworkurls9"		:		"http://www.sonymusic.com/videos/t-i-no-medicore/",
	    "infringingurls9"   :       "http://www.mirrorcreator.com/files/0CQ6SJQB/iTI-No_Mediocre.zip_links"
    }
POST /changeworker          ->  Get List of approved, rejected and pending urls
	POST BODY
	{
        "workerid"		    :		"username",
        "password"		    :		"password"
    }
POST /changecaptcha          ->  Get List of approved, rejected and pending urls
    POST BODY
    {
        "captchasource"	    :		"dbc" or "bpc"
    }
GET /currentworker          -> Current logged in worker email, check from dmca-notice page
GET /currentcaptcha         -> Current captcha api code
POST /refreshworker          -> Refresh worker's page to keep memory usage low
    {
        "workerid"		    :		"username"
    }