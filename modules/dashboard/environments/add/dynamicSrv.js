"use strict";
var dynamicServices = soajsApp.components;
dynamicServices.service('dynamicSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', 'dynamicCustomRegistrySrv', 'dynamicSecretsSrv', 'dynamicReposSrv', 'dynamicResourceSrv', 'deployRepos', function (ngDataApi, $timeout, $modal, $localStorage, dynamicCustomRegistrySrv, dynamicSecretsSrv, dynamicReposSrv, dynamicResourceSrv, deployRepos) {
	
	let defaultWizardSecretValues = [];

	//predefined handling steps that each tackle a certain section in the template based on the section type
	let predefinedSchemaSteps = {
		custom_registry: {
			deploy: function (currentScope, context) {
				dynamicCustomRegistrySrv.go(currentScope, context, buildDynamicForm);
			}
		},
		secrets: {
			deploy: function (currentScope, context, fCb) {
				dynamicSecretsSrv.go(currentScope, context, defaultWizardSecretValues);
			}
		},
		repo: {
			deploy: function (currentScope, context, fCb) {
				dynamicReposSrv.go(currentScope, context, buildDynamicForm, defaultWizardSecretValues);
			}
		},
		resources: {
			deploy: function (currentScope, context, fCb) {
				dynamicResourceSrv.go(currentScope, context, buildDynamicForm, defaultWizardSecretValues);
			}
		}
	};

	//common function to print the form
	function buildDynamicForm(currentScope, entries, postFormExecute) {
		let options = {
			timeout: $timeout,
			entries: entries,
			name: 'addEnvironment'
		};

		buildForm(currentScope, $modal, options, function () {
			if (postFormExecute && typeof postFormExecute === 'function') {
				postFormExecute();
			}
		});
	}

	//main driver
	function go(currentScope) {
		currentScope.currentStep = 'dynamicSrv';
		currentScope.loadingDynamicSection = true;
		currentScope.mapStorageToWizard($localStorage.addEnv);

		let stack = [];
		if (currentScope.wizard) {
			deployRepos.listGitAccounts(currentScope, () => {
				getDeploymentWorkflow(currentScope, stack, currentScope.wizard.template);

				currentScope.envCode = currentScope.wizard.gi.code.toUpperCase();
				
				//this template has no deployment workflow go to overview
				if (stack.length === 0) {
					if(['overview'].indexOf(currentScope.referringStep) !== -1){
						currentScope.referringStep = currentScope.currentStep;
						currentScope.deploymentStackStep = 0;
						if (currentScope.form && currentScope.form.formData) {
							currentScope.form.formData = {};
						}
						currentScope.previousStep();
					}
					else{
						currentScope.referringStep = currentScope.currentStep;
						currentScope.nextStep();
					}
				}
				else {
					currentScope.deploymentStackStep = 0;
					if(['registry', 'container', 'vm'].indexOf(currentScope.referringStep) === -1){
						currentScope.deploymentStackStep = stack.length -1;
					}
					processStack(currentScope, stack);
				}
			});
		}

		currentScope.reset = function () {
			currentScope.exitWizard();
		};

		currentScope.back = function () {
			jQuery("html, body").animate({scrollTop: 0 });
			
			currentScope.referringStep = currentScope.currentStep;
			currentScope.deploymentStackStep--;
			if (currentScope.deploymentStackStep < 0) {
				if (currentScope.form && currentScope.form.formData) {
					currentScope.form.formData = {};
				}
				currentScope.previousStep();
			}
			else {
				processStack(currentScope, stack);
			}
		};

		currentScope.next = function () {
			jQuery("html, body").animate({scrollTop: 0 });

			//update template in local storage
			$localStorage.addEnv = angular.copy(currentScope.wizard);
			delete $localStorage.addEnv.template.content;

			currentScope.deploymentStackStep++;
			if (currentScope.deploymentStackStep >= stack.length) {
				if (currentScope.form && currentScope.form.formData) {
					currentScope.form.formData = {};
				}
				currentScope.referringStep = currentScope.currentStep;
				currentScope.nextStep();
			}
			else {
				processStack(currentScope, stack);
			}
		};
	}

	//helper that "transforms deployments.repo.controller" --> [deployments][repo][controller]
	function returnObjectPathFromString(stringPath, mainObj) {
		function index(obj, i) {
			return obj[i]
		}

		return stringPath.split('.').reduce(index, mainObj);
	}

	//transform the template deploy steps to a stack to be processed step by step
	function getDeploymentWorkflow(currentScope, stack, template) {
		if (template.deploy && Object.keys(template.deploy).length > 0) {
			let schemaOptions = Object.keys(template.deploy);
			schemaOptions.forEach((stage) => {
				let groups = ['pre', 'steps', 'post'];
				groups.forEach((oneGroup) => {
					if (template.deploy[stage][oneGroup]) {
						for (let stepPath in template.deploy[stage][oneGroup]) {
							let opts = {
								'stage': stage,
								'group': oneGroup,
								'stepPath': stepPath,
								'section': (stepPath.indexOf(".") !== -1) ? stepPath.split(".") : stepPath
							};

							//if manual deployment, then process database entries only
							if(currentScope.wizard.deployment.selectedDriver === 'manual' && stage === 'database'){
								prepareInputs(stage, oneGroup, stepPath, opts);
							}
							else if(currentScope.wizard.deployment.selectedDriver !== 'manual'){
								prepareInputs(stage, oneGroup, stepPath, opts);
							}
						}
					}
				});
			});
		}

		//check in each deploy step if the user already filled custom data
		function prepareInputs(stage, oneGroup, stepPath, opts){
			//case of ui read only, loop in array and generate an inputs object then call utils
			if (template.deploy[stage][oneGroup][stepPath].ui && template.deploy[stage][oneGroup][stepPath].ui.readOnly) {

			}
			else {
				let inputs = {};
				if(template.deploy[stage][oneGroup][stepPath].imfv && template.deploy[stage][oneGroup][stepPath].imfv.length > 0){
					template.deploy[stage][oneGroup][stepPath].imfv.forEach((oneimfv) =>{
						let tName = oneimfv.name || oneimfv.serviceName;
						inputs[tName] = oneimfv;
					})
				}
				if(Object.keys(inputs).length === 0){
					let dataArray = returnObjectPathFromString("content." + stepPath, template);
					if(!dataArray){
						let section = stepPath;
						if (stepPath.indexOf(".") !== -1) {
							stepPath = stepPath.split(".");
							section = stepPath[0];
						}
						let dataArray = returnObjectPathFromString("content." + section, template);
						doDataArray(dataArray, inputs);
					}
					else{
						doDataArray(dataArray, inputs);
					}
				}


				opts['inputs'] = inputs;
				stack.push(opts);
			}

			function doDataArray(dataArray, inputs){
				if (dataArray.data && Array.isArray(dataArray.data)) {
					dataArray.data.forEach((oneDataEntry) => {
						let tName = oneDataEntry.name || oneDataEntry.serviceName;
						inputs[tName] = oneDataEntry;
					});
				}
				else {
					let section = stepPath;
					if (stepPath.indexOf(".") !== -1) {
						stepPath = stepPath.split(".");
						section = stepPath[stepPath.length - 1];
					}

					if (dataArray.limit) {
						if (dataArray.limit > 1) {
							for (let i = 0; i < dataArray.limit; i++) {
								inputs[section + i] = angular.copy(dataArray);
								delete inputs[section + i].limit;
							}
						}
						else {
							delete dataArray.limit;
							inputs[section] = dataArray;
						}
					}
					else {
						inputs[section] = dataArray;
					}
				}
			}
		}
	}

	//process every entry in the stack and determin which predefined deploy function should be triggered
	function processStack(currentScope, stack) {
		let stackStep = stack[currentScope.deploymentStackStep];
		if (stackStep && stackStep.inputs) {
			let contentSection = stackStep.section;
			let subSection;
			if (Array.isArray(contentSection)) {
				subSection = contentSection[1];
				contentSection = contentSection[0];
			}

			let predefinedStepFunction;
			//check if template has a content entry for level 0 of this section
			if (currentScope.wizard.template.content[contentSection]) {
				//works for both sections with sub or sections with main only
				if(currentScope.wizard.template.content[contentSection][subSection]){
					predefinedStepFunction = subSection;
				}
				else{
					predefinedStepFunction = contentSection;
				}
			}

			stackStep.predefinedStepFunction = predefinedStepFunction;
			if (predefinedStepFunction) {
				predefinedSchemaSteps[predefinedStepFunction].deploy(currentScope, stackStep);
			}
			else {
				nextStep();
			}
		}
		else {
			nextStep();
		}

		function nextStep() {
			//jump to next step or leave
			if (currentScope.deploymentStackStep === stack.length - 1) {
				//stack has been processed in full, go to overview
				currentScope.referringStep = currentScope.currentStep;
				currentScope.nextStep();
			}
			else {
				currentScope.deploymentStackStep++;
				processStack(currentScope, stack);
			}
		}
	}

	return {
		"go": go
	}
}]);
