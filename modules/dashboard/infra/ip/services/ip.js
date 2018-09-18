"use strict";

var infraIPSrv = soajsApp.components;
infraIPSrv.service('infraIPSrv', ['azureInfraIPSrv', 'awsInfraIPSrv', function (azureInfraIPSrv, awsInfraIPSrv) {

	function addIP(currentScope) {
		let infraName = currentScope.currentInfraName;

		switch(infraName){
			case 'azure':
				azureInfraIPSrv.addIP(currentScope);
				break;
			case 'aws':
				awsInfraIPSrv.addIP(currentScope);
				break;
			default:
				break;
		}
	}

	function editIP(currentScope, originalIP) {
		let infraName = currentScope.currentInfraName;

		switch(infraName){
			case 'azure':
				azureInfraIPSrv.editIP(currentScope, originalIP);
				break;
			case 'aws':
				awsInfraIPSrv.editIP(currentScope, originalIP);
				break;
			default:
				break;
		}
	}

	function deleteIP(currentScope, oneIP) {
		let infraName = currentScope.currentInfraName;

		switch(infraName){
			case 'azure':
				azureInfraIPSrv.deleteIP(currentScope, oneIP);
				break;
			case 'aws':
				awsInfraIPSrv.deleteIP(currentScope, oneIP);
				break;
			default:
				break;
		}
	}

	function listIPs(currentScope, oneGroup) {
		let infraName = currentScope.currentInfraName;

		switch(infraName){
			case 'azure':
				azureInfraIPSrv.listIPs(currentScope, oneGroup);
				break;
			case 'aws':
				awsInfraIPSrv.listIPs(currentScope, oneGroup);
				break;
			default:
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
