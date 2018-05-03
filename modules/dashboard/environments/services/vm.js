"use strict";
var vmServices = soajsApp.components;
vmServices.service('vmSrv', [ 'ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {
	
	function listServices(currentScope) {
		var env = currentScope.envCode.toLowerCase();
		
		//do not make any call if list services ui is opened and someone is checking the logs of that service
		//avoid browser memory over usage
		if (!currentScope.pauseRefresh) {
			
			getSendDataFromServer(currentScope, ngDataApi, {
				"method": "get",
				"routeName": "/dashboard/cloud/vm/list",
				"params": {
					"env": env
				}
			}, function (error, response) {
				if (error) {
					currentScope.displayAlert('danger', error.message);
				}
				else {
					// let response = {
					// 	azure: {
					// 		label: "My Azure Provider",
					// 		list: [
					// 			{
					// 				"type": "vm",
					// 				"name": "mikemongovm",
					// 				"id": "mikemongovm",
					// 				"labels": {
					// 					"soajs.content": "true",
					// 					"soajs.env.code": "dashboard",
					// 					"soajs.service.technology": "vm",
					// 					"soajs.infra.id": "5ae9e5cd55dc7960e796823b",
					// 					"soajs.resource.id": "5ae9f082e371a7632ded1243",
					// 					"soajs.image.prefix": "Canonical",
					// 					"soajs.image.name": "UbuntuServer",
					// 					"soajs.image.tag": "17.10",
					// 					"soajs.service.name": "mikemongovm",
					// 					"soajs.service.label": "mikemongovm",
					// 					"soajs.service.type": "cluster",
					// 					"soajs.service.subtype": "mongo",
					// 					"soajs.service.vm.location": "eastus",
					// 					"soajs.service.vm.group": "DASHBOARD",
					// 					"soajs.service.vm.size": "Standard_A1"
					//
					// 				},
					// 				"ports": [
					// 					{
					// 						"protocol": "tcp",
					// 						"target": 27017,
					// 						"published": 27017
					// 					},
					// 					{
					// 						"protocol": "tcp",
					// 						"target": 22,
					// 						"published": 22
					// 					}
					// 				],
					// 				"voluming": {},
					// 				"tasks": [
					// 					{
					// 						"id": "mikemongovm",
					// 						"name": "mikemongovm",
					// 						"status": {
					// 							"state": "succeeded",
					// 							"ts": 1525338149668
					// 						},
					// 						"ref": {
					// 							"os": {
					// 								"type": "Linux",
					// 								"diskSizeGB": 30
					// 							}
					// 						}
					// 					}
					// 				],
					// 				"env": [],
					// 				"servicePortType": "nodePort",
					// 				"ip": "xxx-xxx-xxx-xxx"
					// 			}
					// 		]
					// 	}
					// };
					delete response.soajsauth;
					currentScope.vms = response;
				}
			});
		}
	}
	
	function deleteService(currentScope, service) {
		let params = {
			"env": currentScope.envCode,
			"serviceId": service.id,
			"infraAccountId": service.labels['soajs.infra.id'],
			"location": service.labels['soajs.service.vm.location'],
			"technology" : service.labels['soajs.service.technology']
		};

		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'delete',
			routeName: '/dashboard/cloud/services/delete',
			params: params
		}, function (error) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.displayAlert('success', 'Service deleted successfully');
				listServices(currentScope);
			}
		});
	}
	
	function inspectService(currentScope, service) {
		var formConfig = angular.copy(environmentsConfig.form.serviceInfo);
		formConfig.entries[0].value = service;
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'serviceInfo',
			label: service.name + ' | Service Info',
			actions: [
				{
					'type': 'reset',
					'label': translation.ok[LANG],
					'btn': 'primary',
					'action': function (formData) {
						currentScope.modalInstance.dismiss('cancel');
						currentScope.form.formData = {};
					}
				}
			]
		};
		buildFormWithModal(currentScope, $modal, options);
	}
	
	function maintenanceService(currentScope, service, operation) {
		let params = {
			"env": currentScope.envCode,
			"name": service.name,
			"location": service.labels['soajs.service.vm.location'],
			"infraAccountId": service.labels['soajs.infra.id'],
			"operation": operation
		};
		
		overlayLoading.show();
		getSendDataFromServer(currentScope, ngDataApi, {
			method: 'post',
			routeName: '/dashboard/cloud/vm/maintenance',
			params: params
		}, function (error) {
			overlayLoading.hide();
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.displayAlert('success', 'Service deleted successfully');
				listServices(currentScope);
			}
		});
	}
	
	return {
		'listServices': listServices,
		'deleteService': deleteService,
		'inspectService': inspectService,
		'maintenanceService': maintenanceService
	};
}]);
