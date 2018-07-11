"use strict";
var infraNetworkSrv = soajsApp.components;
infraNetworkSrv.service('infraNetworkSrv', ['ngDataApi', '$timeout', '$modal', '$window', '$cookies', 'Upload', function (ngDataApi, $timeout, $modal, $window, $cookies, Upload) {
	
	function addNetwork(currentScope, oneInfra) {}
	
	function editNetwork(currentScope, oneInfra, oneNetwork) {}
	
	return {
		'addNetwork': addNetwork,
		'editNetwork': editNetwork
	};
}]);
