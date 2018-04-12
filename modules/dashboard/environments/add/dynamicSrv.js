"use strict";
var dynamicServices = soajsApp.components;
dynamicServices.service('dynamicSrv', ['ngDataApi', '$timeout', '$modal', '$localStorage', '$window', '$compile', 'customRegistrySrv', 'resourceDeploy', 'secretsService', 'deployServiceDep', function (ngDataApi, $timeout, $modal, $localStorage, $window, $compile, customRegistrySrv, resourceDeploy, secretsService, deployServiceDep) {
	
	let predefinedSchemaSteps = {
		custom_registry: {
			deploy: function(currentScope, context) {
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
						
						//map the values back to custom registry
						let imfv = angular.copy(customRegistry.scope.formData);
						imfv.name = ci; //force the name back as it was
						if(!imfv.textMode){
							try{
								imfv.value = JSON.parse(imfv.value);
							}
							catch(e){
								$window.alert("The content of the custom registry provided is invalid!");
								return false;
							}
						}
						customRegistry = imfv;
						delete customRegistry.scope;
						currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.push(customRegistry);
					}
					
					//trigger next here
					currentScope.next();
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
				function buildMyForms(counter, cb){
					let key = entriesNames[counter];
					let resource = resourceEntries[key];
					
					console.log(resource);
					let record = angular.copy(resource);
					let settings = { "type": record.type, category: record.category };
					resource.scope = currentScope.$new(true); //true means detached from main currentScope
					resource.scope.envCode = currentScope.envCode;
					
					resourceDeploy.buildDeployForm(resource.scope, resource.scope, null, record, 'add', settings, () =>{
						let entries = [
						
						];
						buildDynamicForm(resource.scope, entries, () =>{
							let element = angular.element(document.getElementById("resource_" + key));
							element.append("<div ng-include=\"'modules/dashboard/resources/directives/resource.tmpl'\">");
							$compile(element.contents())(resource.scope);
						
							counter ++;
							if(counter < entriesNames.length){
								buildMyForms(counter, cb);
							}
							else{
								return cb();
							}
						});
					});
				}
				
				let resourceEntries = angular.copy(context.inputs);
				context.inputs.limit = 2;
				currentScope.dynamicStep = context;
				
				overlayLoading.show();
				let entriesNames = Object.keys(resourceEntries);
				buildMyForms(0, () => {
					overlayLoading.hide();
				});
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
		
		currentScope.mapStorageToWizard($localStorage.addEnv);
		
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
			currentScope.deploymentStackStep --;
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
								stack.push(opts);
							}
						}
					}
				});
			});
		}
	}
	
	function processStack(currentScope, stack){
		
		console.log(currentScope.deploymentStackStep);
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
			console.log(predefinedStepFunction);
			stackStep.predefinedStepFunction = predefinedStepFunction;
			if(predefinedStepFunction){
				predefinedSchemaSteps[predefinedStepFunction].deploy(currentScope, stackStep);
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
			if(currentScope.deploymentStackStep === stack.length -1){
				//stack has been processed in full, go to overview
				currentScope.nextStep();
			}
			else{
				currentScope.deploymentStackStep ++;
				processStack(currentScope, stack);
			}
		}
	}
	
	return {
		"go": go
	}
}]);