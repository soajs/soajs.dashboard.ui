/*
 *  **********************************************************************************
 *   (C) Copyright Herrontech (www.herrontech.com)
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   Contributors:
 *   -
 *  **********************************************************************************
 */

"use strict";
var infraSrv = soajsApp.components;
infraSrv.service('infraSrv', ['ngDataApi', '$timeout', '$modal', '$window', '$cookies', 'Upload', function (ngDataApi, $timeout, $modal, $window, $cookies, Upload) {

	function getInfra(currentScope, cb) {
		let options = {
			"method": "get",
			"routeName": "/dashboard/infra",
			"params":{
				"exclude": [ "groups", "regions", "templates"]
			}
		};
		
		getSendDataFromServer(currentScope, ngDataApi, options, cb);
	}

	return {
		'getInfra': getInfra
	};
}]);
