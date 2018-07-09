"use strict";
var infraDepSrv = soajsApp.components;
infraDepSrv.service('infraDepSrv', ['ngDataApi', '$timeout', '$modal', '$window', '$cookies', 'Upload', function (ngDataApi, $timeout, $modal, $window, $cookies, Upload) {

	function getInfra(currentScope, id, cb) {
		let options = {
			"method": "get",
			"routeName": "/dashboard/infra",
			"params":{
				"exclude": [ "groups", "regions", "templates"]
			}
		};
		
		if(id){
			options.routeName += "/" + id;
		}
		
		getSendDataFromServer(currentScope, ngDataApi, options, cb);
	}

	return {
		'getInfra': getInfra
	};
}]);
