"use strict";
var dynamicServices = soajsApp.components;
dynamicServices.service('dynamicSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', '$compile', 'customRegistrySrv', 'resourceDeploy', 'secretsService', 'deployServiceDep', function (ngDataApi, $timeout, $modal, $localStorage, $window, $compile, customRegistrySrv, resourceDeploy, secretsService, deployServiceDep) {
	
	let predefinedSchemaSteps = {
		custom_registry: {
			deploy: function(currentScope, context, fCb) {
				function buildMyForms(counter, cb){
					let ci = entriesNames[counter];
					let customRegistry = ciEntries[ci];
					let record = angular.copy(customRegistry);
					customRegistry.scope = currentScope.$new(true); //true means detached from main currentScope
					customRegistrySrv.internalCustomRegistryFormManagement(customRegistry.scope, currentScope.envCode, null, record, 'add');
					let entries = [
						{
							"directive": "modules/dashboard/environments/directives/customRegistry.tmpl"
						}
					];
					buildDynamicForm(customRegistry.scope, entries, () =>{
						let element = angular.element(document.getElementById("ci_" + ci));
						element.html("<ngform></ngform>");
						$compile(element.contents())(customRegistry.scope);
						
						counter ++;
						if(counter < entriesNames.length){
							buildMyForms(counter, cb);
						}
						else{
							return cb();
						}
					});
				}
				
				//create a copy just in case
				let ciEntries = angular.copy(context.inputs);
				currentScope.dynamicStep = context;
				
				currentScope.saveData = function(){
					if (!currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv) {
						currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv = [];
					}
					else {
						currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.length = 0;
					}
					
					for (let ci in ciEntries) {
						let customRegistry = ciEntries[ci];
						customRegistry.scope.save();
						console.log(customRegistry);
						//map the values back to custom registry
						
						// currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.push(customRegistry);
					}
					
					//trigger next here
					//currentScope.next();
				};
				
				overlayLoading.show();
				let entriesNames = Object.keys(ciEntries);
				buildMyForms(0, () => {
					overlayLoading.hide();
				});
			}
		},
		secrets: {
			deploy: function(currentScope, context, fCb){
				// let ciEntries = angular.copy(context.inputs);
				//
				// let actions = {
				// 	'type': 'submit',
				// 	'label': "Save & Continue",
				// 	'btn': 'primary',
				// 	'action': function (formData) {
				//
				// 		if(!currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv){
				// 			currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv = [];
				// 		}
				// 		else{
				// 			currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.length = 0;
				// 		}
				//
				// 		for (let ci in ciEntries) {
				// 			let customRegistry = ciEntries[ci];
				// 			console.log(customRegistry);
				// 			currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.push(customRegistry);
				// 		}
				//
				// 		return fCb();
				// 	}
				// };
				//
				// for (let ci in ciEntries) {
				// 	secretsService.addSecret(currentScope, null, currentScope);
				// }
				//
				// buildDynamicForm(currentScope, context, actions);
			}
		},
		repo: {
			deploy: function(currentScope, context, fCb){
				//create a copy just in case
				// let ciEntries = angular.copy(context.inputs);
				//
				// let actions = {
				// 	'type': 'submit',
				// 	'label': "Save & Continue",
				// 	'btn': 'primary',
				// 	'action': function (formData) {
				//
				// 		if(!currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv){
				// 			currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv = [];
				// 		}
				// 		else{
				// 			currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.length = 0;
				// 		}
				//
				// 		for (let ci in ciEntries) {
				// 			let customRegistry = ciEntries[ci];
				// 			console.log(customRegistry);
				// 			currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.push(customRegistry);
				// 		}
				//
				// 		return fCb();
				// 	}
				// };
				//
				// for (let ci in ciEntries) {
				// 	let customRegistry = ciEntries[ci];
				// 	deployServiceDep.buildDeployForm(currentScope, currentScope, customRegistry, service, version, gitAccount, daemonGrpConf, isKubernetes);
				// }
				//
				// buildDynamicForm(currentScope, context, actions);
			}
		},
		resources: {
			deploy: function(currentScope, context, fCb){
				// create a copy just in case
				// let resourceEntries = angular.copy(context.inputs);
				//
				// let actions = {
				// 	'type': 'submit',
				// 	'label': "Save & Continue",
				// 	'btn': 'primary',
				// 	'action': function (formData) {
				//
				// 		if(!currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv){
				// 			currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv = [];
				// 		}
				// 		else{
				// 			currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.length = 0;
				// 		}
				//
				// 		return fCb();
				// 	}
				// };
				//
				// function postFormExecute(){
				// 	let resourceName = context.section[context.section.length -1];
				// 	resourceDeploy.buildDeployForm(currentScope, currentScope, null, context.inputs[resourceName], 'add', {
				// 		"type": context.inputs[resourceName].type,
				// 		category: context.inputs[resourceName].category
				// 	}, () =>{
				//
				// 	});
				// }
				//
				// buildDynamicForm(currentScope, context, actions, postFormExecute);
			}
		}
	};
	
	function buildDynamicForm(currentScope, entries, postFormExecute){
		let options = {
			timeout: $timeout,
			entries: entries,
			name: 'addEnvironment'
		};

		buildForm(currentScope, $modal, options, function () {
			if(postFormExecute && typeof postFormExecute === 'function'){
				postFormExecute();
			}
		});
	}
	
	function go(currentScope){
		if($localStorage.addEnv){
			currentScope.wizard = $localStorage.addEnv;
		}
		
		let stack = [];
		if(currentScope.wizard){
			getDeploymentWorkflow(stack, currentScope.wizard.template);
			
			currentScope.envCode = currentScope.wizard.gi.code.toUpperCase();
			
			console.log(stack);
			
			//this template has no deployment workflow go to overview
			if(stack.length === 0){
				currentScope.nextStep();
			}
			else{
				// currentScope.deploymentStackStep = 5;
				currentScope.deploymentStackStep = 0;
				processStack(currentScope, stack);
			}
		}
		
		currentScope.reset = function(){
			delete $localStorage.addEnv;
			delete currentScope.wizard;
			currentScope.form.formData = {};
			currentScope.$parent.go("/environments")
		};
		
		currentScope.back = function(){
			currentScope.deploymentStackStep--;
			if(currentScope.deploymentStackStep < 0){
				if (currentScope.form && currentScope.form.formData) {
					currentScope.form.formData = {};
				}
				currentScope.previousStep();
			}
			else{
				processStack(currentScope, stack);
			}
		};
		
		currentScope.next = function(){
			currentScope.deploymentStackStep++;
			if(currentScope.deploymentStackStep > stack.length){
				if (currentScope.form && currentScope.form.formData) {
					currentScope.form.formData = {};
				}
				currentScope.nextStep();
			}
			else{
				processStack(currentScope, stack);
			}
		};
	}
	
	function returnObjectPathFromString(stringPath, mainObj){
		function index(obj,i) {return obj[i]}
		return stringPath.split('.').reduce(index, mainObj);
	}
	
	function getDeploymentWorkflow(stack, template) {
		if(template.deploy && Object.keys(template.deploy).length > 0){
			let schemaOptions = Object.keys(template.deploy);
			schemaOptions.forEach((stage) => {
				let groups = ['pre','steps','post'];
				groups.forEach((oneGroup) => {
					if(template.deploy[stage][oneGroup]){
						for(let stepPath in template.deploy[stage][oneGroup]){
							let opts = {
								'stage': stage,
								'group': oneGroup,
								'stepPath': stepPath,
								'section': (stepPath.indexOf(".") !== -1) ? stepPath.split(".") : stepPath
							};
							
							//case of ui read only, loop in array and generate an inputs object then call utils
							if(template.deploy[stage][oneGroup][stepPath].ui && template.deploy[stage][oneGroup][stepPath].ui.readOnly){
							
							}
							else{
								let dataArray = returnObjectPathFromString("content." + stepPath, template);
								let inputs = {};
								if(dataArray.data && Array.isArray(dataArray.data)){
									dataArray.data.forEach((oneDataEntry) => {
										inputs[oneDataEntry.name] = oneDataEntry;
									});
								}
								else{
									let section = stepPath;
									if(stepPath.indexOf(".") !== -1){
										stepPath = stepPath.split(".");
										section = stepPath[stepPath.length -1];
									}
									inputs[section] = dataArray;
								}
								opts['inputs'] = inputs;
							}
							stack.push(opts);
						}
					}
				});
			});
		}
	}
	
	function processStack(currentScope, stack){
		let stackStep = stack[currentScope.deploymentStackStep];
		if(stackStep && stackStep.inputs){
			let contentSection = stackStep.section;
			let subSection;
			if(Array.isArray(contentSection)){
				subSection = contentSection[1];
				contentSection = contentSection[0];
			}
			
			let predefinedStepFunction;
			//check if template has a content entry for level 0 of this section
			if(currentScope.wizard.template.content[contentSection]){
				//works for both sections with sub or sections with main only
				predefinedStepFunction = subSection || contentSection;
			}
			
			stackStep.predefinedStepFunction = predefinedStepFunction;
			if(predefinedStepFunction){
				predefinedSchemaSteps[predefinedStepFunction].deploy(currentScope, stackStep , () => {
					nextStep();
				});
			}
			else{
				nextStep();
			}
		}
		else{
			nextStep();
		}
		
		function nextStep(){
			//jump to next step or leave
			currentScope.deploymentStackStep ++;
			if(currentScope.deploymentStackStep === stack.length -1){
				//stack has been processed in full, go to overview
				currentScope.nextStep();
			}
			else{
				processStack(currentScope, stack);
			}
		}
	}
	
	return {
		"go": go
	}
}]);