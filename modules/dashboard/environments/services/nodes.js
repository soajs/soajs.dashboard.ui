"use strict";
var nodeSrv = soajsApp.components;
nodeSrv.service('nodeSrv', ['ngDataApi', '$timeout', '$modal', function (ngDataApi, $timeout, $modal) {
	
	/**
	 * Nodes Functions
	 * @param currentScope
	 */
	function listNodes(currentScope, cb) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/cloud/nodes/list",
			params: {
				env : currentScope.envCode.toLowerCase()
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.nodes.list = response;
				
				currentScope.nodes.list.forEach(function(oneNode){
					if(oneNode.labels && oneNode.labels.provider){
						currentScope.serviceProviders.forEach(function(oneProvider){
							if(oneProvider.v === oneNode.labels.provider){
								oneNode.tag = oneProvider;
							}
						});
					}
				});
				if(cb && typeof(cb) === 'function'){
					return cb(currentScope.nodes.list);
				}
			}
		});
	}

	function joinInfraAndNodes(currentScope, nodes, deployedInfra, counter) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/infra/cluster",
			"params": {
				"id": deployedInfra[counter]._id,
				"envCode": currentScope.envCode.toLowerCase()
			}
		}, function (error, info) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				deployedInfra[counter].nodes = {
					list: []
				};

				//link provider with environment
				if(info && info.machines && info.machines.length > 0){
					info.machines.forEach((oneMachine) => {
						nodes.forEach((oneNode) => {
							console.log(oneNode.hostname, oneMachine.name);
							if (oneMachine.name === oneNode.hostname) {
								oneNode.ip = oneMachine.ip;
								deployedInfra[counter].nodes.list.push(oneNode);
							}
						});
					});
				}
				
				counter--;
				if(counter >= 0){
					joinInfraAndNodes(currentScope, nodes, deployedInfra, counter);
				}
				else{
					for(let infraName in currentScope.infraProviders){
						if(currentScope.infraProviders[infraName]){
							if(!currentScope.infraProviders[infraName].nodes  || (currentScope.infraProviders[infraName].nodes && currentScope.infraProviders[infraName].nodes.list.length === 0)){
								delete currentScope.infraProviders[infraName];
							}
						}
					}
				}
			}
		});
	}

	function listInfraProviders(currentScope) {
		//call bridge, get the available providers
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/infra",
			params: {
				envCode: currentScope.envCode.toLowerCase()
			}
		}, function (error, providers) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.infraProviders = angular.copy(providers);
				delete currentScope.infraProviders.soajsauth;

				listNodes(currentScope, (nodes) => {
					joinInfraAndNodes(currentScope, nodes, currentScope.infraProviders, currentScope.infraProviders.length -1);
				});
			}
		});
	}

	function scaleNodes(currentScope, providerInfo) {
		//call bridge, and request scaling an environment deployment
		let formEntries = providerInfo.form.scale[currentScope.envPlatform].entries;

		let workernumber = 0;
		providerInfo.nodes.list.forEach((oneNode) => {
			if(oneNode.spec.role === 'manager'){
				workernumber++;
			}
		});

		var options = {
			timeout: $timeout,
			form: {
				"entries": formEntries
			},
			data: {
				"number": workernumber
			},
			name: 'scaleNodes',
			label: 'Scale Node(s)',
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {

						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "post",
							"routeName": "/bridge/executeDriver",
							"data":{
								"type": "infra",
								"name": providerInfo.provider.name,
								"driver": providerInfo.provider.name,
								"command": "scaleCluster",
								"soajs_project": projectName,
								"options": {
									"data": formData,
									"envCode": currentScope.envCode.toUpperCase()
								}
							}
						}, function (error) {
							if (error) {
								currentScope.form.displayAlert('danger', error.message);
							}
							else {
								currentScope.$parent.displayAlert('success', "Deployment Scaled Successfully, changes might take a few minutes.");
								currentScope.modalInstance.close();
								currentScope.form.formData = {};
								currentScope.listInfraProviders();
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						currentScope.modalInstance.dismiss('cancel');
						currentScope.form.formData = {};
					}
				}
			]
		};

		buildFormWithModal(currentScope, $modal, options);
	}
	
	function addNode(currentScope) {
		var formConfig = angular.copy(environmentsConfig.form.node);
		if (currentScope.envPlatform === 'kubernetes') {
			for (var i = formConfig.entries.length - 1; i >= 0; i--) {
				if (formConfig.entries[i].name === 'port' || formConfig.entries[i].name === 'role') {
					formConfig.entries.splice(i, 1);
				}
			}
		}
		
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'addNode',
			label: 'Add New Node',
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						var postData = {
							env: currentScope.envCode,
							host: formData.ip,
							port: formData.port,
							role: formData.role
						};
						
						overlayLoading.show();
						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "post",
							"routeName": "/dashboard/cloud/nodes/add",
							"data": postData
						}, function (error, response) {
							overlayLoading.hide();
							currentScope.modalInstance.close();
							currentScope.form.formData = {};
							if (error) {
								currentScope.displayAlert('danger', error.message);
							}
							else {
								currentScope.displayAlert('success', 'Node added successfully');
								currentScope.listNodes(currentScope);
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						currentScope.modalInstance.dismiss('cancel');
						currentScope.form.formData = {};
					}
				}
			]
		};
		
		buildFormWithModal(currentScope, $modal, options);
	}
	
	function removeNode(currentScope, nodeId) {
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/cloud/nodes/remove",
			"params": {
				env: currentScope.envCode,
				nodeId: nodeId
			}
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.displayAlert('success', 'Node removed successfully');
				currentScope.listNodes(currentScope);
			}
		});
	}
	
	function updateNode(currentScope, node, type, newStatus) {
		var params = {
			env: currentScope.envCode,
			nodeId: node.id
		};
		
		var postData = {
			type: type,
			value: newStatus
		};
		
		getSendDataFromServer(currentScope, ngDataApi, {
			"method": "put",
			"routeName": "/dashboard/cloud/nodes/update",
			params: params,
			data: postData
		}, function (error, response) {
			if (error) {
				currentScope.displayAlert('danger', error.message);
			}
			else {
				currentScope.displayAlert('success', 'Node updated successfully');
				currentScope.listNodes(currentScope);
			}
		});
	}
	
	function changeTag(currentScope, node){
		var data ={};
		var formConfig = angular.copy(environmentsConfig.form.nodeTag);
		
		if(node.tag){
			data.tag = node.tag.v;
		}
		
		var options = {
			timeout: $timeout,
			form: formConfig,
			name: 'tagNode',
			label: 'Tag Node',
			data: data,
			actions: [
				{
					'type': 'submit',
					'label': translation.submit[LANG],
					'btn': 'primary',
					'action': function (formData) {
						overlayLoading.show();
						getSendDataFromServer(currentScope, ngDataApi, {
							"method": "put",
							"routeName": "/dashboard/cloud/nodes/tag",
							"data":{
								"id": node.id,
								"tag": formData.tag.v
							}
						}, function (error, response) {
							overlayLoading.hide();
							if (error) {
								currentScope.displayAlert('danger', error.message);
							}
							else {
								currentScope.modalInstance.close();
								currentScope.form.formData = {};
								currentScope.displayAlert('success', 'Node tagged successfully');
								currentScope.listNodes(currentScope);
							}
						});
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						currentScope.modalInstance.dismiss('cancel');
						currentScope.form.formData = {};
					}
				}
			]
		};
		
		buildFormWithModal(currentScope, $modal, options);
	}
	
	return {
		'listNodes': listNodes,
		'addNode': addNode,
		'removeNode': removeNode,
		'updateNode': updateNode,
		'changeTag': changeTag,
		'listInfraProviders': listInfraProviders,
		'scaleNodes': scaleNodes
	};
}]);
