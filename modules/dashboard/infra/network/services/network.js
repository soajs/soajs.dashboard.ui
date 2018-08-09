"use strict";
var infraNetworkSrv = soajsApp.components;
infraNetworkSrv.service('infraNetworkSrv', ['azureInfraNetworkSrv', 'awsInfraNetworkSrv', 'infraCommonSrv', function (azureInfraNetworkSrv, awsInfraNetworkSrv, infraCommonSrv) {

	function addNetwork(currentScope) {
		let infraName = infraCommonSrv.getInfraDriverName(currentScope);

		switch(infraName){
			case 'azure':
				azureInfraNetworkSrv.addNetwork(currentScope);
				break;
			case 'aws':
				awsInfraNetworkSrv.addNetwork(currentScope);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	function editNetwork(currentScope, originalNetwork) {
		let infraName = infraCommonSrv.getInfraDriverName(currentScope);

		switch(infraName){
			case 'azure':
				azureInfraNetworkSrv.editNetwork(currentScope, originalNetwork);
				break;
			case 'aws':
				awsInfraNetworkSrv.editNetwork(currentScope, originalNetwork);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	function deleteNetwork(currentScope, oneNetwork) {
		let infraName = infraCommonSrv.getInfraDriverName(currentScope);

		switch(infraName){
			case 'azure':
				azureInfraNetworkSrv.deleteNetwork(currentScope, oneNetwork);
				break;
			case 'aws':
				awsInfraNetworkSrv.deleteNetwork(currentScope, oneNetwork);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	function listNetworks(currentScope, oneGroup, oneRegion) {
		let infraName = infraCommonSrv.getInfraDriverName(currentScope);

		switch(infraName){
			case 'azure':
				azureInfraNetworkSrv.listNetworks(currentScope, oneGroup);
				break;
			case 'aws':
				awsInfraNetworkSrv.listNetworks(currentScope, oneRegion);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	return {
		'addNetwork': addNetwork,
		'editNetwork': editNetwork,
		'deleteNetwork': deleteNetwork,
		'listNetworks': listNetworks
	};
}]);
