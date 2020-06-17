"use strict";
var platformsServices = soajsApp.components;
platformsServices.service('envPlatforms', ['platformManual', 'platformCntnr',  function (platformManual, platformCntnr) {
	
	function go(currentScope) {
		currentScope.originalEnvironment = angular.copy(currentScope.environment);
		
		currentScope.switchManual = platformManual.go;
		
		currentScope.switchContainer = platformCntnr.go;
		
		// currentScope.switchCloud = platformCloudProvider.go;
		
		switch (currentScope.environment.type) {
			case 'container':
				platformCntnr.go(currentScope, 'renderDisplay');
				platformCntnr.checkContainerTechnology(currentScope);
				break;
			// case 'singleInfra':
			// 	platformCloudProvider.go(currentScope, 'printProvider');
			// 	break;
			case 'manual':
			default:
				platformManual.go(currentScope);
				break;
		}
	}
	
	return {
		'go': go
	}
}]);
