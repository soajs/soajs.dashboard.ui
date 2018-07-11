"use strict";
var infraIPSrv = soajsApp.components;
infraIPSrv.service('infraIPSrv', ['ngDataApi', '$timeout', '$modal', '$window', '$cookies', 'Upload', function (ngDataApi, $timeout, $modal, $window, $cookies, Upload) {
	
	function addIP(currentScope, oneInfra) {}
	
	function editIP(currentScope, oneInfra, oneIP) {}
	
	return {
		'addIP': addIP,
		'editIP': editIP
	};
}]);
