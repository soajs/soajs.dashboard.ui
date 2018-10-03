"use strict";
var platformCloudProviderServices = soajsApp.components;
platformCloudProviderServices.service('platformCloudProvider', ['ngDataApi', '$timeout', '$modal', '$cookies', '$window', '$localStorage', function (ngDataApi, $timeout, $modal, $cookies, $window, $localStorage) {

	function go(currentScope, operation){
	
	}
	
	return {
		'go': go
	}
}]);