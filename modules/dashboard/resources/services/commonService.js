"use strict";
var commonService = soajsApp.components;
commonService.service('commonService', ['ngDataApi', function (ngDataApi) {

	function listResourcesApi($scope, apiParams, cb) {
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			method: 'get',
			routeName: '/dashboard/resources',
			params: apiParams
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.displayAlert('danger', error.message);
			}
			else {
			    return cb(response);
			}
		});
	}

	function deleteResourceApi($scope, apiParams, cb) {
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'delete',
            routeName: '/dashboard/resources',
            params: apiParams
        }, function (error) {
            overlayLoading.hide();
            if (error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
               return cb();
            }
        });
	}

    function togglePlugResourceApi ($scope, apiParams, cb) {
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'put',
            routeName: '/dashboard/resources/update',
            params: {
                id: apiParams.resourceId,
                env: $scope.context.envCode.toUpperCase(),
            },
            data: { resource: apiParams.resourceRecord }
        }, function (error) {
            overlayLoading.hide();
            if (error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
            	return cb();
            }
        });
    }

    function addEditResourceApi($scope, apiParams, cb) {

		let id = 'new';
	    if ($scope.options.formAction !== 'add') { // on edit
	    	id = apiParams.id;
	    }

	    var options = {
		    method: 'post',
		    routeName: `/dashboard/resources/`,
		    params: {
		    	id: id
		    },
		    data: {
			    env: apiParams.envCode,             // add/edit resource    + deploy + rebuild
			    resource: apiParams.saveOptions,    // add/edit resource    + cicd
                deployType : apiParams.deployType,  // deploy / rebuild
			    config: {                           // cicd
				    deploy: apiParams.canBeDeployed || false,
				    options: apiParams.options
			    }
		    }
	    };
		if (apiParams.vms && apiParams.vms.length > 0){
			options.data.vms = apiParams.vms;
		}
	    if(apiParams.deployType === 'saveAndDeploy'){
	    	options.data["recipe"] = apiParams.deployOptions.recipe;
	    	options.data["custom"] = apiParams.deployOptions.custom;

	    }
	    if(apiParams.deployType === 'saveAndRebuild'){
		    options.data["recipe"] = apiParams.recipe;
	    	options.data["serviceId"] = apiParams.serviceId;
	    	options.data["mode"] = apiParams.mode;
	    	options.data["action"] = "rebuild";
	    	options.data["custom"] = apiParams.rebuildOptions;
	    }

        overlayLoading.show();
	    getSendDataFromServer($scope, ngDataApi, options, function (error, result) {
            overlayLoading.hide();
	        if (error) {
			    $scope.displayAlert('danger', error.message);
		    }
		    else {
			    return cb(result);
		    }
	    });
    }

    function getCatalogRecipes ($scope, apiParams, cb) {
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'get',
            routeName: '/dashboard/catalog/recipes/list'
        }, function (error, recipes) {
            overlayLoading.hide();
            if (error) {
                $scope.displayAlert('danger', error.message);
            }
            return cb(recipes);
        });
    }

    function getSecrets ($scope, apiParams, cb) {
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'get',
            routeName: '/dashboard/secrets/list',
            params: apiParams
        }, function (error, secrets) {
            overlayLoading.hide();
            if (error) {
                $scope.displayAlert('danger', error.message);
            }
            return cb(secrets);
        });
    }

    function fetchBranches ($scope, apiParams, cb) {
        getSendDataFromServer($scope, ngDataApi, {
            'method': 'get',
            'routeName': '/dashboard/gitAccounts/getBranches',
            params: {
                id: apiParams.accountId,
                name: apiParams.name,
                type: apiParams.type,
                provider: apiParams.provider
            }
        }, function (error, response) {
            if (error) {
                $scope.mainData.configReposBranchesStatus[apiParams.name] = 'failed';
                $scope.displayAlert('danger', error.message);
            } else {
                return cb(response);
            }
        })
    }

    function listAccounts ($scope, apiParams, cb) {
        getSendDataFromServer($scope, ngDataApi, {
            'method': 'get',
            'routeName': '/dashboard/gitAccounts/accounts/list',
            'params': apiParams
        }, function (error, response) {
            if (error) {
                $scope.displayAlert('danger', error.message);
            }else {
                return cb(response)
            }
        });
    }

    function getEnvs ($scope, apiParams, cb) {
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'get',
            routeName: '/dashboard/environment/list'
        }, function (error, envs) {
            overlayLoading.hide();
            if (error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
                return cb(envs);
            }
        });
    }

    function getInfraProviders ($scope, apiParams, cb) {
		if($scope.context && $scope.context.envDeployer && $scope.context.envDeployer.restriction){
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/infra",
				"params":{
					"exclude": ["templates", "regions", "groups"],
					"id": Object.keys($scope.context.envDeployer.restriction)[0]
				}
			}, function (error, cloudProvider) {
				if (error) {
					$scope.displayAlert('danger', error.message);
				}
				else {
					return cb(cloudProvider)
				}
			});
		}
        else{
			return cb({});
		}
    }
    
    function getInfraProvidersAndVMLayers($scope, envCode, oneProvider, cb){
	    let allVMs = {};
	    if(oneProvider.technologies.includes('vm') && $scope.context && $scope.context.envDeployer && $scope.context.envDeployer.restriction) {
		    overlayLoading.show();
		    getSendDataFromServer($scope, ngDataApi, {
			    "method": "get",
			    "routeName": "/dashboard/cloud/vm/list",
			    "params": {
				    "infraId": oneProvider._id,
				    "env": envCode
			    }
		    }, function (error, providerVMs) {
			    overlayLoading.hide();
			    if (error) {
				    $scope.displayAlert('danger', error.message);
			    }
			    else {
				    delete providerVMs.soajsauth;
				
				    //aggregate response and generate layers from list returned
				    if (providerVMs[oneProvider.name] && Array.isArray(providerVMs[oneProvider.name]) && providerVMs[oneProvider.name].length > 0) {
					
					    providerVMs[oneProvider.name].forEach((oneVM) => {
						    //aggregate and populate groups
						    //add infra to group details
						    if (!allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer]) {
							    let vmTemplate = angular.copy(oneVM.template);
							    delete oneVM.template;
							    if (envCode) {
								    if (oneVM.labels && oneVM.labels['soajs.env.code'] && oneVM.labels['soajs.env.code'] === envCode) {
									    if (allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer]) {
										    allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer].list.push(oneVM);
									    }
									    else {
										    allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer] = {
											    name: oneVM.layer,
											    infraProvider: oneProvider,
											    executeCommand: true,
											    list: [oneVM],
											    template: vmTemplate
										    };
									    }
									
								    }
								    else {
									    if (vmTemplate === undefined || !vmTemplate) {
										    if (oneVM.labels && !oneVM.labels['soajs.env.code']) {
											    if (allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer]) {
												    allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer].list.push(oneVM)
											    }
											    else {
												    allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer] = {
													    name: oneVM.layer,
													    infraProvider: oneProvider,
													    executeCommand: true,
													    list: [oneVM]
												    }
											    }
										    }
									    }
								    }
							    }
							    else {
								    if (allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer]) {
									    allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer].list.push(oneVM);
								    }
								    else {
									    allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer] = {
										    name: oneVM.layer,
										    infraProvider: oneProvider,
										    executeCommand: true,
										    list: [oneVM],
										    template: vmTemplate
									    };
								    }
							    }
						    }
						    else {
							    if (envCode) {
								    if (oneVM.labels && oneVM.labels['soajs.env.code'] && oneVM.labels['soajs.env.code'] === envCode) {
									    delete oneVM.template;
									    allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer].list.push(oneVM);
								    }
							    }
							    else {
								    delete oneVM.template;
								    allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer].list.push(oneVM);
							    }
						    }
						
						    if (Object.hasOwnProperty.call(oneVM, 'executeCommand') && allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer]) {
							    //ensure to only update the value of this property if it is true. setting it to false will prevent the user from:
							    // - on boarding and deploying in it
							    if (allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer].executeCommand === true) {
								    allVMs[oneProvider.name + "_" + oneVM.network + "_" + oneVM.layer].executeCommand = oneVM.executeCommand;
							    }
						    }
					    });
				    }
				
				    return cb(allVMs);
			    }
		    });
	    }
	    else{
	    	return cb(allVMs);
	    }
    }

    function deployResource ($scope, apiParams, cb) {
        overlayLoading.show();
        getSendDataFromServer($scope, ngDataApi, {
            method: 'post',
            routeName: '/dashboard/cloud/services/soajs/deploy',
            data: apiParams.deployOptions
        }, function (error) {
            overlayLoading.hide();
            if (error) {
                $scope.displayAlert('danger', error.message);
            }
            else {
                return cb();
            }
        });
    }

	return {
		listResourcesApi,
        deleteResourceApi,
        togglePlugResourceApi,
		addEditResourceApi,
        getCatalogRecipes,
        getSecrets,
        fetchBranches,
        listAccounts,
        getEnvs,
        getInfraProviders,
		getInfraProvidersAndVMLayers,
        deployResource
	};

}]);
