"use strict";
var infraSrv = soajsApp.components;
infraSrv.service('infraSrv', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {
	
	function getInfra(currentScope, cb) {
		let options = {
			"method": "get",
			"routeName": "/dashboard/infra"
		};
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, options, function (error, result) {
			overlayLoading.hide();
			result.forEach((oneResult) =>{
				oneResult.open = (oneResult.deployments.length > 0 || (oneResult.templates && oneResult.templates.length > 0));
			});
			return cb(error, result);
		});
	}
	
	return {
		'getInfra': getInfra
	};
}]);
