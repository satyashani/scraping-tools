REQUIRED:
Phantomjs 1.9 or higher is needed
Update the default gmail user and server port in conf.json
To run - phantomjs dashboard.js

ROUTES:
GET /                               ->  Server check
POST /getcomfirmationids            ->  Get list of confirmation ids and their links from dashboard.
	POST BODY
	{"workerid": "gmail_userid"}
POST /getsubmissiondetails          ->  Get List of approved, rejected and pending urls
	POST BODY
	{"workerid": "gmail_userid", ids: ["confirmation-id-1","confirmation-id-2","confirmation-id-3",....]}
POST /geturlinfo                    ->  Get information of a particular url, whether pending/approved/rejected and reason for reject
	POST BODY
	{"workerid": "gmail_userid","url" : "url to search for"}
POST /getidsbydate                  ->  Get confirmation Ids by date
	POST BODY
	{"workerid": "gmail_userid", "date" : "yyyy-mm-dd"}
POST /getrequestcount               ->  Get worker request count since last reset. Set reset = true to reset count.
    POST BODY
    {"workerid": "gmail_userid", "reset": true/false}
POST /geturlcountbydate             ->  Get urls submitted by date
	POST BODY
	{"workerid": "gmail_userid", "date" : "yyyy-mm-dd"}
POST /changeworker                  ->  Get List of approved, rejected and pending urls
    POST BODY
    {
        "workerid"		    :		"username",
        "password"		    :		"password"
    }
