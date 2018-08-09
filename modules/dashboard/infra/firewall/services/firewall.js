"use strict";
var infraFirewallSrv = soajsApp.components;
infraFirewallSrv.service('infraFirewallSrv', ['azureInfraFirewallSrv', 'awsInfraFirewallSrv', 'infraCommonSrv', function (azureInfraFirewallSrv, awsInfraFirewallSrv, infraCommonSrv) {

	function addFirewall(currentScope) {
		let infraName = infraCommonSrv.getInfraDriverName(currentScope);

		switch(infraName){
			case 'azure':
				azureInfraFirewallSrv.addFirewall(currentScope);
				break;
			case 'aws':
				awsInfraFirewallSrv.addFirewall(currentScope);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	function editFirewall(currentScope, originalFirewall) {
		let infraName = infraCommonSrv.getInfraDriverName(currentScope);

		switch(infraName){
			case 'azure':
				azureInfraFirewallSrv.editFirewall(currentScope, originalFirewall);
				break;
			case 'aws':
				awsInfraFirewallSrv.editFirewall(currentScope, originalFirewall);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	function deleteFirewall(currentScope, oneFirewall) {
		let infraName = infraCommonSrv.getInfraDriverName(currentScope);

		switch(infraName){
			case 'azure':
				azureInfraFirewallSrv.deleteFirewall(currentScope, oneFirewall);
				break;
			case 'aws':
				awsInfraFirewallSrv.deleteFirewall(currentScope, oneFirewall);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	function listFirewalls(currentScope, oneGroup) {
		let infraName = infraCommonSrv.getInfraDriverName(currentScope);

		switch(infraName){
			case 'azure':
				azureInfraFirewallSrv.listFirewalls(currentScope, oneGroup);
				break;
			case 'aws':
				awsInfraFirewallSrv.listFirewalls(currentScope, oneGroup);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	return {
		'addFirewall': addFirewall,
		'editFirewall': editFirewall,
		'deleteFirewall': deleteFirewall,
		'listFirewalls': listFirewalls
	};
}]);
