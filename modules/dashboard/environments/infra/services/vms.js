"use strict";
var vmsServices = soajsApp.components;
vmsServices.service('platformsVM', ['ngDataApi', '$timeout', '$modal', '$cookies', function (ngDataApi, $timeout, $modal, $cookies) {
	
	function listVMs(currentScope) {
		
		//call common function
		getInfraProvidersAndVMLayers(currentScope, ngDataApi, currentScope.envCode, currentScope.infraProviders, (vmLayers) => {
			
			console.log(vmLayers);
		});
	}
	
	return {
		'listVMs': listVMs
	}
}]);
