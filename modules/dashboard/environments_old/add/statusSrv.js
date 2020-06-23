"use strict";
var statusServices = soajsApp.components;
statusServices.service('statusSrv', ['statusAPISrv', 'ngDataApi', function (statusAPISrv, ngDataApi) {

	function mapInfraDnsOnPost(currentScope) {
		let selectedInfraProvider = currentScope.wizard.selectedInfraProvider;
		let providerName = selectedInfraProvider.name;

		let getDNSInfo = {
			"type": "infra",
			"name": providerName,
			"command": "getDNSInfo"
		};

		let output = {
			imfv: []
		};

		output.imfv.push(getDNSInfo);
		return output;

	}

	function mapInfraClusterOnPre(currentScope) {

		let selectedInfraProvider = currentScope.wizard.selectedInfraProvider;
		let providerName = selectedInfraProvider.name;

		let opts;

		if (!currentScope.previousEnvironment && currentScope.wizard.deployment && currentScope.wizard.deployment.previousEnvironment) {
			currentScope.previousEnvironment = currentScope.wizard.deployment.previousEnvironment;
		}

		if (currentScope.previousEnvironment) {
			opts = {
				"previousEnvironment": currentScope.previousEnvironment,
			};
		}
		else {
			opts = selectedInfraProvider.deploy;
			delete opts.config;
		}

		opts.envCode = currentScope.wizard.gi.code;

		let deployCluster = {
			"type": "infra",
			"name": providerName,
			"command": "deployCluster",
			"options": opts
		};

		let getDeployClusterStatus = {
			"type": "infra",
			"name": providerName,
			"command": "getDeployClusterStatus",
			"options": {
				"envCode": currentScope.wizard.gi.code.toUpperCase()
			}
		};

		if (currentScope.previousEnvironment) {
			getDeployClusterStatus.options.previousEnvironment = currentScope.previousEnvironment;
		}

		let output = {
			imfv: [],
		};

		output.imfv.push(deployCluster);
		output.imfv.push(getDeployClusterStatus);

		return output;
	}

	function mapVMInfra(currentScope, oneVMLayer) {
		
		let providerName = currentScope.cloud.selectedProvider.name;
		
		let opts = oneVMLayer;
		opts.params.env = currentScope.wizard.gi.code;

		let deployCluster = {
			"type": "infra",
			"name": providerName,
			"command": "deployVM",
			"options": opts
		};
		deployCluster.options.params.layerName = opts.data.name;

		let getDeployClusterStatus = {
			"type": "infra",
			"name": providerName,
			"command": "getDeployVMStatus",
			"options": {
				"params": opts.params
			}
		};
		getDeployClusterStatus.options.params.layerName = opts.data.name;

		let output = {
			imfv: [],
		};

		output.imfv.push(deployCluster);
		output.imfv.push(getDeployClusterStatus);

		return output;
	}

	function mapVMOnboard(currentScope, oneVMLayer) {
		
		let providerName = currentScope.cloud.selectedProvider.name;
		
		let opts = oneVMLayer;
		opts.params.env = currentScope.wizard.gi.code;

		let onboardVm = {
			"type": "infra",
			"name": providerName,
			"command": "onboardVM",
			"options": opts
		};
		onboardVm.options.params.layerName = opts.data.name;

		let output = {
			imfv: []
		};

		output.imfv.push(onboardVm);
		return output;
	}

	function listInfraProviders(currentScope, cb) {
		//get the available providers
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/infra",
			"params": {
				"exclude": ["groups", "regions", "templates"]
			}
		}, function (error, providers) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.infraProviders = providers;
				return cb();
			}
		});
	}

	function go(currentScope) {
		currentScope.currentStep = 'status';
		
		listInfraProviders(currentScope, () => {
			resumeDeployment();
		});
		
		function resumeDeployment() {
			if (currentScope.wizard.selectedInfraProvider) {
				let deployments = currentScope.wizard.template.deploy;

				if (!deployments.deployments) {
					currentScope.wizard.template.deploy.deployments = {};
				}
				deployments = currentScope.wizard.template.deploy.deployments;

				if (!deployments.pre) {
					currentScope.wizard.template.deploy.deployments.pre = {};
				}

				let infraCluster = mapInfraClusterOnPre(currentScope);
				currentScope.wizard.template.deploy.deployments.pre = insertObjFirst(currentScope.wizard.template.deploy.deployments.pre, 'infra.cluster.deploy', infraCluster);

				//if deployment has nginx, add dns
				if (currentScope.wizard.selectedInfraProvider.name !== 'local' && currentScope.wizard.nginx && Object.keys(currentScope.wizard.nginx).length > 0 && currentScope.wizard.nginx.domain !== '' && currentScope.wizard.nginx.apiPrefix !== '' && currentScope.wizard.nginx.sitePrefix !== '') {
					if (!deployments.post) {
						currentScope.wizard.template.deploy.deployments.post = {};
					}
					currentScope.wizard.template.deploy.deployments.post['infra.dns'] = mapInfraDnsOnPost(currentScope);
				}
			}

			//check for vms to create
			if (currentScope.wizard.vms) {
				let deployments = currentScope.wizard.template.deploy;

				if (!deployments.deployments) {
					currentScope.wizard.template.deploy.deployments = {};
				}

				if (!deployments.deployments.pre) {
					currentScope.wizard.template.deploy.deployments.pre = {};
				}

				//backwards so they work upwards!
				for (let i = currentScope.wizard.vms.length - 1; i >= 0; i--) {
					let oneVMLayer = currentScope.wizard.vms[i];
					let vmInfra = mapVMInfra(currentScope, oneVMLayer);
					currentScope.wizard.template.deploy.deployments.pre = insertObjFirst(currentScope.wizard.template.deploy.deployments.pre, 'infra.vms.deploy.' + i, vmInfra);
				}
			}

			// if VMs to onboard
			if (currentScope.wizard.vmOnBoard) {
				if (!currentScope.wizard.template.deploy.deployments) {
					currentScope.wizard.template.deploy.deployments = {};
				}

				if (!currentScope.wizard.template.deploy.deployments.pre) {
					currentScope.wizard.template.deploy.deployments.pre = {};
				}
				// Add VMs to onboard
				for (let i = currentScope.wizard.vmOnBoard.length - 1; i >= 0; i--) {
					let oneVmOnboardLayer = mapVMOnboard(currentScope, currentScope.wizard.vmOnBoard[i]);
					currentScope.wizard.template.deploy.deployments.pre = insertObjFirst(currentScope.wizard.template.deploy.deployments.pre, 'infra.vms.onboard.' + i, oneVmOnboardLayer);
				}
			}

			currentScope.overview = currentScope.mapUserInputsToOverview(false);

			delete currentScope.overview.selectedInfraProvider;

			statusAPISrv.go(currentScope);
		}
	}

	return {
		"go": go
	}

}]);
