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
POST /search    ->  Search google
	POST BODY
	{ "track" : "trackname","artist" :"artistname"}

