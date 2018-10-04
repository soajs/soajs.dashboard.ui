"use strict";
var infraNetworkSrv = soajsApp.components;
infraNetworkSrv.service('infraNetworkSrv', ['azureInfraNetworkSrv', 'awsInfraNetworkSrv', 'googleInfraNetworkSrv', 'infraCommonSrv', function (azureInfraNetworkSrv, awsInfraNetworkSrv, googleInfraNetworkSrv, infraCommonSrv) {

	function addNetwork(currentScope) {
		let infraName = infraCommonSrv.getInfraDriverName(currentScope);

		switch(infraName){
			case 'azure':
				azureInfraNetworkSrv.addNetwork(currentScope);
				break;
			case 'aws':
				awsInfraNetworkSrv.addNetwork(currentScope);
				break;
            case 'google':
                googleInfraNetworkSrv.addNetwork(currentScope);
                break;
			default:
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
			case 'google':
                googleInfraNetworkSrv.deleteNetwork(currentScope, oneNetwork);
                break;
			default:
				break;
		}
	}

    function listNetworks(currentScope, oneGroup) {
        let infraName = infraCommonSrv.getInfraDriverName(currentScope);
        switch (infraName) {
            case 'azure':
                azureInfraNetworkSrv.listNetworks(currentScope, oneGroup);
                break;
            case 'aws':
                awsInfraNetworkSrv.listNetworks(currentScope, oneGroup);
                break;
            case 'google':
                googleInfraNetworkSrv.listNetworks(currentScope);
                break;
            default:
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
