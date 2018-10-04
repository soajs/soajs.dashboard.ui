"use strict";
var platformsServices = soajsApp.components;
platformsServices.service('envPlatforms', ['platformManual', 'platformCntnr', 'platformsVM', function (platformManual, platformCntnr, platformsVM) {
	
	function go(currentScope) {
		currentScope.originalEnvironment = angular.copy(currentScope.environment);
		
		currentScope.switchManual = platformManual.go;
		
		currentScope.switchContainer = platformCntnr.go;
		
		switch (currentScope.environment.type) {
			case 'container':
				platformCntnr.checkContainerTechnology(currentScope);
				platformCntnr.go(currentScope, 'renderDisplay');
				break;
			case 'singleInfra':
				platformCntnr.checkContainerTechnology(currentScope);
				platformCntnr.go(currentScope, 'renderDisplay');
				platformsVM.go(currentScope, 'renderDisplay');
				break;
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
