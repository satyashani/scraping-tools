STARTING DMCA PHANTOM SERVER

1. Edit the conf.json to suit environment
	* Edit port on which to run server
	* Add Workers configuration( email and password values as objects in an array) that will be used to login to google.
2. If you need to run this as an upstart script, edit paths in dmcaserver.conf, copy conf file to /etc/init(could be different
	on debian) and then run the command "sudo start dmcaserver"
3. If not willing to use upstart simply run the command -
	"phantomjs server.js > access.log 2> error.log &"
4. Wait for the server to say "web server started"

Ready to roll :-)

Update : 2014-03-24
Add field 'workerid' in each POST Data to select the worker. e.g. {'workerid': 'amit.020585'}


ROUTES:
GET /                       ->  Server check
GET /version                ->  Server version number
POST /search                ->  Search
    POST BODY
    {
        "workerid"	    :		"email",
        "term"          :       "search term",
        "type"          :       "audio | video"
    }
POST /submitdmca            ->  Get list of confirmation ids and their links from dashboard.
	POST BODY
	{
	    "tickets_text" : "ticket text",
        "tickets_links" : "ticket links",
        "person" : "legal",
        "tickets_dmca_name" : "Max steiner",
        "tickets_dmca_email" : "satyashani@gmail.com",
        "tickets_dmca_region" : "Rome",
        "tickets_dmca_address" : "Katni MP India",
        "tickets_dmca_corp" : "total wipes music group",
        "tickets_dmca_repr" : "Shani Mahadeva",
        "tickets_dmca_post" : "Service provider",
        "tickets_dmca_country_wrap" : 80,
        "tickets_dmca_city_wrap" : 437,
        "support_dmca_agree_owner" : false,
        "support_dmca_agree_unauthorized" : false,
        "support_dmca_agree_perjury" : false,
        "support_dmca_agree_email" : false,
        "support_dmca_agree_inform" : false,
        "support_dmca_agree_rules" : true,
        "support_dmca_agree_owner_legal" : true,
        "support_dmca_agree_unauthorized_legal" : true,
        "support_dmca_agree_perjury_legal" : true,
        "support_dmca_agree_email_legal" : true,
        "support_dmca_agree_inform_legal" : true
    }
POST /changeworker          ->  Get List of approved, rejected and pending urls
	POST BODY
	{
        "workerid"		    :		"email",
        "password"		    :		"password"
    }
POST /ticketstatus          ->  Get status of ticket as "pending" or "answered"
    POST BODY
    {
        "workerid"	    :		"email",
        "ticketid"      :       <integer ticket id>
    }
GET /currentworker          -> Current logged in worker id(interger) and name