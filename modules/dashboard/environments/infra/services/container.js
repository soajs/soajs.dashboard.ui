"use strict";
var platformContainerServices = soajsApp.components;
platformContainerServices.service('platformCntnr', ['ngDataApi', '$timeout', '$modal', '$cookies', '$window', '$localStorage', function (ngDataApi, $timeout, $modal, $cookies, $window, $localStorage) {
	
	/*****************************************************
	 * Attach Container Technology
	 *****************************************************/
	function openContainerWizard(currentScope){
		
		currentScope.selectProvider = function(oneProvider, technology){
			
			//remove previous environment if set
			delete currentScope.previousEnvironment;
			if(currentScope.form && currentScope.form.formData && currentScope.form.formData.previousEnvironment){
				delete currentScope.form.formData.previousEnvironment;
			}
			renderPreviousDeployInfo(currentScope);
			
			//reset all infra records
			currentScope.infraProviders.forEach((oneInfra) => {
				delete oneInfra.deploy;
			});
			
			//set the one selected
			oneProvider.deploy = {
				technology: technology
			};
		};
		
		currentScope.changeLikeEnv = function () {
			currentScope.previousEnvironment = currentScope.form.formData.previousEnvironment;
			renderPreviousDeployInfo(currentScope);
		};
		
		currentScope.switchDriver = function (driver) {
			if (!currentScope.platforms) {
				currentScope.platforms = {
					docker: false,
					kubernetes: false,
					previous: false
				};
			}
			
			switch (driver) {
				case 'previous':
					if (currentScope.form && currentScope.form.formData && currentScope.form.formData && currentScope.form.formData.previousEnvironment) {
						currentScope.changeLikeEnv();
					}
					currentScope.platforms.previous = true;
					currentScope.platforms.docker = false;
					currentScope.platforms.kubernetes = false;
					break;
				case 'docker':
					delete currentScope.previousEnvironment;
					currentScope.platforms.previous = false;
					currentScope.platforms.docker = true;
					currentScope.platforms.kubernetes = false;
					break;
				case 'kubernetes':
					delete currentScope.previousEnvironment;
					currentScope.platforms.previous = false;
					currentScope.platforms.docker = false;
					currentScope.platforms.kubernetes = true;
					break;
			}
		};
		
		currentScope.dockerImagePath = "./themes/" + themeToUse + "/img/docker_logo.png";
		
		currentScope.kubernetesImagePath = "./themes/" + themeToUse + "/img/kubernetes_logo.png";
		
		let configuration = angular.copy(environmentsConfig.form.add.deploy.entries);
		let options = {
			timeout: $timeout,
			entries: configuration,
			name: 'attachContainer',
			label: translation.addNewEnvironment[LANG],
			actions: [
				{
					'type': 'button',
					'label': "Cancel",
					'btn': 'danger',
					'action': function () {
						delete currentScope.form;
						currentScope.environment.type = 'manual';
						delete currentScope.attach;
					}
				}
			]
		};
		overlayLoading.show();
		buildForm(currentScope, $modal, options, function () {
			
			getEnvironments(currentScope, () => {
				listInfraProviders(currentScope, () => {
					overlayLoading.hide();
					currentScope.form.actions.unshift({
						'type': 'submit',
						'label': "Attach Container",
						'btn': 'primary',
						'action': function (formData) {
							
							let postData = {};
							
							if (currentScope.platforms.previous) {
								if (formData.previousEnvironment === '') {
									$window.alert("Select the environment your want to clone its infrastructure settings to proceed!");
									return false;
								}
								
								postData.deployment = {
									'selectedDriver': currentScope.platform,
									'previousEnvironment': currentScope.previousEnvironment
								};
								
								//link the infra that was used for this environment
								currentScope.infraProviders.forEach((oneProvider) => {
									oneProvider.deployments.forEach((oneDeployment) => {
										if(oneDeployment.environments.indexOf(currentScope.previousEnvironment) !== -1){
											postData.selectedInfraProvider = {
												_id: oneProvider._id,
												name: oneProvider.name
											};
										}
									});
								});
							}
							else if(currentScope.platforms.docker){
								delete formData.previousEnvironment;
								
								postData.deployment = {
									'selectedDriver': 'docker'
								};
								
								//link the infra that was used for this environment
								currentScope.infraProviders.forEach((oneProvider) => {
									if(oneProvider.deploy){
										postData.selectedInfraProvider = {
											_id: oneProvider._id,
											name: oneProvider.name
										};
									}
								});
							}
							else if(currentScope.platforms.kubernetes){
								delete formData.previousEnvironment;
								postData.deployment = {
									'selectedDriver': 'kubernetes'
								};
								
								//link the infra that was used for this environment
								currentScope.infraProviders.forEach((oneProvider) => {
									if(oneProvider.deploy){
										postData.selectedInfraProvider = {
											_id: oneProvider._id,
											name: oneProvider.name
										};
									}
								});
								
							}
							else{
								delete formData.previousEnvironment;
								// wair nikna !
								$window.alert("Invalid Configuration Provided, unable to proceed!");
								return false;
							}
							
							postData.selectedInfraProvider.deploy = {
								technology: postData.deployment.selectedDriver
							};
							
							overlayLoading.show();
							getSendDataFromServer(currentScope, ngDataApi, {
								"method": "post",
								"routeName": "/dashboard/environment/platforms/attach",
								"params": {
									"env": currentScope.envCode
								},
								"data": {
									"data": postData
								}
							}, function (error) {
								overlayLoading.hide();
								if (error) {
									currentScope.displayAlert('danger', error.code, true, 'dashboard', error.message);
								}
								else {
									currentScope.displayAlert('success', "Container Technology attached to environment successfully, changes will appear soon.");
									currentScope.environment.pending = true;
									getEnvRecord(currentScope);
								}
							});
						}
					});
				});
			});
			
		});
	}
	
	/**
	 * list environments and return only the containerized development
	 * @param currentScope
	 * @param cb
	 */
	function getEnvironments(currentScope, cb) {
		//get the available providers
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/environment/list"
		}, function (error, environments) {
			if(error){
				overlayLoading.hide();
				currentScope.$parent.displayAlert('danger', error.message);
			}
			else {
				delete environments.soajsauth;
				
				currentScope.availableEnvironments = environments;
				if (currentScope.availableEnvironments.length > 0) {
					for (let i = currentScope.availableEnvironments.length - 1; i >= 0; i--) {
						if(currentScope.availableEnvironments[i].restriction){
							currentScope.availableEnvironments.splice(i, 1);
						}
						if (currentScope.availableEnvironments[i].deployer.type === 'manual') {
							currentScope.availableEnvironments.splice(i, 1);
						}
					}
				}
				
				return cb(environments);
			}
		});
	}
	
	/**
	 * list providers that support container technology only
	 * @param currentScope
	 * @param cb
	 */
	function listInfraProviders(currentScope, cb) {
		currentScope.showDocker = false;
		currentScope.showKube = false;
		
		//get the available providers
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/infra",
			"params":{
				"type": 'technology'
			}
		}, function (error, providers) {
			if (error) {
				overlayLoading.hide();
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.infraProviders = providers;
				delete currentScope.infraProviders.soajsauth;
				
				currentScope.infraProviders.forEach((oneProvider) => {
					if(oneProvider.technologies.indexOf('docker') !== -1){
						currentScope.showDocker = true;
					}
					
					if(oneProvider.technologies.indexOf('kubernetes') !== -1){
						currentScope.showKube = true;
					}
					
					let technolog = oneProvider.technologies[0];
					oneProvider.image = "themes/" + themeToUse + "/img/" + technolog + "_logo.png";
				});
				return cb();
			}
		});
	}
	
	/**
	 * fix display settings when switching between previous environments
	 * @param currentScope
	 */
	function renderPreviousDeployInfo(currentScope) {
		delete currentScope.platform;
		delete currentScope.driver;
		delete currentScope.config;
		if(currentScope.previousEnvironment && currentScope.previousEnvironment !== ''){
			currentScope.previousPlatformDeployment = true;
			for (let i = currentScope.availableEnvironments.length - 1; i >= 0; i--) {
				if (currentScope.availableEnvironments[i].code === currentScope.previousEnvironment) {
					currentScope.platform = currentScope.availableEnvironments[i].deployer.selected.split(".")[1];
					currentScope.driver = currentScope.availableEnvironments[i].deployer.selected.split(".")[2];
					currentScope.config = currentScope.availableEnvironments[i].deployer.container[currentScope.platform][currentScope.driver];
				}
			}
		}
		else{
			currentScope.previousPlatformDeployment = false;
		}
	}
	
	/**
	 * Detach container technology
	 */
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
							currentScope.switchManual(currentScope);
							
						}
					});

				};

				$scope.cancel = function(){
					$modalInstance.close();
				};
			}
		});
	}
	
	/*****************************************************
	 * Other Operations
	 *****************************************************/
	
	/**
	 * list environments and update the scope, localstorage and cookies for this environment only
	 * @param currentScope
	 */
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
				if(!response.deployer.pending && !response.deployer.error){
					currentScope.environment = response.deployer;
					
					//update env type
					currentScope.calculateType(response.deployer);
					
					//udpate display
					if(currentScope.attach){
						checkContainerTechnology(currentScope);
						delete currentScope.attach;
					}
					
					//update cookies
					putMyEnv(angular.copy(response));
					
					//update local storage
					for(let i = 0; i < $localStorage.environments.length; i++){
						if($localStorage.environments[i].code === response.code){
							$localStorage.environments[i] = angular.copy(response);
						}
					}
				}
				else {
					let autoRefreshTimeoutProgress = $timeout(() => {
						if(!environment.pending){
							currentScope.environment = angular.copy(environment);
							$timeout.cancel(autoRefreshTimeoutProgress);
						}
						else{
							getEnvRecord(currentScope);
						}
					}, 10 * 1000);
				}
			}
		});

		function putMyEnv(record) {
			let data = {
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
				console.log('hi')
				currentScope.switchEnvironment(data);
				currentScope.rebuildMenus(function(){});
			}, 200);
		}
	}
	
	/**
	 * Update the namespace configuration when technology is kubernetes
	 * @param currentScope
	 * @param driver
	 */
	function updateNamespaceConfig(currentScope, driver) {
		var currentConfig = angular.copy(currentScope.config);
		var modal = $modal.open({
			templateUrl: "updateNamespaceConfig.tmpl",
			backdrop: true,
			keyboard: true,
			controller: function ($scope) {
				fixBackDrop();
				
				$scope.title = 'Update Namespace Configuration';
				
				$scope.namespaces = {
					ui: {
						selection: [
							{ value: 'existing', label: 'Choose Existing Namespace' },
							{ value: 'new', label: 'Create New Namespace' }
						],
						list: [],
						type: [
							{ value: 'global', label: 'Global' },
							{ value: 'perService', label: 'Per Service' }
						]
					},
					data: {
						selection: 'existing',
						default: currentConfig.namespace.default,
						type: (currentConfig.namespace.perService) ? 'perService' : 'global'
					}
				};
				
				$scope.reset = function () {
					if ($scope.namespaces.data.selection === 'new') {
						$scope.namespaces.data.default = '';
					}
					else {
						$scope.namespaces.data.default = currentConfig.namespace.default;
					}
				};
				
				$scope.listNamespaces = function () {
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'get',
						routeName: '/dashboard/cloud/namespaces/list',
						params: {
							env : currentScope.envCode.toLowerCase()
						}
					}, function (error, namespaces) {
						if (error) {
							$scope.message = {
								danger: error.message
							};
							setTimeout(function () {
								$scope.message.danger = '';
							}, 5000);
						}
						else {
							namespaces.forEach(function (oneNamespace) {
								$scope.namespaces.ui.list.push({ value: oneNamespace.id, label: oneNamespace.name });
							});
						}
					});
				};
				
				$scope.onSubmit = function () {
					var newConfig = {
						namespace: {
							default: $scope.namespaces.data.default,
							perService: (($scope.namespaces.data.type === 'perService') ? true : false)
						}
					};
					getSendDataFromServer(currentScope, ngDataApi, {
						method: 'put',
						routeName: '/dashboard/environment/platforms/deployer/update',
						params: {
							env: currentScope.envCode.toLowerCase()
						},
						data: {
							driver: driver,
							config: newConfig
						}
					}, function (error, result) {
						if (error) {
							$scope.message = {
								danger: error.message
							};
							setTimeout(function () {
								$scope.message.danger = '';
							}, 5000);
						}
						else {
							$scope.closeModal();
							currentScope.displayAlert('success', 'Namespace configuration updated successfully');
							currentScope.getEnvPlatform();
						}
					});
				};
				
				$scope.closeModal = function () {
					$scope.namespaces.data = {};
					$scope.driver = {};
					modal.close();
				};
				
				$scope.listNamespaces();
			}
		});
	}
	
	/**
	 * render the display if the environment is a containerized development and print what it is already using
	 * @param currentScope
	 */
	function checkContainerTechnology(currentScope) {
		
		currentScope.platform = currentScope.environment.selected.split(".")[1];
		currentScope.driver = currentScope.environment.selected.split(".")[2];
		currentScope.config = currentScope.environment.container[currentScope.platform][currentScope.driver];
		
		if (currentScope.originalEnvironment.certs) {
			let certs = [];
			currentScope.originalEnvironment.certs.forEach((oneCert) => {
				if (oneCert.metadata.env[currentScope.envCode.toUpperCase()]) {
					certs.push({
						_id: oneCert._id,
						filename: oneCert.filename,
						certType: oneCert.metadata.certType
					});
				}
			});
			currentScope.config.certs = certs;
		}
		
		currentScope.oldDocker = (!currentScope.config.auth && !currentScope.config.auth.token && currentScope.config.certs && currentScope.config.certs.length > 0);
	}
	
	/**
	 * main entry point for this angular service
	 * @param currentScope
	 * @param operation
	 */
	function go(currentScope, operation){
		
		currentScope.renderDisplay = function(){
			checkContainerTechnology(currentScope);
		};
		
		currentScope.updateNamespaceConfig = function (driver) {
			updateNamespaceConfig(currentScope, driver);
		};
		
		currentScope.attachContainer = function(){
			openContainerWizard(currentScope);
		};
		
		currentScope.detachContainer = function(){
			detachContainerTechnology(currentScope);
		};
		
		currentScope[operation]();
	}
	
	return {
		'go': go,
		'checkContainerTechnology': checkContainerTechnology
	}
}]);
