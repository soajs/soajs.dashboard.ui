"use strict";
var platformContainerServices = soajsApp.components;
platformContainerServices.service('platformCntnr', ['ngDataApi', '$timeout', '$modal', '$cookies', '$window', 'deploymentSrv', '$localStorage', function (ngDataApi, $timeout, $modal, $cookies, $window, deploymentSrv, $localStorage) {

	function openContainerWizard(currentScope){
		delete $localStorage.envType;

		currentScope.wizard = {
			gi: {
				code: currentScope.envCode
			},
			template: {
				content: null
			}
		};
		delete currentScope.platforms;
		delete currentScope.previousEnvironment;
		currentScope.mapStorageToWizard = function(){};
		// currentScope.envType = '';
		deploymentSrv.go(currentScope, () => {
			let options = {
				timeout: $timeout,
				entries: [],
				name: 'attachContainer',
				label: '',
				actions: [
					{
						'type': 'submit',
						'label': "Submit",
						'btn': 'primary',
						'action': function (formData) {
							deploymentSrv.handleFormData(currentScope, formData);
							let postedData = angular.copy(currentScope.wizard);
							delete postedData.template;

							getSendDataFromServer(currentScope, ngDataApi, {
								"method": "post",
								"routeName": "/dashboard/environment/platforms/attach",
								"params": {
									"env": postedData.gi.code
								},
								"data": {
									"data": postedData
								}
							}, function (error) {
								if (error) {
									currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
								}
								else {
									currentScope.displayAlert('success', "Container Technology attached to environment successfully, changes will appear soon.");
									delete currentScope.wizard;
									currentScope.currentDeployer.type = 'container';
									currentScope.containerWizard = false;
									getEnvRecord(currentScope);
									$timeout(() => {
										checkAttachContainerProgress(currentScope, true);
									}, 1000);
								}
							});
						}
					},
					{
						'type': 'reset',
						'label': translation.cancel[LANG],
						'btn': 'danger',
						'action': function () {
							delete currentScope.wizard;
							currentScope.form.formData = {};
							currentScope.containerWizard = false;
						}
					}
				]
			};
			buildForm(currentScope, null, options);
		});
	}

	function detachContainerTechnology(currentScope) {
		$modal.open({
			templateUrl: "detachContainerTechnology.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				fixBackDrop();

				$scope.proceed = function(){
					overlayLoading.show();
					getSendDataFromServer(currentScope, ngDataApi, {
						"method": "delete",
						"routeName": "/dashboard/environment/platforms/detach",
						"params": {
							"env": currentScope.envCode
						}
					}, function (error) {
						overlayLoading.hide();
						if (error) {
							currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
						}
						else {
							$modalInstance.close();
							currentScope.currentDeployer.type = 'manual';
							currentScope.displayAlert('success', "Container Technology has been detached from this environment.");
							getEnvRecord(currentScope);
							$timeout(() => {
								checkAttachContainerProgress(currentScope);
							}, 1000);
						}
					});

				};

				$scope.cancel = function(){
					$modalInstance.close();
				};
			}
		});
	}

	function checkAttachContainerProgress(currentScope, autoRefresh){
		currentScope.getEnvPlatform(true);

		if(autoRefresh){
			let autoRefreshTimeoutProgress = $timeout(() => {
				if(!currentScope.environment.pending){
					$timeout.cancel(autoRefreshTimeoutProgress);
					getEnvRecord(currentScope);
				}
				else{
					checkAttachContainerProgress(currentScope, autoRefresh);
				}
			}, 10 * 1000);
		}
	}

	function getEnvRecord(currentScope) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment",
			"params": {
				"code": currentScope.envCode
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
			}
			else {
				putMyEnv(response);
			}
		});

		function putMyEnv(record) {
			var data = {
				"_id": record._id,
				"code": record.code,
				"sensitive": record.sensitive,
				"domain": record.domain,
				"profile": record.profile,
				"sitePrefix": record.sitePrefix,
				"apiPrefix": record.apiPrefix,
				"description": record.description,
				"deployer": record.deployer,
				"pending": record.pending,
				"error": record.error
			};
			for(let container in data.deployer.container){
				for(let driver in data.deployer.container[container]){
					if(data.deployer.container[container][driver].auth && data.deployer.container[container][driver].auth.token){
						delete data.deployer.container[container][driver].auth.token;
					}
				}
			}
			$cookies.putObject('myEnv', data, { 'domain': interfaceDomain });

			$timeout(() => {
				currentScope.switchEnvironment(data);
				currentScope.rebuildMenus(function(){});
			}, 100);
		}
	}

	return {
		'openContainerWizard': openContainerWizard,
		'detachContainerTechnology': detachContainerTechnology,
		'checkAttachContainerProgress': checkAttachContainerProgress
	}
}]);
