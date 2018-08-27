"use strict";

var infraCertificateSrv = soajsApp.components;
infraCertificateSrv.service('infraCertificateSrv', ['awsInfraCertificateSrv', function (awsInfraCertificateSrv) {

	function addCertificate(currentScope, action, existingCertificate) {
		let infraName = currentScope.currentInfraName;

		switch(infraName){
			case 'aws':
				awsInfraCertificateSrv.addCertificate(currentScope, action, existingCertificate);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	function deleteCertificate(currentScope, oneCertificate) {
		let infraName = currentScope.currentInfraName;

		switch(infraName){
			case 'aws':
				awsInfraCertificateSrv.deleteCertificate(currentScope, oneCertificate);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	function downloadDnsConfig(currentScope, oneCertificate) {
		let infraName = currentScope.currentInfraName;

		switch(infraName){
			case 'aws':
				awsInfraCertificateSrv.downloadDnsConfig(currentScope, oneCertificate);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	function listCertificates(currentScope, oneGroupOrRegion) {
		let infraName = currentScope.currentInfraName;

		switch(infraName){
			case 'aws':
				awsInfraCertificateSrv.listCertificates(currentScope, oneGroupOrRegion);
				break;
			default:
				currentScope.displayAlert('danger', "Invalid or Unknown Infra Provider Requested: " + infraName);
				break;
		}
	}

	return {
		'addCertificate': addCertificate,
		'deleteCertificate': deleteCertificate,
		'listCertificates': listCertificates,
		'downloadDnsConfig': downloadDnsConfig
	};
}]);
