"use strict";
var vmServices = soajsApp.components;
vmServices.service('vmSrv', [ 'ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {
	/**
	 * Service Functions
	 * @param currentScope
	 * @param env
	 * @param noPopulate
	 */
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
					let response = {
						azure: {
							label: "My Azure Provider",
							list: [
								{
									"id": "mikemongovm",
									"name": "mikemongovm",
									"labels": {
										"soajs.content": "true",
										"soajs.env.code": "dashboard",
										"soajs.service.technology": "vm",
										"soajs.infra.id": "5ae9e5cd55dc7960e796823b",
										"soajs.resource.id": "5ae9f082e371a7632ded1243",
										"soajs.image.name": "Ubuntu",
										"soajs.image.prefix": "Canonical",
										"soajs.image.tag": "16.04-LTS",
										"soajs.catalog.id": "5ae9e8ac885ee42487b7c027",
										"soajs.service.name": "mikemongovm",
										"soajs.service.label": "mikemongovm",
										"soajs.service.type": "cluster",
										"soajs.service.subtype": "mongo",
										
										//these values will be received from vmRecord.tags
										"service.image.name": "Ubuntu",
										"service.image.prefix": "Canonical",
										"service.image.tag": "16.04-LTS",
										
										"soajs.service.vm.group": "DASHBOARD",
										"soajs.service.vm.size": "Standard_A1"
									},
									tasks: [],
									"ports": [],
									"voluming": {},
									"ip": "xxx.xxx.xxx.xxx", //still don't know from where
									"location": "eastus",
									"status": "succeeded"
								}
							]
						}
					};
					
					currentScope.vms = response;
					console.log(currentScope.vms);
				}
			});
		}
	}
	
	function deleteService(currentScope, service, groupName) {
		// var params = {
		// 	env: currentScope.envCode,
		// 	namespace: service.namespace,
		// 	serviceId: service.id,
		// 	mode: ((service.labels && service.labels['soajs.service.mode']) ? service.labels['soajs.service.mode'] : ''),
		// 	name: service.name
		// };
		//
		// overlayLoading.show();
		// getSendDataFromServer(currentScope, ngDataApi, {
		// 	method: 'delete',
		// 	routeName: '/dashboard/cloud/services/delete',
		// 	params: params
		// }, function (error, response) {
		// 	overlayLoading.hide();
		// 	if (error) {
		// 		currentScope.displayAlert('danger', error.message);
		// 	}
		// 	else {
		// 		currentScope.displayAlert('success', 'Service deleted successfully');
		// 		currentScope.listServices();
		// 	}
		// });
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
	
	return {
		'listServices': listServices,
		'deleteService': deleteService,
		'inspectService': inspectService
	};
}]);
