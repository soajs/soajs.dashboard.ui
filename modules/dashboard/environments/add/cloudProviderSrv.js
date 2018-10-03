"use strict";
var cloudProviderServices = soajsApp.components;
cloudProviderServices.service('cloudProviderSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', function (ngDataApi, $timeout, $modal, $localStorage, $window) {
	
	function go(currentScope){
		
		console.log("select and configure cloud provider")
		currentScope.next();
	}
	
	return {
		"go": go
	}
}]);