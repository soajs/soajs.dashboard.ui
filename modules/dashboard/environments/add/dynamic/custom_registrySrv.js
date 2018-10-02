"use strict";
var dynamicCustomRegistryServices = soajsApp.components;
dynamicCustomRegistryServices.service('dynamicCustomRegistrySrv', ['$window', '$compile', 'customRegistrySrv', function ($window, $compile, customRegistrySrv) {
	
	function go(currentScope, context, buildDynamicForm) {
		currentScope.dynamictemplatestep = "Custom Registries";
		
		function buildMyForms(counter, cb) {
			
			let ci = entriesNames[counter];
			let customRegistry = ciEntries[ci];
			
			let record = angular.copy(customRegistry);
			if (currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv) {
				record = currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv[counter];
			}
			
			customRegistry.scope = currentScope.$new(true); //true means detached from main currentScope
			customRegistrySrv.internalCustomRegistryFormManagement(customRegistry.scope, currentScope.envCode, null, record, 'add');
			let entries = [
				{
					"directive": "modules/dashboard/environments/directives/customRegistry.tmpl"
				}
			];
			buildDynamicForm(customRegistry.scope, entries, () => {
				let element = angular.element(document.getElementById("ci_" + ci));
				element.html("<ngform></ngform>");
				$compile(element.contents())(customRegistry.scope);
				
				counter++;
				if (counter < entriesNames.length) {
					buildMyForms(counter, cb);
				}
				else {
					return cb();
				}
			});
		}
		
		//create a copy just in case
		let ciEntries = angular.copy(context.inputs);
		currentScope.dynamicStep = context;
		
		currentScope.saveData = function () {
			if (!currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv) {
				currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv = [];
			}
			else {
				currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.length = 0;
			}
			
			let entriesCount = 0;
			for (let ci in ciEntries) {
				let customRegistry = ciEntries[ci];
				customRegistry.scope.save();
				
				if (customRegistry.scope.$valid) {
					//map the values back to custom registry
					let imfv = angular.copy(customRegistry.scope.formData);
					imfv.name = ci; //force the name back as it was
					if (!imfv.textMode) {
						try {
							imfv.value = JSON.parse(imfv.value);
						}
						catch (e) {
							$window.alert("The content of the custom registry provided is invalid!");
							return false;
						}
					}
					customRegistry = imfv;
					delete customRegistry.scope;
					currentScope.wizard.template.deploy[context.stage][context.group][context.stepPath].imfv.push(customRegistry);
					entriesCount++;
					
					//trigger next here
					if (entriesCount === Object.keys(ciEntries).length) {
						currentScope.next();
					}
				}
			}
		};
		
		overlayLoading.show();
		let entriesNames = Object.keys(ciEntries);
		currentScope.loadingDynamicSection = true;
		buildMyForms(0, () => {
			currentScope.loadingDynamicSection = false;
			overlayLoading.hide();
		});
	}
	
	return {
		"go": go
	}
	
}]);