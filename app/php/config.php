<?php

/**
 * Accept values: "DEV".
 * In "DEV" mode, some extra information such as:
 * 1. Ajax.php will append original request in response data.
 * 
 * Comment or change value to others will disable "DEV" mode.
 */
define("ENVMODE", "$grunt_replace_envmode");

<<<<<<< .mine
define("SERVICEURL","http://service.demo.biz");
//define("SERVICEURL","http://demoservice.duapp.com");
//define("SERVICEURL", "http://devservice.demo.biz");
//define("SERVICEURL", "http://devtest.freecoder.com:8080/demo-service");
=======
define("SERVICEURL", "$grunt_replace_serviceUrl");
>>>>>>> .r4824

/**
 * demoService  should define the same APPNAME and APPTOKEN.
 */
define("APPNAME", 'demoConsole');
define("APPTOKEN", "d4080700631f41bf9e5e01f7f4b4f039");

?>