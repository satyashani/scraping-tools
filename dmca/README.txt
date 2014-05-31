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