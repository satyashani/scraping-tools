All the errors will show up in stderr/error.log if the server crashes.
Server might crash on receiving bad proxies(0.0.0.0).

REQUIRED:
Phantomjs 1.10 is needed, please [[https://github.com/ariya/phantomjs/archive/master.zip download]]
and compile for debian system, then replace the
actual bin with the one in /bin of the compiled folder , or you may copy the compiled bin and use it
specifically for this script using ./phantomjs gsearch.js

ROUTES:
GET /           ->  Server check
GET /proxies    ->  List of current proxies
GET /whitelist  ->  List of current white list domains
POST /search    ->  Search google
	POST BODY
	{ "q" : "trackname","id" :"artistname"}
POST /whitelist ->  Update white list from json file
	POST BODY
	{ "path " : "absolute/path/to/json/list"}

POST /proxies    ->  List of new proxies
	POST BODY
[
    {"ip": "...."	,"port" : 80 },
    {"ip": "...."	,"port" : 8080 },
    ...
]
