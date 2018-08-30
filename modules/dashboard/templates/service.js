"use strict";
var templateService = soajsApp.components;
templateService.service('templateSrv', ['Upload', 'ngDataApi', function (Upload, ngDataApi) {
	
	function listTemplates(currentScope) {
		
		// if coming back from add import template, clear file input
		if(currentScope && currentScope.form && currentScope.form.formData){
			currentScope.form.formData = {};
		}
		if(document.getElementById('myTemplate_0')){
			document.getElementById('myTemplate_0').value = "";
		}
		
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			'method': 'get',
			'routeName': '/dashboard/templates',
			'params': {
				'fullList': true,
			},
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				if (response) {
					currentScope.templates = angular.copy(response);
					currentScope.oldStyle = false;
					currentScope.templates.forEach(function (oneTemplate) {
						if (oneTemplate.type === '_BLANK') {
							currentScope.oldStyle = true;
						}
						else if(Object.keys(oneTemplate.content).length === 0){
							delete oneTemplate.content;
						}
					});
				}
				else {
					currentScope.displayAlert('danger', 'No templates found!');
				}
			}
		});
	}
	
	function upgradeTemplates(currentScope) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			'method': 'get',
			'routeName': '/dashboard/templates/upgrade'
		}, function (error) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				currentScope.displayAlert('success', 'Templates Upgraded');
				currentScope.listTemplates();
			}
		});
	}
	
	function deleteTmpl(currentScope, oneTemplate) {
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			'method': 'delete',
			'routeName': '/dashboard/templates',
			'params': {
				'id': oneTemplate._id,
			},
		}, function (error) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			} else {
				currentScope.displayAlert('success', "Template Deleted Successfully");
				currentScope.listTemplates();
			}
		});
	}
	
	return {
		"listTemplates": listTemplates,
		"deleteTmpl": deleteTmpl,
		"upgradeTemplates": upgradeTemplates
	}
}]);