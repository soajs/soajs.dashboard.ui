"use strict";

var infraIPSrv = soajsApp.components;
infraIPSrv.service('infraIPSrv', ['azureInfraIPSrv', function (azureInfraIPSrv) {

	function addIP(currentScope) {
		let infraName = currentScope.currentInfraName;
		
		switch(infraName){
			case 'azure':
				azureInfraIPSrv.addIP(currentScope);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}
	
	function editIP(currentScope, originalIP) {
		let infraName = currentScope.currentInfraName;
		
		switch(infraName){
			case 'azure':
				azureInfraIPSrv.editIP(currentScope, originalIP);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	function deleteIP(currentScope, oneIP) {
		let infraName = currentScope.currentInfraName;
		
		switch(infraName){
			case 'azure':
				azureInfraIPSrv.deleteIP(currentScope, oneIP);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	function listIPs(currentScope, oneGroup) {
		let infraName = currentScope.currentInfraName;
		
		switch(infraName){
			case 'azure':
				azureInfraIPSrv.listIPs(currentScope, oneGroup);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	return {
		'addIP': addIP,
		'editIP': editIP,
		'deleteIP': deleteIP,
		'listIPs': listIPs
	};
}]);
