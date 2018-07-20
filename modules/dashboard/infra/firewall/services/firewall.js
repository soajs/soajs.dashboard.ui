"use strict";
var infraFirewallSrv = soajsApp.components;
infraFirewallSrv.service('infraFirewallSrv', ['azureInfraFirewallSrv', function (azureInfraFirewallSrv) {
	
	function addFirewall(currentScope) {
		let infraName = currentScope.currentInfraName;
		
		switch(infraName){
			case 'azure':
				azureInfraFirewallSrv.addFirewall(currentScope);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}
	
	function editFirewall(currentScope, originalFirewall) {
		let infraName = currentScope.currentInfraName;
		
		switch(infraName){
			case 'azure':
				azureInfraFirewallSrv.editFirewall(currentScope, originalFirewall);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}
	
	function deleteFirewall(currentScope, oneFirewall) {
		let infraName = currentScope.currentInfraName;
		
		switch(infraName){
			case 'azure':
				azureInfraFirewallSrv.deleteFirewall(currentScope, oneFirewall);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}
	
	function listFirewalls(currentScope, oneGroup) {
		let infraName = currentScope.currentInfraName;
		
		switch(infraName){
			case 'azure':
				azureInfraFirewallSrv.listFirewalls(currentScope, oneGroup);
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
