REQUIRED:
Phantomjs 1.9 or higher is needed
Update the default gmail user and server port in conf.json
To run - phantomjs dashboard.js

ROUTES:
GET /                               ->  Server check
GET /getcomfirmationids             ->  Get list of confirmation ids and their links from dashboard.
POST /getsubmissiondetails          ->  Get List of approved, rejected and pending urls
	POST BODY
	["confirmation-id-1","confirmation-id-2","confirmation-id-3",....]
POST /geturlinfo                    ->  Get information of a particular url, whether pending/approved/rejected and reason for reject
	POST BODY
	{"url" : "url to search for"}
POST /getidsbydate                  ->  Get confirmation Ids by date
	POST BODY
	{"date" : "yyyy-mm-dd"}