"use strict";
var dynamicSecretsServices = soajsApp.components;
dynamicSecretsServices.service('dynamicSecretsSrv', ['ngDataApi', '$compile', 'secretsService', function (ngDataApi, $compile, secretsService) {
	
	function go(currentScope, context, defaultWizardSecretValues) {
		currentScope.dynamictemplatestep = "Container Secrets";
		
		function buildMyForms(counter, cb) {
			let secretKey = entriesNames[counter];
			let oneSecret = secretEntries[secretKey];
			
			currentScope.namespaceConfig = namespaceConfig;
			
			let extraInputs = [];
			if (namespaces && namespaces.length > 0) {
				extraInputs = [
					{
						"type": "select",
						"label": "Select Namespace",
						"name": "namespace",
						"value": namespaces,
						"onAction": function (id, value) {
							currentScope.namespaceConfig.namespace = value;
						}
					}
				];
			}
			
			let record = {
				secretName: oneSecret.name,
				secretData: oneSecret.data
			};
			if (currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv) {
				record = {
					secretName: currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[counter].name,
					textMode: (currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[counter].datatype === 'text'),
				};
				
				if (currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[counter].datatype === 'file') {
					record['secretFile'] = currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[counter].data;
				}
				else {
					record['secretData'] = currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[counter].data;
					if (!record.textMode) {
						record['secretData'] = JSON.parse(record['secretData']);
					}
				}
				
				if (currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[counter].namespace) {
					record.namespace = currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[counter].namespace;
				}
				
				if (!record.namespace && oneSecret.namespace) {
					record.namespace = oneSecret.namespace;
				}
			}
			
			oneSecret.scope = currentScope.$new(true); //true means detached from main currentScope
			oneSecret.scope.selectedEnvironment = {code: currentScope.envCode};
			currentScope.selectedEnvironment = {code: currentScope.envCode};
			
			secretsService.addSecret(oneSecret.scope, null, currentScope, [], extraInputs, record, () => {
				let element = angular.element(document.getElementById("secret_" + secretKey));
				element.html("<ngform></ngform>");
				$compile(element.contents())(oneSecret.scope);
				
				counter++;
				if (counter < entriesNames.length) {
					buildMyForms(counter, cb);
				}
				else {
					return cb();
				}
			});
		}
		
		function listNamespaces(kubernetes, cb) {
			if (!kubernetes) {
				//in case of swarm deployment, set namespace value to All Namespaces and set filter value to null in order to always display all fields
				namespaces = [];
				namespaceConfig.namespace = namespaceConfig.defaultValue.id;
				return cb();
			}
			
			//find if there is an environment that uses kubernetes
			//if found, then make the api call else use the default namespace
			let kubeEnv;
			if (currentScope.wizard.deployment.previousEnvironment) {
				kubeEnv = currentScope.wizard.deployment.previousEnvironment;
			}
			
			if (!kubeEnv) {
				namespaces = [];
				namespaceConfig.namespace = namespaceConfig.defaultValue.id;
				
				if (currentScope.wizard.deployment.selectedDriver === 'kubernetes') {
					//check if previous
					if (currentScope.wizard.deployment.previousEnvironment) {
						currentScope.availableEnvironments.forEach((onePreviousEnv) => {
							if (onePreviousEnv.code === currentScope.wizard.deployment.previousEnvironment) {
								namespaces = [{
									"v": onePreviousEnv.deployer.container.kubernetes.remote.namespace.default,
									"l": onePreviousEnv.deployer.container.kubernetes.remote.namespace.default
								}];
							}
						});
					}
					//check current provider
					else {
						if (currentScope.wizard.selectedInfraProvider.api.namespace) {
							namespaces = [{
								"v": currentScope.wizard.selectedInfraProvider.api.namespace.default,
								"l": currentScope.wizard.selectedInfraProvider.api.namespace.default
							}];
						}
						else {
							namespaces = [{"v": 'soajs', "l": 'soajs'}];
						}
					}
				}
				
				return cb();
			}
			
			getSendDataFromServer(currentScope, ngDataApi, {
				method: 'get',
				routeName: '/dashboard/cloud/namespaces/list',
				params: {
					env: kubeEnv.toUpperCase()
				}
			}, function (error, response) {
				if (error) {
					overlayLoading.hide();
					currentScope.displayAlert('danger', error.message);
				}
				else {
					namespaces = [{"v": "", "l": namespaceConfig.defaultValue.name}];
					response.forEach((oneNS) => {
						namespaces.push({"v": oneNS.name, "l": oneNS.name});
					});
					namespaceConfig.namespace = namespaceConfig.defaultValue.id; //setting current selected to 'All Namespaces'
					return cb();
				}
			});
		}
		
		let namespaces = [];
		let namespaceConfig = {
			defaultValue: {
				id: undefined, //setting id to undefined in order to force angular to display all fields, => All Namespaces
				name: '--- All Namespaces ---'
			}
		};
		
		//create a copy just in case
		let secretEntries = angular.copy(context.inputs);
		currentScope.dynamicStep = context;
		
		currentScope.saveData = function () {
			if (!currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv) {
				currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv = [];
			}
			else {
				currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.length = 0;
			}
			
			defaultWizardSecretValues = [];
			let entriesCount = 0;
			currentScope.secrets = [];
			for (let secretName in secretEntries) {
				let oneSecret = secretEntries[secretName];
				oneSecret.scope.form.do({
					'type': 'submit',
					'action': (formData) => {
						oneSecret.scope.save(formData, (imfv) => {
							if (oneSecret.scope.$valid) {
								imfv.name = secretName; //force the name back as it was
								oneSecret = imfv;
								
								if (typeof oneSecret.data === "object") {
									oneSecret.data = JSON.stringify(oneSecret.data);
								}
								
								delete oneSecret.scope;
								currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.push(oneSecret);
								defaultWizardSecretValues.push(oneSecret);
								if (!oneSecret.namespace){
									oneSecret.namespace = 'soajs';
								}
								currentScope.secrets.push(oneSecret);
								entriesCount++;
								if (entriesCount === Object.keys(secretEntries).length) {
									//trigger next here
									currentScope.next();
								}
							}
						});
					}
				});
			}
		};
		
		overlayLoading.show();
		currentScope.loadingDynamicSection = true;
		let entriesNames = Object.keys(secretEntries);
		listNamespaces((currentScope.wizard.deployment.selectedDriver === 'kubernetes'), () => {
			buildMyForms(0, () => {
				currentScope.loadingDynamicSection = false;
				overlayLoading.hide();
			});
		});
	}
	
	return {
		'go': go
	}
	
}]);