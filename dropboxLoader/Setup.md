Server Setup for Dropbox Upload
===============================

## Install nodejs 

1. Install nodejs using apt-get or any other method depending on server OS
2. Go to folder /uploader under project root.
3. Run - ```npm install```
4. Change dropbox configuration values, mysql configuration values in /uploader/config.js
5. Run - ```nodejs index.js``` using any continuous runner like *upstart*

## Setup Proxy

### Apache

1. Install apache modules ```sudo apt-get install libapache2-mod-proxy-html```
2. Enable apache modules 
    1. a2enmod proxy
    2. a2enmod proxy-http
3. Create a new configuration for proxy(change port here) -
    * ProxyRequests Off
    * ProxyPass /dmcaserver/dropboxLoader/uploader/ http://localhost:3000/
    * ProxyPassReverse /dmcaserver/dropboxLoader/uploader/ http://localhost:3000/
The value '/dmcaserver/dropboxLoader' in the above two lines should be replaced by the location of project folder relative to apache document root.
The nodejs application serves at the location '/uploader/*' relative to project root. The port number '3000' should be replaced with the one configured in '/uploader/config.js'.

## Test Upload

1. Set up dropbox App configuration in public/js/conf.js
2. Access the page directupload.html