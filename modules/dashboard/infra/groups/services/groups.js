"use strict";
var infraGroupSrv = soajsApp.components;
infraGroupSrv.service('infraGroupSrv', ['ngDataApi', '$timeout', '$modal', '$window', '$cookies', 'Upload', function (ngDataApi, $timeout, $modal, $window, $cookies, Upload) {
	
	function addGroup(currentScope, oneInfra) {}
	
	function editGroup(currentScope, oneInfra, oneGroup) {}
	
	return {
		'addGroup': addGroup,
		'editGroup': editGroup
	};
}]);
