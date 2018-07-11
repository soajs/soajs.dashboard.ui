"use strict";
var infraFirewallSrv = soajsApp.components;
infraFirewallSrv.service('infraFirewallSrv', ['ngDataApi', '$timeout', '$modal', '$window', '$cookies', 'Upload', function (ngDataApi, $timeout, $modal, $window, $cookies, Upload) {
	
	function addFirewall(currentScope, oneInfra) {}
	
	function editFirewall(currentScope, oneInfra, oneFirewall) {}
	
	return {
		'addFirewall': addFirewall,
		'editFirewall': editFirewall
	};
}]);
