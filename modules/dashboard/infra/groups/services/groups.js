"use strict";
var infraGroupSrv = soajsApp.components;
infraGroupSrv.service('infraGroupSrv', ['azureInfraGroupSrv', function (azureInfraGroupSrv) {

	function addGroup(currentScope) {
		let infraName = currentScope.currentInfraName;

		switch(infraName){
			case 'azure':
				azureInfraGroupSrv.addGroup(currentScope);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	function editGroup(currentScope, oneGroup) {
		let infraName = currentScope.currentInfraName;

		switch(infraName){
			case 'azure':
				azureInfraGroupSrv.editGroup(currentScope, oneGroup);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	function deleteGroup(currentScope, oneGroup) {
		let infraName = currentScope.currentInfraName;

		switch(infraName){
			case 'azure':
				azureInfraGroupSrv.deleteGroup(currentScope, oneGroup);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	function listGroups(currentScope, oneRegion) {
		let infraName = currentScope.currentInfraName;

		switch(infraName){
			case 'azure':
				azureInfraGroupSrv.listGroups(currentScope, oneRegion);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	return {
		'addGroup': addGroup,
		'editGroup': editGroup,
		'deleteGroup': deleteGroup,
		'listGroups': listGroups
	};
}]);
