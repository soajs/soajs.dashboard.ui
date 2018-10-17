"use strict";
var platformContainerServices = soajsApp.components;
platformContainerServices.service('platformCntnr', ['ngDataApi', '$timeout', '$modal', '$cookies', '$window', '$localStorage', function (ngDataApi, $timeout, $modal, $cookies, $window, $localStorage) {
	
	/*****************************************************
	 * Attach Container Technology
	 *****************************************************/
	
	/**
	 * Open container technology form
	 * @param currentScope
	 */
	function openContainerWizard(currentScope, cb){
		
		let options = {
			timeout: $timeout,
			entries: [],
			name: 'attachContainer',
			label: translation.addNewEnvironment[LANG],
			actions: [
				{
					'type': 'button',
					'label': "Cancel",
					'btn': 'danger',
					'action': function () {
						delete currentScope.containers.form;
						currentScope.environment.type = 'manual';
						delete currentScope.attach;
					}
				}
			]
		};
		overlayLoading.show();
		
		buildForm(currentScope.containers, $modal, options, function () {
			
			getEnvironments(currentScope, () => {
				listInfraProviders(currentScope, () => {
					overlayLoading.hide();
					currentScope.containers.form.actions.unshift({
						'type': 'submit',
						'label': "Attach Container",
						'btn': 'primary',
						'action': function (formData) {
							
							attachContainerTechnology(currentScope, formData);
						}
					});
					
					if(cb && typeof cb === 'function'){
						return cb();
					}
				});
			});
			
		});
	}
	
	/**
	 * Attach Container Technology
	 * @param currentScope
	 * @param formData
	 * @returns {boolean}
	 */
	function attachContainerTechnology(currentScope, formData){
		let postData = {};
		
		if (currentScope.containers.platforms && currentScope.containers.platforms.previous) {
			if (currentScope.containers.form.formData.previousEnvironment === '') {
				$window.alert("Select the environment your want to clone its infrastructure settings to proceed!");
				return false;
			}
			
			if(currentScope.wizard){
				postData.deployment = {
					// 'selectedDriver': currentScope.containers.platform,
					'previousEnvironment': currentScope.containers.form.formData.previousEnvironment
				};
				postData.selectedInfraProvider = {
					_id: currentScope.containers.form.formData.selectedProvider._id,
					name: currentScope.containers.form.formData.selectedProvider.name,
					label: currentScope.containers.form.formData.selectedProvider.label
				};
				currentScope.containers.form.formData.selectedProvider.deployments.forEach((oneDeployment) => {
					if(oneDeployment.environments.includes(currentScope.containers.form.formData.previousEnvironment.toUpperCase())){
						postData.deployment.selectedDriver = oneDeployment.technology;
					}
				});
			}
			else{
				postData.deployment = {
					'selectedDriver': currentScope.containers.platform,
					'previousEnvironment': currentScope.containers.previousEnvironment
				};
				
				//link the infra that was used for this environment
				currentScope.containers.techProviders.forEach((oneProvider) => {
					oneProvider.deployments.forEach((oneDeployment) => {
						if(oneDeployment.environments.indexOf(currentScope.containers.previousEnvironment) !== -1){
							postData.selectedInfraProvider = {
								_id: oneProvider._id,
								name: oneProvider.name,
								label: oneProvider.label
							};
						}
					});
				});
			}
		}
		else if(currentScope.containers.platforms && currentScope.containers.platforms.docker){
			delete currentScope.containers.form.previousEnvironment;
			
			postData.deployment = {
				'selectedDriver': 'docker'
			};
			
			//link the infra that was used for this environment
			currentScope.containers.techProviders.forEach((oneProvider) => {
				if(oneProvider.deploy){
					postData.selectedInfraProvider = {
						_id: oneProvider._id,
						name: oneProvider.name,
						label: oneProvider.label
					};
				}
			});
		}
		else if(currentScope.containers.platforms && currentScope.containers.platforms.kubernetes){
			delete currentScope.containers.form.previousEnvironment;
			postData.deployment = {
				'selectedDriver': 'kubernetes'
			};
			
			//link the infra that was used for this environment
			currentScope.containers.techProviders.forEach((oneProvider) => {
				if(oneProvider.deploy){
					postData.selectedInfraProvider = {
						_id: oneProvider._id,
						name: oneProvider.name,
						label: oneProvider.label
					};
				}
			});
			
		}
		else{
			delete currentScope.containers.form.previousEnvironment;
			// wair nikna !
			$window.alert("Invalid Configuration Provided, unable to proceed!");
			return false;
		}
		
		postData.selectedInfraProvider.deploy = {
			technology: postData.deployment.selectedDriver
		};
		
		currentScope.containers.techProviders.forEach((oneProvider) => {
			if(oneProvider.deploy) {
				for(let i in oneProvider.deploy){
					postData.selectedInfraProvider.deploy[i] = oneProvider.deploy[i];
				}
			}
		});
		
		currentScope.containers.defaultAttachContainerAction(currentScope, postData);
	}
	
	function defaultAttachContainerAction(currentScope, formData){
		
		let postData = angular.copy(formData);
		delete postData.selectedInfraProvider.deploy.config;
		
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
	
	/**
	 * list environments and return only the containerized development
	 * @param currentScope
	 * @param cb
	 */
	function getEnvironments(currentScope, cb) {
		if(currentScope.wizard && currentScope.availableEnvironments && Array.isArray(currentScope.availableEnvironments) && currentScope.availableEnvironments.length > 0){
			filterEnvironments(angular.copy(currentScope.availableEnvironments));
		}
		else{
			//get the available providers
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/environment/list"
			}, function (error, environments) {
				if (error) {
					overlayLoading.hide();
					currentScope.$parent.displayAlert('danger', error.message);
				}
				else {
					delete environments.soajsauth;
					filterEnvironments(environments);
				}
			});
		}
		
		function filterEnvironments(environments){
			if(currentScope.cloud && currentScope.cloud.form && currentScope.cloud.form.formData && currentScope.cloud.form.formData.selectedProvider){
				for(let i = environments.length -1; i >=0; i--){
					if(environments[i].code.toUpperCase() === currentScope.envCode.toUpperCase()){
						environments.splice(i, 1);
					}
					else if(!environments[i].restriction){
						environments.splice(i, 1);
					}
					else if(environments[i].restriction && !environments[i].restriction[currentScope.cloud.form.formData.selectedProvider._id]){
						environments.splice(i, 1);
					}
				}
				
				currentScope.containers.availableEnvironments = environments;
				if (currentScope.containers.availableEnvironments.length > 0) {
					for (let i = currentScope.containers.availableEnvironments.length - 1; i >= 0; i--) {
						if (currentScope.containers.availableEnvironments[i].deployer.type === 'manual') {
							currentScope.containers.availableEnvironments.splice(i, 1);
						}
					}
				}
			}
			else{
				currentScope.containers.availableEnvironments = environments;
				if (currentScope.containers.availableEnvironments.length > 0) {
					for (let i = currentScope.containers.availableEnvironments.length - 1; i >= 0; i--) {
						if(currentScope.containers.availableEnvironments[i].restriction){
							currentScope.containers.availableEnvironments.splice(i, 1);
						}
						else if (currentScope.containers.availableEnvironments[i].deployer.type === 'manual') {
							currentScope.containers.availableEnvironments.splice(i, 1);
						}
					}
				}
			}
			
			if(currentScope.wizard){
				currentScope.availableEnvironments = angular.copy(currentScope.containers.availableEnvironments);
			}
			return cb(environments);
		}
	}
	
	/**
	 * list providers that support container technology only
	 * @param currentScope
	 * @param cb
	 */
	function listInfraProviders(currentScope, cb) {
		currentScope.containers.showDocker = false;
		currentScope.containers.showKube = false;
		
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
				currentScope.containers.techProviders = providers;
				delete currentScope.containers.techProviders.soajsauth;
				
				currentScope.containers.techProviders.forEach((oneProvider) => {
					if(oneProvider.technologies.indexOf('docker') !== -1){
						currentScope.containers.showDocker = true;
					}
					
					if(oneProvider.technologies.indexOf('kubernetes') !== -1){
						currentScope.containers.showKube = true;
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
		delete currentScope.containers.platform;
		delete currentScope.containers.driver;
		delete currentScope.containers.config;
		if(currentScope.containers.previousEnvironment && currentScope.containers.previousEnvironment !== ''){
			currentScope.containers.previousPlatformDeployment = true;
			
			if(currentScope.containers.availableEnvironments){
				for (let i = currentScope.containers.availableEnvironments.length - 1; i >= 0; i--) {
					if (currentScope.containers.availableEnvironments[i].code === currentScope.containers.previousEnvironment) {
						currentScope.containers.platform = currentScope.containers.availableEnvironments[i].deployer.selected.split(".")[1];
						currentScope.containers.driver = currentScope.containers.availableEnvironments[i].deployer.selected.split(".")[2];
						currentScope.containers.config = currentScope.containers.availableEnvironments[i].deployer.container[currentScope.containers.platform][currentScope.containers.driver];
					}
				}
			}
		}
		else{
			currentScope.containers.previousPlatformDeployment = false;
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
				
				if(currentScope.cloud && currentScope.cloud.selectProvider){
					$scope.selectedProvider = angular.copy(currentScope.cloud.selectedProvider);
				}

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
							delete currentScope.containers;
							currentScope.displayAlert('success', "Container Technology has been detached from this environment.");
							getEnvRecord(currentScope);
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
						if(!currentScope.environment.pending){
							currentScope.getEnvPlatform(true);
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

			overlayLoading.show();
			currentScope.updateParentScope('currentSelectedEnvironment', record.code.toLowerCase());
			currentScope.updateParentScope('currentDeployer', {"type": record.deployer.type});
			$timeout(() => {
				currentScope.$parent.$parent.rebuildMenus(() => {
					overlayLoading.hide();
				});
			}, 500);
		}
	}
	
	/**
	 * Update the namespace configuration when technology is kubernetes
	 * @param currentScope
	 * @param driver
	 */
	function updateNamespaceConfig(currentScope, driver) {
		var currentConfig = angular.copy(currentScope.containers.config);
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
		
		currentScope.containers.platform = currentScope.environment.selected.split(".")[1];
		currentScope.containers.driver = currentScope.environment.selected.split(".")[2];
		currentScope.containers.config = currentScope.environment.container[currentScope.containers.platform][currentScope.containers.driver];
		
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
			currentScope.containers.config.certs = certs;
		}
		
		currentScope.containers.oldDocker = (!currentScope.containers.config.auth && !currentScope.containers.config.auth.token && currentScope.containers.config.certs && currentScope.containers.config.certs.length > 0);
	}
	
	/**
	 * main entry point for this angular service, mainly used to bind new functionality to the scope and extend it
	 * @param currentScope
	 * @param operation
	 */
	function go(currentScope, operation, cb){
		
		if(!currentScope.containers){
			currentScope.containers = currentScope.$new(); //true means detached from main currentScope
		}
		
		currentScope.containers.selectProvider = function(oneProvider, technology){
			
			//remove previous environment if set
			delete currentScope.containers.previousEnvironment;
			if(currentScope.containers.form && currentScope.containers.form.formData && currentScope.containers.form.formData.previousEnvironment){
				delete currentScope.containers.form.formData.previousEnvironment;
			}
			renderPreviousDeployInfo(currentScope);
			
			//reset all infra records
			currentScope.containers.techProviders.forEach((oneInfra) => {
				delete oneInfra.deploy;
			});
			
			//set the one selected
			oneProvider.deploy = {
				technology: technology,
				config: oneProvider.api
			};
		};
		
		currentScope.containers.changeLikeEnv = function () {
			currentScope.containers.previousEnvironment = currentScope.containers.form.formData.previousEnvironment;
			renderPreviousDeployInfo(currentScope);
		};
		
		currentScope.containers.switchDriver = function (driver) {
			if (!currentScope.containers.platforms) {
				currentScope.containers.platforms = {
					docker: false,
					kubernetes: false,
					previous: false
				};
			}
			
			switch (driver) {
				case 'previous':
					if (currentScope.containers.form && currentScope.containers.form.formData && currentScope.containers.form.formData && currentScope.containers.form.formData.previousEnvironment) {
						currentScope.containers.changeLikeEnv();
					}
					currentScope.containers.platforms.previous = true;
					currentScope.containers.platforms.docker = false;
					currentScope.containers.platforms.kubernetes = false;
					break;
				case 'docker':
					delete currentScope.containers.previousEnvironment;
					currentScope.containers.platforms.previous = false;
					currentScope.containers.platforms.docker = true;
					currentScope.containers.platforms.kubernetes = false;
					break;
				case 'kubernetes':
					delete currentScope.containers.previousEnvironment;
					currentScope.containers.platforms.previous = false;
					currentScope.containers.platforms.docker = false;
					currentScope.containers.platforms.kubernetes = true;
					break;
			}
		};
		
		currentScope.containers.dockerImagePath = "./themes/" + themeToUse + "/img/docker_logo.png";
		
		currentScope.containers.kubernetesImagePath = "./themes/" + themeToUse + "/img/kubernetes_logo.png";
		
		currentScope.containers.renderDisplay = function(){
			checkContainerTechnology(currentScope);
		};
		
		currentScope.containers.updateNamespaceConfig = function (driver) {
			updateNamespaceConfig(currentScope, driver);
		};
		
		currentScope.containers.attachContainer = function(cb){
			openContainerWizard(currentScope, cb);
		};
		
		currentScope.containers.detachContainer = function(){
			detachContainerTechnology(currentScope);
		};
		
		currentScope.containers.attachContainerTechnology = function(formData) {
			attachContainerTechnology(currentScope, formData);
		};
		
		currentScope.containers.defaultAttachContainerAction = defaultAttachContainerAction;
		
		currentScope.containers.getEnvironments = function(cb) {
			getEnvironments(currentScope, cb);
		};
		
		if(operation){
			currentScope.containers[operation](cb);
		}
	}
	
	return {
		'go': go,
		'checkContainerTechnology': checkContainerTechnology,
		'detachContainerTechnology': detachContainerTechnology
	}
}]);
