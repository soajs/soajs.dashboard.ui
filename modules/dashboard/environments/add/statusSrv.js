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

		if(!currentScope.previousEnvironment && currentScope.wizard.deployment && currentScope.wizard.deployment.previousEnvironment){
			currentScope.previousEnvironment = currentScope.wizard.deployment.previousEnvironment;
		}

		if (currentScope.previousEnvironment) {
			opts = {
				"previousEnvironment": currentScope.previousEnvironment,
			};
		}
		else {
			opts = selectedInfraProvider.deploy;
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

	function mapVMInfra(currentScope, oneVMLayer){

		let providerName;
		currentScope.infraProviders.forEach((oneProvider) => {
			if(oneProvider._id === oneVMLayer.params.infraId){
				providerName = oneProvider.name;
			}
		});

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

	function listInfraProviders(currentScope, cb) {
		//get the available providers
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/infra",
			"params":{
				"exclude": [ "groups", "regions", "templates" ]
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

	function go(currentScope){

		// if(!currentScope.infraProviders){
			listInfraProviders(currentScope, () => {
				resumeDeployment();
			});
		// }
		// else{
		// 	resumeDeployment();
		// }

		function resumeDeployment(){
			if(currentScope.wizard.selectedInfraProvider){
				let deployments = currentScope.wizard.template.deploy;

				if(!deployments.deployments){
					currentScope.wizard.template.deploy.deployments = {};
					deployments = currentScope.wizard.template.deploy.deployments;
				}

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
			if(currentScope.wizard.vms){
				let deployments = currentScope.wizard.template.deploy;

				if(!deployments.deployments){
					currentScope.wizard.template.deploy.deployments = {};
				}

				if (!deployments.deployments.pre) {
					currentScope.wizard.template.deploy.deployments.pre = {};
				}

				//backwards so they work upwards!
				for(let i = currentScope.wizard.vms.length -1; i >=0; i--){
					let oneVMLayer = currentScope.wizard.vms[i];
					let vmInfra = mapVMInfra(currentScope, oneVMLayer);
					currentScope.wizard.template.deploy.deployments.pre = insertObjFirst(currentScope.wizard.template.deploy.deployments.pre, 'infra.vms.deploy.' + i, vmInfra);
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
