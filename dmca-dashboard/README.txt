REQUIRED:
Phantomjs 1.9 or higher is needed
Update the default gmail user and server port in conf.json
To run - phantomjs dashboard.js

ROUTES:
GET /           ->  Server check
POST /get    ->  Get List of approved, rejected and pending urls
	POST BODY
	["confirmation-id-1","confirmation-id-2","confirmation-id-3",....]