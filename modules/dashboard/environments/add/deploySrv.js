"use strict";
var deployServices = soajsApp.components;
deployServices.service('deploymentSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', function (ngDataApi, $timeout, $modal, $localStorage, $window) {
	
	let mainScope; // set on go
	
	function switchDriver(driver) {
		if (!mainScope.platforms) {
			mainScope.platforms = {
				manual: true,
				docker: false,
				kubernetes: false,
				previous: false
			};
		}
		
		switch (driver) {
			case 'previous':
				if (mainScope.form.formData.deployment.previousEnvironment) {
					mainScope.changeLikeEnv();
				}
				mainScope.platforms.previous = true;
				mainScope.platforms.docker = false;
				mainScope.platforms.kubernetes = false;
				mainScope.platforms.manual = false;
				mainScope.allowLocalContainerDeployment = getDashboardDeploymentStyle();
				break;
			case 'docker':
				delete mainScope.previousEnvironment;
				mainScope.platforms.previous = false;
				mainScope.platforms.docker = true;
				mainScope.platforms.kubernetes = false;
				mainScope.platforms.manual = false;
				mainScope.allowLocalContainerDeployment = getDashboardDeploymentStyle();
				break;
			case 'kubernetes':
				delete mainScope.previousEnvironment;
				mainScope.platforms.previous = false;
				mainScope.platforms.kubernetes = true;
				mainScope.platforms.docker = false;
				mainScope.platforms.manual = false;
				mainScope.allowLocalContainerDeployment = getDashboardDeploymentStyle();
				break;
			case 'manual':
			default:
				delete mainScope.previousEnvironment;
				mainScope.platforms.previous = false;
				mainScope.platforms.docker = false;
				mainScope.platforms.kubernetes = false;
				mainScope.platforms.manual = true;
				break;
		}
	}
	
	function renderPreviousDeployInfo(currentScope) {
		for (let i = currentScope.availableEnvironments.length - 1; i >= 0; i--) {
			if (currentScope.availableEnvironments[i].code === currentScope.previousEnvironment) {
				currentScope.platform = currentScope.availableEnvironments[i].deployer.selected.split(".")[1];
				currentScope.driver = currentScope.availableEnvironments[i].deployer.selected.split(".")[2];
				if (currentScope.platform !== 'manual') {
					currentScope.config = currentScope.availableEnvironments[i].deployer.container[currentScope.platform][currentScope.driver];
				}
			}
		}
	}
	
	function getDashboardDeploymentStyle() {
		let status = false;
		$localStorage.environments.forEach((oneEnv) => {
			if (oneEnv.code === 'DASHBOARD' && oneEnv.deployer.type !== 'manual') {
				status = true
			}
		});
		
		return status;
	}
	
	function handleFormData(currentScope, formData) {
		
		if (currentScope.platforms.manual) {
			formData.selectedDriver = 'manual';
			delete formData.kubernetes;
			delete formData.docker;
			delete formData.previousEnvironment;
			
			delete currentScope.wizard.controller;
			delete currentScope.wizard.nginx;
		}
		else if (currentScope.platforms.previous) {
			if (currentScope.previousEnvironment === '') {
				$window.alert("Select the environment your want to clone its deployment settings to proceed!");
				return false;
			}
			formData.deployment = {};
			currentScope.availableEnvironments.forEach((oneEnv) => {
				if (oneEnv.code === currentScope.previousEnvironment) {
					formData.previousEnvironment = currentScope.previousEnvironment;
					formData.selectedDriver = oneEnv.deployer.selected.split(".")[1]; //docker || kubernetes
					
					if (formData.selectedDriver === 'docker') {
						delete formData.kubernetes;
						let localRemote = (oneEnv.deployer.selected.indexOf("remote") !== -1) ? 'remote' : 'local';
						formData.deployment.docker = oneEnv.deployer.container[formData.selectedDriver][localRemote];
						if (formData.deployment.docker.auth && formData.deployment.docker.auth.token) {
							formData.deployment.docker.token = formData.deployment.docker.auth.token;
							delete formData.deployment.docker.auth.token;
						}
						formData.deployment.docker.dockerremote = formData.deployment.docker.selected !== 'container.docker.local';
					}
					
					if (formData.selectedDriver === 'kubernetes') {
						delete formData.docker;
						formData.deployment.kubernetes = {};
						formData.deployment.kubernetes.kubernetesremote = oneEnv.deployer.selected !== 'container.kubernetes.local';
						let localRemote = (formData.deployment.kubernetes.kubernetesremote) ? 'remote' : 'local';
						formData.deployment.kubernetes = {
							kubernetesremote: oneEnv.deployer.selected !== 'container.kubernetes.local',
							port: oneEnv.deployer.container.kubernetes[localRemote].apiPort,
							NS: oneEnv.deployer.container.kubernetes[localRemote].namespace.default,
							perService: oneEnv.deployer.container.kubernetes[localRemote].namespace.perService,
							token: oneEnv.deployer.container.kubernetes[localRemote].auth.token
						};
						
						if (oneEnv.deployer.container.kubernetes[localRemote].nodes) {
							formData.deployment.kubernetes.nodes = oneEnv.deployer.container.kubernetes[localRemote].nodes;
						}
					}
				}
			});
		}
		else {
			delete formData.previousEnvironment;
			if (currentScope.platforms.docker) {
				delete formData.kubernetes;
				delete formData.deployment.kubernetes;
				formData.selectedDriver = 'docker';
				formData.deployment.docker.dockerremote = true;
				if (!formData.deployment.docker.nodes || !formData.deployment.docker.externalPort || !formData.deployment.docker.network || !formData.deployment.docker.token) {
					$window.alert("Provide the information on how to connect to docker on your remote machine.");
					return false;
				}
				
				formData.deployment.docker.apiPort = formData.deployment.docker.externalPort;
			}
			if (currentScope.platforms.kubernetes) {
				delete formData.docker;
				delete formData.deployment.docker;
				formData.selectedDriver = 'kubernetes';
				formData.deployment.kubernetes.kubernetesremote = true;
				if (!formData.deployment.kubernetes.nodes || !formData.deployment.kubernetes.port || !formData.deployment.kubernetes.token || !formData.deployment.kubernetes.NS || !Object.hasOwnProperty.call(formData.deployment.kubernetes, 'perService')) {
					$window.alert("Provide the information on how to connect to kubernetes on your remote machine.");
					return false;
				}
			}
			
			if (!formData.selectedDriver) {
				$window.alert("You have not specified the deployment strategy of this environment.");
				return false;
			}
		}
		
		currentScope.wizard.deployment = angular.copy(formData);
		
		if (currentScope.wizard.deployment) {   // clean other stuff
			let selectedDriver = currentScope.wizard.deployment.selectedDriver;
			let selectedData = angular.copy(currentScope.wizard.deployment.deployment[selectedDriver]);
			currentScope.wizard.deployment.deployment = {
				[selectedDriver]: selectedData
			};
		}
		
		$localStorage.addEnv = angular.copy(currentScope.wizard);
		delete $localStorage.addEnv.template.content;
		currentScope.nextStep();
	}
	
	function go(currentScope) {
		
		mainScope = currentScope;
		currentScope.switchDriver = switchDriver;
		currentScope.cloudProviders = environmentsConfig.providers;
		currentScope.cloudProviderHelpLink = {};
		
		currentScope.dockerImagePath = "./themes/" + themeToUse + "/img/docker_logo.png";
		currentScope.kubernetesImagePath = "./themes/" + themeToUse + "/img/kubernetes_logo.png";
		
		currentScope.availableEnvironments = angular.copy($localStorage.environments);
		if (currentScope.availableEnvironments.length > 0) {
			for (let i = currentScope.availableEnvironments.length - 1; i >= 0; i--) {
				if (currentScope.availableEnvironments[i].deployer.type === 'manual') {
					currentScope.availableEnvironments.splice(i, 1);
				}
			}
		}
		
		currentScope.changeLikeEnv = function (code) {
			currentScope.previousPlatformDeployment = true;
			currentScope.previousEnvironment = currentScope.form.formData.deployment.previousEnvironment;
			renderPreviousDeployInfo(currentScope);
		};
		
		currentScope.showProviderLink = function (myCloudProvider, technology) {
			currentScope.form.formData.deployment[technology].myCloudProvider = myCloudProvider.v;
			currentScope.cloudProviderHelpLink[technology] = myCloudProvider.help[technology];
		};
		
		overlayLoading.show();
		currentScope.previousPlatformDeployment = false;
		let configuration = angular.copy(environmentsConfig.form.add.step2.entries);
		
		let options = {
			timeout: $timeout,
			entries: configuration,
			name: 'addEnvironment',
			label: translation.addNewEnvironment[LANG],
			actions: [
				{
					'type': 'button',
					'label': "Back",
					'btn': 'success',
					'action': function () {
						if (currentScope.form && currentScope.form.formData) {
							currentScope.form.formData = {};
						}
						currentScope.previousStep();
					}
				}
			]
		};
		
		if (!currentScope.wizard.template.content || Object.keys(currentScope.wizard.template.content).length === 0) {
			options.actions.push({
				'type': 'submit',
				'label': 'OverView & Finalize',
				'btn': 'primary',
				'action': function (formData) {
					handleFormData(currentScope, formData);
				}
			});
		}
		else {
			options.actions.push({
				'type': 'submit',
				'label': "Next",
				'btn': 'primary',
				'action': function (formData) {
					handleFormData(currentScope, formData);
				}
			});
		}
		
		options.actions.push({
			'type': 'reset',
			'label': translation.cancel[LANG],
			'btn': 'danger',
			'action': function () {
				delete $localStorage.addEnv;
				delete currentScope.wizard;
				currentScope.form.formData = {};
				currentScope.$parent.go("/environments")
			}
		});
		
		buildForm(currentScope, $modal, options, function () {
			
			currentScope.mapStorageToWizard($localStorage.addEnv);
			
			if (currentScope.wizard.deployment) {
				currentScope.form.formData = angular.copy(currentScope.wizard.deployment);
			}
			
			if (!currentScope.form.formData) {
				currentScope.form.formData = {};
			}
			
			if (!currentScope.form.formData.deployment) {
				currentScope.form.formData.deployment = {};
			}
			
			if (currentScope.form.formData.previousEnvironment) {
				currentScope.form.formData.deployment.previousEnvironment = currentScope.form.formData.previousEnvironment;
				currentScope.previousEnvironment = currentScope.form.formData.previousEnvironment;
			}
			
			if (!currentScope.form.formData.deployment.docker) {
				currentScope.form.formData.deployment.docker = {
					dockerremote: false
				};
			}
			
			if (!currentScope.form.formData.deployment.kubernetes) {
				currentScope.form.formData.deployment.kubernetes = {
					kubernetesremote: false
				};
			} else {
				console.log(currentScope.form.formData.deployment.kubernetes.myCloudProvider);
				//todo: ask etienne what this is ?
			}
			
			currentScope.platforms = {
				docker: currentScope.form.formData.selectedDriver === 'docker' || false,
				kubernetes: currentScope.form.formData.selectedDriver === 'kubernetes' || false,
				manual: currentScope.form.formData.selectedDriver === 'manual' || false,
				previous: currentScope.previousEnvironment
			};
			
			if (currentScope.previousEnvironment && currentScope.previousEnvironment !== '') {
				currentScope.previousPlatformDeployment = true;
				currentScope.platforms = {
					docker: false,
					kubernetes: false,
					manual: false,
					previous: currentScope.previousEnvironment
				};
				renderPreviousDeployInfo(currentScope);
			}
			
			currentScope.allowLocalContainerDeployment = getDashboardDeploymentStyle();
			overlayLoading.hide();
		});
	}
	
	return {
		"go": go
	}
}]);