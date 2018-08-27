"use strict";
var awsInfraCertificateSrv = soajsApp.components;
awsInfraCertificateSrv.service('awsInfraCertificateSrv', ['ngDataApi', '$localStorage', '$timeout', '$modal', function (ngDataApi, $localStorage, $timeout, $modal) {

	let infraCertificateConfig = {
		form: {
			addCertificate: [
                {
                    'name': 'name',
                    'label': 'Certificate Name',
                    'type': 'text',
                    'value': '',
                    'required': true,
                    'fieldMsg': 'Enter the name of the new certificate',
                    'placeholder': "myCertificate"
                },
                {
                    'name': 'region',
                    'label': 'Region',
                    'type': 'text',
                    'value': '',
                    'required': true,
                    'disabled': true,
                    'fieldMsg': 'Enter the region for the certificate'
                },
                {
                    'name': 'domain',
                    'label': 'Main Domain',
                    'type': 'text',
                    'value': '',
                    'required': true,
                    'fieldMsg': 'Enter the main domain name for this certificate',
                    'placeholder': "mydomain.com"
                },
                {
                    'name': 'alternativeDomains',
                    'label': 'Alternative Domains',
                    'type': 'text',
                    'value': '',
                    'required': false,
                    'fieldMsg': 'Enter the main domain name for this certificate',
                    'placeholder': "dev.mydomain.com, dev-api.mydomain.com"
                },
                {
                    'name': 'validationMethod',
                    'label': 'Validation Method',
                    'type': 'select',
                    'value': [
                        { v: 'dns', 'l': 'DNS', selected: true },
                        { v: 'email', 'l': 'Email' }
                    ],
                    'required': true,
                    'fieldMsg': 'Select the validation method for this certificate'
                }
			],

            importCertificate: [
                {
                    'name': 'name',
                    'label': 'Certificate Name',
                    'type': 'text',
                    'value': '',
                    'required': true,
                    'fieldMsg': 'Enter the name of the new certificate',
                    'placeholder': "myCertificate"
                },
                {
                    'name': 'region',
                    'label': 'Region',
                    'type': 'text',
                    'value': '',
                    'required': true,
                    'disabled': true,
                    'fieldMsg': 'Enter the region for the certificate'
                },
                {
                    'name': 'certificate',
                    'label': 'Certificate Body',
                    'type': 'textarea',
                    'value': '',
                    'required': true,
                    "rows": 5,
                    'fieldMsg': 'Enter the certificate body'
                },
                {
                    'name': 'privateKey',
                    'label': 'Certificate Private Key',
                    'type': 'textarea',
                    'value': '',
                    'required': true,
                    "rows": 5,
                    'fieldMsg': 'Enter the certificate private key'
                },
                {
                    'name': 'chain',
                    'label': 'Certificate Chain',
                    'type': 'textarea',
                    'value': '',
                    'required': false,
                    "rows": 5,
                    'fieldMsg': 'Enter the certificate chain'
                }
			]
		}
	};

	function addCertificate(currentScope, action, existingCertificate) {
        let formEntries = {};
        if(action === 'request') {
            formEntries = angular.copy(infraCertificateConfig.form.addCertificate);
        }
        else if(action === 'import') {
            formEntries = angular.copy(infraCertificateConfig.form.importCertificate);
        }
		else if(action === 'renew') {
            formEntries = angular.copy(infraCertificateConfig.form.importCertificate);
			let nameField = formEntries.find((oneEntry) => { return oneEntry.name === 'name'; });
			nameField.value = existingCertificate.name;
			nameField.required = false;
			nameField.hidden = true;
        }

		let options = {
			timeout: $timeout,
			form: {
				"entries": formEntries
			},
			name: 'addCertificate',
			label: `${action.charAt(0).toUpperCase()}${action.substring(1)} Certificate`,
			actions: [
				{
					'type': 'submit',
					'label': `${action.charAt(0).toUpperCase()}${action.substring(1)}`,
					'btn': 'primary',
					'action': function (formData) {
						let data = angular.copy(formData);

						let postOpts = {
							"method": "post",
							"routeName": "/dashboard/infra/extras",
							"params": {
								"infraId": currentScope.currentSelectedInfra._id,
								"technology": "vm"
							},
							"data": {
								"params": {
									"section": "certificate",
                                    "action": action,
									"region": currentScope.selectedRegion,
									"name": data.name,
                                    "labels": {}
								}
							}
						};

                        if(action === 'request') {
                            postOpts.data.params.domain = formData.domain;
                            postOpts.data.params.alternativeDomains = formData.alternativeDomains.split(',').map(oneDomain => oneDomain.trim());
                            postOpts.data.params.validationMethod = formData.validationMethod;
                        }
                        else if(['import', 'renew'].includes(action)) {
                            postOpts.data.params.certificate = formData.certificate;
                            postOpts.data.params.privateKey = formData.privateKey;
                            postOpts.data.params.chain = formData.chain;

							if(action === 'renew') {
								postOpts.data.params.id = existingCertificate.id;
							}
                        }

						overlayLoading.show();
						getSendDataFromServer(currentScope, ngDataApi, postOpts, function (error, response) {
							overlayLoading.hide();
							if (error) {
								currentScope.form.displayAlert('danger', error.message);
							}
							else {
								currentScope.modalInstance.close();
								$timeout(() => {
									listCertificates(currentScope, currentScope.selectedRegion);
								}, 2000);
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': 'Cancel',
					'btn': 'danger',
					'action': function () {
						delete currentScope.form.formData;
						currentScope.modalInstance.close();
					}
				}
			]
		};

		//set value of region to selectedRegion
		options.form.entries[1].value = currentScope.selectedRegion;

		buildFormWithModal(currentScope, $modal, options);
	}

	function deleteCertificate(currentScope, oneCertificate) {
		let deleteCertificateOpts = {
			method: 'delete',
			routeName: '/dashboard/infra/extras',
			params: {
				'infraId': currentScope.$parent.$parent.currentSelectedInfra._id,
				'technology': 'vm',
				'section': 'certificate',
				'region': currentScope.selectedRegion,
				'id': oneCertificate.id
			}
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, deleteCertificateOpts, (error, response) => {
			overlayLoading.hide();
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error);
			}
			else {
				overlayLoading.hide();
				currentScope.displayAlert('success', `The certificate has been successfully deleted. Changes take a bit of time to be populated and might require you refresh in the list after a few seconds.`);
				$timeout(() => {
					listCertificates(currentScope, currentScope.selectedRegion);
				}, 2000);
			}
		});
	}

	function listCertificates(currentScope, oneRegion) {
		let oneInfra = currentScope.$parent.$parent.currentSelectedInfra;

		//save selected region in scope to be accessed by other functions
		currentScope.selectedRegion = oneRegion;

		let listOptions = {
			method: 'get',
			routeName: '/dashboard/infra/extras',
			params: {
				'id': oneInfra._id,
				'region': oneRegion,
				'extras[]': ['certificates']
			}
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, listOptions, (error, response) => {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error);
			}
			else {
				currentScope.infraCertificates = [];
				if (response.certificates && response.certificates.length > 0) {
                    let currentTime = new Date().getTime();
                    response.certificates.forEach((oneCertificate) => {
                        if(oneCertificate && oneCertificate.details && oneCertificate.details.status && oneCertificate.details.status === 'active') {
							if(oneCertificate.details.validFrom && oneCertificate.details.validTo) {
								oneCertificate.ui = {};
								oneCertificate.ui.remainingDays = Math.floor((Date.parse(oneCertificate.details.validTo) - new Date().getTime()) / (60 * 60 * 24 * 1000));

								if(oneCertificate.ui.remainingDays >= 30) {
									oneCertificate.ui.remainingDaysColor = 'green';
									oneCertificate.ui.remainingDaysIcon = 'checkmark';
								}
								else if(oneCertificate.ui.remainingDays >= 10) {
									oneCertificate.ui.remainingDaysColor = 'yellow';
									oneCertificate.ui.remainingDaysIcon = 'warning';
								}
								else {
									oneCertificate.ui.remainingDaysColor = 'red';
									oneCertificate.ui.remainingDaysIcon = 'warning';
								}
							}
                        }

						currentScope.infraCertificates.push(oneCertificate);
                    });
				}
			}
		});
	}

	function downloadDnsConfig(currentScope, oneCertificate) {
		if(oneCertificate && oneCertificate.dnsConfig && Array.isArray(oneCertificate.dnsConfig) && oneCertificate.dnsConfig.length > 0) {
			let output = 'Domain Name,Record Name,Record Type,Record Value\r\n';
			oneCertificate.dnsConfig.forEach((oneConfig) => {
				output += `${oneConfig.domain},${oneConfig.name},${oneConfig.type},${oneConfig.value}\r\n`;
			});

			openSaveAsDialog(`dns_config.csv`, output, 'text/csv');
		}
	}

	return {
		'addCertificate': addCertificate,
		'deleteCertificate': deleteCertificate,
		'listCertificates': listCertificates,
		'downloadDnsConfig': downloadDnsConfig
	};
}]);
