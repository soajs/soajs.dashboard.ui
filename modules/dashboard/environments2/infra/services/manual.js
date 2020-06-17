"use strict";
var platformManualServices = soajsApp.components;
platformManualServices.service('platformManual', [ function () {

	function go(currentScope){
		
		// currentScope.attachContainerTechnology = function(){
		// 	currentScope.environment.type = 'container';
		// 	currentScope.attach = true;
		// 	platformCntnr.go(currentScope, 'attachContainer');
		// };
		//
		// currentScope.selectCloudProvider = function(){
		// 	currentScope.environment.type = 'singleInfra';
		// 	platformCloudProvider.go(currentScope, 'selectProvider');
		// };
	}
	
	return {
		'go': go
	}
}]);