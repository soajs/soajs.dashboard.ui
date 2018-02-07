"use strict";

Object.defineProperty(Object.prototype, "renameProperty", {
	value: function (oldName, newName) {
		if (oldName == newName) {
			return this;
		}
		if (this.hasOwnProperty(oldName)) {
			this[newName] = this[oldName];
			delete this[oldName];
		}
		return this;
	},
	enumerable: false
});
// Object.prototype.renameProperty = function (oldName, newName) {
// 	if (oldName == newName) {
// 		return this;
// 	}
// 	if (this.hasOwnProperty(oldName)) {
// 		this[newName] = this[oldName];
// 		delete this[oldName];
// 	}
// 	return this;
// };

var servicesApp = soajsApp.components;
servicesApp.controller('endpointController', ['$scope', '$timeout', '$modal', '$compile', 'ngDataApi', 'injectFiles', '$cookies', 'Upload', '$routeParams', '$localStorage', 'swaggerParser', 'swaggerClient', function ($scope, $timeout, $modal, $compile, ngDataApi, injectFiles, $cookies, Upload, $routeParams, $localStorage, swaggerParser, swaggerClient) {
	$scope.$parent.isUserLoggedIn();
	
	$scope.tempo = {
		selectedResources: {}, // one array per endpoint
		editEnabled: {}, // per ep per schema per route
		switchView: {}, // per ep // swagger or imfv
		swagger: {} // per ep
	};
	
	$scope.wizard = {};
	
	$scope.access = {};
	constructModulePermissions($scope, $scope.access, servicesConfig.permissions);
	
	$scope.showHide = function (service) {
		if (!service.hide) {
			jQuery('#s_' + service._id + " .body").slideUp();
			service.icon = 'plus';
			service.hide = true;
			jQuery('#s_' + service._id + " .header").addClass("closed");
		}
		else {
			jQuery('#s_' + service._id + " .body").slideDown();
			jQuery('#s_' + service._id + " .header").removeClass("closed");
			service.icon = 'minus';
			service.hide = false;
		}
	};
	
	$scope.switchView = function (mainType, ep) {
		let routeName;
		let bodyParams = {
			"id": ep._id,
			mainType
		};
		
		if ($scope.tempo.switchView[ep._id] === 'swagger') {
			$scope.tempo.switchView[ep._id] = 'imfv';
			routeName = "/dashboard/apiBuilder/convertSwaggerToImfv";
			bodyParams.swagger = ep.swaggerInput;
		} else {
			$scope.tempo.switchView[ep._id] = 'swagger';
			routeName = "/dashboard/apiBuilder/convertImfvToSwagger";
			bodyParams.schema = ep.schema;
		}
		
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			"method": "post",
			"routeName": routeName,
			"params": {},
			 data: bodyParams
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.message, true, 'dashboard');
			}
			else {
				if(response.data){
					ep.swaggerInput = response.data;
				}else{
					ep.schema = response.schema;
				}
				
			}
		});
	};
	
	$scope.onEditEndpoint = function (mainType, id) {
		$scope.$parent.go("#/endpoints/addEditEndpoint/" + id);
	};
	
	$scope.onEnableEdit = function (endpointId, schemaKey, routeKey) {
		let p = $scope.tempo.editEnabled;
		
		if (!p[endpointId]) {
			p[endpointId] = {};
		}
		if (!p[endpointId][schemaKey]) {
			p[endpointId][schemaKey] = {};
		}
		if (!p[endpointId][schemaKey][routeKey]) {
			p[endpointId][schemaKey][routeKey] = false;
		}
		
		p[endpointId][schemaKey][routeKey] = !p[endpointId][schemaKey][routeKey];
	};
	
	$scope.collapse = function (x) {
		x.collapsed = !x.collapsed;
	};
	
	$scope.recursiveGetImfv = function (input, parent, parentObj, xxKeyxx) {
		
		if (input.xxKeyxx === xxKeyxx) {
			$scope.currentImfvOnEdit = parent; // parent will hold the key of the imfv object
			$scope.currentImfvParentOnEdit = parentObj;
		}
		
		if (input.type === 'object') {
			let props = Object.keys(input.properties);
			props.forEach(function (each, index) {
				$scope.recursiveGetImfv(input.properties[props[index]], each, input.properties, xxKeyxx);
			});
		}
		
		if (input.items && input.items.type === 'object' && input.items.properties) {
			let props = Object.keys(input.items.properties);
			props.forEach(function (each, index) {
				$scope.recursiveGetImfv(input.items.properties[props[index]], each, input.items.properties, xxKeyxx);
			});
		}
		
		if (input.validation && input.validation.type === 'object') {
			let props = Object.keys(input.validation.properties);
			props.forEach(function (each, index) {
				$scope.recursiveGetImfv(input.validation.properties[props[index]], each, input.validation.properties, xxKeyxx);
			});
		}
	};
	
	$scope.setCurrentImfvOnEdit = function (mainType, endpoint, schemaKey, routeKey, xxKeyxx, isCommonField) {
		$scope.currentImfvOnEdit = ""; // clean
		$scope.currentImfvParentOnEdit = {}; // clean
		$scope.currentImfvRoot = {}; // clean
		$scope.currentEp = {}; // clean
		
		let imfv = endpoint.schema[schemaKey][routeKey].imfv;
		let data = imfv.custom;
		$scope.currentImfvRoot = imfv;
		$scope.currentEp = endpoint;
		
		if (isCommonField) {
			data = imfv.tempoCommonFields;
		}
		
		let mainInputs = Object.keys(data);
		mainInputs.forEach(function (each) {
			$scope.recursiveGetImfv(data[each], each, data, xxKeyxx);
		});
	};
	
	$scope.onDeleteImfv = function (mainType, endpoint, schemaKey, routeKey, inputKey, input, xxKeyxx, isCommonField) {
		$scope.setCurrentImfvOnEdit(mainType, endpoint, schemaKey, routeKey, xxKeyxx, isCommonField);
		delete $scope.currentImfvParentOnEdit[$scope.currentImfvOnEdit];
		
		if (isCommonField) {
			let commonFields = endpoint.schema[schemaKey][routeKey].imfv.commonFields;
			commonFields.forEach(function (eachCom, index) {
				if (eachCom === $scope.currentImfvOnEdit) {
					commonFields.splice(index, 1);
					// u can break
				}
			});
			
			// if no one else is using it delete it from common fields
			let usedAtLeastonce = false;
			let allSchemasKeys = Object.keys(endpoint.schema);
			allSchemasKeys.forEach(function (eachSchema) {
				if (eachSchema !== 'commonFields') {
					let allRoutes = Object.keys(endpoint.schema[eachSchema]);
					allRoutes.forEach(function (route) {
						let common = endpoint.schema[eachSchema][route].imfv.commonFields;
						if (common && common.indexOf($scope.currentImfvOnEdit) !== -1) {
							usedAtLeastonce = true;
							// u can break
						}
					});
				}
			});
			
			if (!usedAtLeastonce) {
				delete endpoint.schema.commonFields[$scope.currentImfvOnEdit];
			}
		}
	};
	
	$scope.updateSchemas = function (mainType, endpoint) {
		// todo: reconsider commonFields clean up algorithm
		
		let schemas = angular.copy(endpoint.schema);
		let allCommonFieldsInEp = {};
		
		let allSchemasKeys = Object.keys(endpoint.schema);
		allSchemasKeys.forEach(function (eachSchema) {
			if (eachSchema !== 'commonFields') {
				let allRoutes = Object.keys(endpoint.schema[eachSchema]);
				allRoutes.forEach(function (route) {
					let cleanedImfv = $scope.cleanImfv(angular.copy(endpoint.schema[eachSchema][route].imfv));
					let thisSchema = schemas[eachSchema];
					thisSchema[route].imfv.custom = cleanedImfv.customImfv;
					delete thisSchema[route].imfv.tempoCommonFields;
					
					let thisRouteCommonFieldsUpdates = cleanedImfv.commonImfv;
					if (thisRouteCommonFieldsUpdates) {
						let thisRouteCommonFieldsUpdatesKeys = Object.keys(thisRouteCommonFieldsUpdates);
						thisRouteCommonFieldsUpdatesKeys.forEach(function (eachCom) {
							allCommonFieldsInEp[eachCom] = thisRouteCommonFieldsUpdates[eachCom]; // they will probably come from different routes but no worries
						});
					}
				});
			} else {
				let commonFields = $scope.cleanCommonFieldsImfv(schemas.commonFields);
			}
		});
		
		overlayLoading.show();
		getSendDataFromServer($scope, ngDataApi, {
			"method": "put",
			"routeName": "/dashboard/apiBuilder/updateSchemas",
			"data": {
				mainType,
				"endpointId": endpoint._id,
				"schemas": schemas
			}
		}, function (error, response) {
			overlayLoading.hide();
			if (error) {
				$scope.$parent.displayAlert('danger', error.message, true, 'dashboard');
			}
			else {
				$scope.displayAlert('success', 'Schema updated successfully');
			}
		});
	};
	
	$scope.onAddEditRoute = function (endpoint, schemaKey, routeKey) {
		
		let oldRoute;
		if (routeKey) { // on edit
			oldRoute = endpoint.schema[schemaKey][routeKey];
		}
		
		let config = {
			entries: []
		};
		
		let selectValues = [];
		
		config.entries.push({
			'name': 'api',
			'label': 'Api Route',
			'type': 'string',
			'required': true,
			'value': routeKey || ''
		});
		
		config.entries.push({
			'name': 'apiInfo',
			'label': 'Api Info',
			'type': 'string',
			'required': true,
			'value': oldRoute ? oldRoute._apiInfo.l : ''
		});
		
		config.entries.push({
			'name': 'apiGroup',
			'label': 'Api Group',
			'type': 'string',
			'required': true,
			'value': oldRoute ? oldRoute._apiInfo.group : ''
		});
		
		let data = {};
		let currentScope = $scope;
		
		var options = {
			timeout: $timeout,
			form: config,
			'name': 'addRoute',
			'label': 'Add Route',
			'data': data,
			'actions': [
				{
					'type': 'submit',
					'label': 'Add',
					'btn': 'primary',
					'action': function (formData) {
						
						function generateApi(apiInfo, apiGroup) {
							return {
								"_apiInfo": {
									"l": apiInfo,
									"group": apiGroup
								},
								"imfv": {
									"commonFields": [],
									"custom": {},
									"tempoCommonFields": {}
								}
							};
						}
						
						if (formData.api.charAt(0) === '/') {
							formData.api = formData.api.substring(1, formData.api.length);
						}
						
						if (routeKey) { // on edit
							endpoint.schema[schemaKey]['/' + formData.api] = generateApi(formData.apiInfo, formData.apiGroup);
							if (('/' + formData.api) !== routeKey) { // new key
								delete endpoint.schema[schemaKey][routeKey];
							}
						} else { // on add new
							endpoint.schema[schemaKey]['/' + formData.api] = generateApi(formData.apiInfo, formData.apiGroup);
						}
						currentScope.modalInstance.dismiss('cancel');
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						currentScope.modalInstance.dismiss('cancel');
					}
				}
			]
		};
		buildFormWithModal(currentScope, $modal, options);
	};
	
	$scope.deleteSchema = function (endpoint, schemaKey) {
		delete endpoint.schema[schemaKey];
	};
	
	$scope.onAddCommonField = function (mainType, onEdit, isAddInArray, isCommonField, endpoint, schemaKey, routeKey, inputKey, input, xxKeyxx) {
		
		$scope.setCurrentImfvOnEdit(mainType, endpoint, schemaKey, routeKey, xxKeyxx, isCommonField); // on edit, still, it would be set for parents object
		
		let config = {
			entries: []
		};
		
		// maybe on init
		if (!$scope.currentEp.schema.commonFields) {
			$scope.currentEp.schema.commonFields = {};
		}
		
		let availableCommonFields = Object.keys($scope.currentEp.schema.commonFields);
		let selectValues = [];
		selectValues.push({
			group: 'New',
			v: 'xxNewxx',
			l: 'Create New Input',
			selected: true
		});
		
		availableCommonFields.forEach(function (eachCom) {
			selectValues.push({
				group: "Use Existing",
				v: eachCom,
				l: eachCom,
				selected: false
			});
		});
		
		config.entries.push({
			'name': 'commonField',
			'label': 'Common Field',
			"type": "select",
			'required': false,
			"value": selectValues
		});
		
		
		let data = {};
		let currentScope = $scope;
		
		var options = {
			timeout: $timeout,
			form: config,
			'name': 'addEditImfv',
			'label': 'Add / Edit Common Field',
			'data': data,
			'actions': [
				{
					'type': 'submit',
					'label': 'Add',
					'btn': 'primary',
					'action': function (formData) {
						if (formData.commonField === 'xxNewxx') {
							$scope.onEditImfv(mainType, onEdit, isAddInArray, isCommonField, endpoint, schemaKey, routeKey, inputKey, input, xxKeyxx);
						} else {
							if (!$scope.currentImfvRoot.commonFields) {
								$scope.currentImfvRoot.commonFields = {};
							}
							
							$scope.currentImfvRoot.commonFields.push(formData.commonField);
							$scope.currentImfvRoot.tempoCommonFields[formData.commonField] = $scope.currentEp.schema.commonFields[formData.commonField];
						}
						
						currentScope.modalInstance.dismiss('cancel');
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						currentScope.modalInstance.dismiss('cancel');
					}
				}
			]
		};
		buildFormWithModal(currentScope, $modal, options);
	};
	
	$scope.onEditImfv = function (mainType, onEdit, isAddInArray, isCommonField, endpoint, schemaKey, routeKey, inputKey, input, xxKeyxx) {
		
		$scope.setCurrentImfvOnEdit(mainType, endpoint, schemaKey, routeKey, xxKeyxx, isCommonField); // on edit, still, it would be set for parents object
		
		// let onRoot = inputKey === null && input === null && xxKeyxx === null; // from add key
		let onRoot = (!input || input.inTreeLevel === 1);
		
		// ******* input will hold the parents object on add new *******
		if (!onEdit && input) {
			onRoot = input.inTreeLevel === 0;
		}
		
		let key = $scope.currentImfvOnEdit || '';
		let type = input ? (input.validation ? input.validation.type : input.type) : '';
		let required = input ? input.required : false;
		let source = input ? input.source : null;
		let arrayItems = (onEdit && input) ? (input.items ? input.items.type : '') : '';
		
		let selectedSourcesCleaned = [];
		
		if (onEdit) {
			if (source) {
				source.forEach(function (eachSource) {
					if (eachSource.includes("body.")) {
						selectedSourcesCleaned.push("body");
					}
					
					if (eachSource.includes("query.")) {
						selectedSourcesCleaned.push("query");
					}
					
					if (eachSource.includes("params.")) {
						selectedSourcesCleaned.push("headers");
					}
				});
			}
		} else {
			key = '';
			type = '';
			required = false;
		}
		
		let config = {
			entries: []
		};
		
		config.entries.push({
			'name': 'key',
			'label': 'Key',
			'type': 'string',
			'required': true,
			'value': key
		});
		
		config.entries.push({
			'name': 'type',
			'label': 'Type',
			"type": "select",
			'required': true,
			"value": [
				{"v": "string", "l": "String", selected: (type === 'string')},
				{"v": "float", "l": "Float", selected: (type === 'float')},
				{"v": "integer", "l": "Integer", selected: (type === 'integer')},
				{"v": "boolean", "l": "Boolean", selected: (type === 'boolean')},
				{"v": "array", "l": "Array", selected: (type === 'array')},
				{"v": "object", "l": "Object", selected: (type === 'object')}
			],
			'onAction': function (id, data) {
				if (data === "array") {
					jQuery("#addEditImfv #arrayItems-wrapper").slideDown();
				}
				else {
					jQuery("#addEditImfv #arrayItems-wrapper").slideUp();
				}
			}
		});
		
		config.entries.push({
			'name': 'arrayItems',
			'label': 'Items',
			"type": "select",
			"value": [
				{"v": "string", "l": "String", selected: (arrayItems === 'string')},
				{"v": "object", "l": "Object", selected: (arrayItems === 'object')}
			]
		});
		
		config.entries.push({
			'name': 'required',
			'label': 'Is Required',
			'type': 'radio',
			'value': [{'v': 'true', 'selected': required}, {'v': 'false', 'selected': !required}],
		});
		
		if (onRoot) {
			let sourceOptions = [
				{
					v: 'query',
					l: 'Query',
					selected: (selectedSourcesCleaned.indexOf('query') !== -1)
				}, {
					v: 'body',
					l: 'Body',
					selected: (selectedSourcesCleaned.indexOf('body') !== -1)
				}, {
					v: 'headers',
					l: 'Headers',
					selected: (selectedSourcesCleaned.indexOf('headers') !== -1)
				}
			];
			config.entries.push({
				'name': 'source',
				'label': 'Source',
				'type': 'checkbox',
				'value': sourceOptions
			});
		}
		
		let data = {};
		let currentScope = $scope;
		
		var options = {
			timeout: $timeout,
			form: config,
			'name': 'addEditImfv',
			'label': 'Add / Edit IMFV',
			'data': data,
			"postBuild": function () {
				if ((onEdit && input) ? (input.type === "array") : false) {
					jQuery("#addEditImfv #arrayItems-wrapper").slideDown(); // show array items
				}
				else {
					jQuery("#addEditImfv #arrayItems-wrapper").slideUp();
				}
			},
			'actions': [
				{
					'type': 'submit',
					// 'label': onEdit ? 'Update IMFV' : 'Add IMFV',
					'label': 'Save',
					'btn': 'primary',
					'action': function (formData) {
						
						let sourceReformatted; // if applicable
						if (formData.source) {
							sourceReformatted = [];
							formData.source.forEach(function (eachSourceSelected) {
								let sourceType = eachSourceSelected;
								if (eachSourceSelected === 'headers') {
									sourceType = 'params';
								}
								sourceReformatted.push(`${sourceType}.${formData.key}`);
							});
						}
						if (onRoot) {
							if (!sourceReformatted || sourceReformatted.length < 1) {
								alert('You need to select at least 1 source type');
								return;
							}
						}
						
						if (formData.type === 'array') {
							if (!formData.arrayItems) {
								alert("missing array of items"); // todo?
								return;
							} else {
								if (!formData.items) {
									formData.items = {
										type: formData.arrayItems
									};
								} else {
									formData.items.type = formData.arrayItems;
								}
								
							}
						}
						
						let key = String(formData.key);
						delete formData.key;
						
						if (onEdit) {
							let newObject = JSON.parse(JSON.stringify($scope.currentImfvParentOnEdit[$scope.currentImfvOnEdit])); // old one
							if (sourceReformatted) {
								newObject.source = sourceReformatted;
							}
							
							if (newObject.validation) {
								newObject.validation.type = formData.type;
							} else {
								newObject.type = formData.type;
							}
							
							// applicable for arrays only
							newObject.items = formData.items;
							
							// some stuff are in validation some are not even for first level objects
							newObject.required = formData.required;
							
							delete $scope.currentImfvParentOnEdit[$scope.currentImfvOnEdit];
							$scope.currentImfvParentOnEdit[key] = newObject;
							
							if (isCommonField) {
								let schemaz = Object.keys($scope.currentEp.schema);
								schemaz.forEach(function (each) {
									if (each !== 'commonFields') {
										let routes = $scope.currentEp.schema[each];
										let routesKeyz = Object.keys(routes);
										routesKeyz.forEach(function (eachRoute) {
											let imfv = routes[eachRoute].imfv;
											if (imfv) {
												let commonFields = imfv.commonFields;
												if (commonFields) {
													commonFields.forEach(function (eachCom, index) {
														if (eachCom === $scope.currentImfvOnEdit) {
															commonFields.splice(index, 1);
															// u can break
														}
													});
													commonFields.push(key);
												}
												
												if (imfv.tempoCommonFields[$scope.currentImfvOnEdit]) {
													if (key !== $scope.currentImfvOnEdit) {
														delete imfv.tempoCommonFields[$scope.currentImfvOnEdit];
													}
													imfv.tempoCommonFields[key] = $scope.currentImfvParentOnEdit[key];
												}
											}
										});
									}
								});
								
								// if ($scope.currentEp.schema.commonFields[$scope.currentImfvOnEdit]) { // key unchanged
								if (key === $scope.currentImfvOnEdit) { // key unchanged
									$scope.currentEp.schema.commonFields[key] = $scope.currentImfvParentOnEdit[key];
								} else {
									delete $scope.currentEp.schema.commonFields[$scope.currentImfvOnEdit];
									$scope.currentEp.schema.commonFields[key] = $scope.currentImfvParentOnEdit[key];
								}
							}
						} else {
							formData.collapsed = false;
							formData.xxKeyxx = random_number;
							formData.inTreeLevel = input ? (input.inTreeLevel + 1) : 1;
							random_number++;
							
							if (sourceReformatted) {
								formData.source = sourceReformatted;
							}
							
							if (onRoot) {
								formData.validation = {
									type: formData.type
								};
								delete formData.type;
							}
							
							if (formData.type === 'object' || (formData.validation && formData.validation.type === 'object')) {
								if (onRoot) {
									formData.validation.properties = {};
								} else {
									formData.properties = {};
								}
							}
							
							if (isAddInArray) {
								if (!$scope.currentImfvParentOnEdit[$scope.currentImfvOnEdit].items.properties) {
									$scope.currentImfvParentOnEdit[$scope.currentImfvOnEdit].items.properties = {};
								}
								$scope.currentImfvParentOnEdit[$scope.currentImfvOnEdit].items.properties[key] = formData;
							} else {
								if (onRoot) {
									let imfv = endpoint.schema[schemaKey][routeKey].imfv;
									
									let data = imfv.custom;
									if (isCommonField) {
										data = imfv.tempoCommonFields;
										if (!imfv.commonFields) { // todo: move it to main init
											imfv.commonFields = {};
										}
										imfv.commonFields.push(key);
										endpoint.schema.commonFields[key] = formData;
									}
									
									data[key] = formData;
								} else {
									if ($scope.currentImfvParentOnEdit[$scope.currentImfvOnEdit].validation) {
										$scope.currentImfvParentOnEdit[$scope.currentImfvOnEdit].validation.properties[key] = formData;
									} else {
										$scope.currentImfvParentOnEdit[$scope.currentImfvOnEdit].properties[key] = formData;
									}
								}
							}
						}
						
						currentScope.modalInstance.dismiss('cancel');
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						currentScope.modalInstance.dismiss('cancel');
					}
				}
			]
		};
		buildFormWithModal(currentScope, $modal, options);
		
		
	};
	
	$scope.isAddSchemaAvailable = function (endpoint) {
		let standardSchemas = ["get", "post", "put", "delete"];
		let alreadyAdded = Object.keys(endpoint.schema);
		let count = 0;
		standardSchemas.forEach(function (std) {
			if (alreadyAdded.indexOf(std) === -1) {
				count++;
			}
		});
		
		return count !== 0;
	};
	
	$scope.addSchema = function (endpoint) {
		
		let alreadyAdded = Object.keys(endpoint.schema);
		
		let standardSchemas = ["get", "post", "put", "delete"];
		
		let config = {
			entries: []
		};
		
		let selectValues = [];
		
		standardSchemas.forEach(function (std) {
			if (alreadyAdded.indexOf(std) === -1) {
				selectValues.push({
					v: std,
					l: std,
					selected: false
				});
			}
		});
		
		config.entries.push({
			'name': 'schemaKey',
			'label': 'Schema Key',
			"type": "select",
			'required': true,
			"value": selectValues
		});
		
		
		let data = {};
		let currentScope = $scope;
		
		var options = {
			timeout: $timeout,
			form: config,
			'name': 'addSchema',
			'label': 'Add Schema',
			'data': data,
			'actions': [
				{
					'type': 'submit',
					'label': 'Add',
					'btn': 'primary',
					'action': function (formData) {
						endpoint.schema[formData.schemaKey] = {};
						$scope.setActiveTab(formData.schemaKey);
						currentScope.modalInstance.dismiss('cancel');
					}
				},
				{
					'type': 'reset',
					'label': translation.cancel[LANG],
					'btn': 'danger',
					'action': function () {
						currentScope.modalInstance.dismiss('cancel');
					}
				}
			]
		};
		buildFormWithModal(currentScope, $modal, options);
	};
	
	$scope.recursiveCleanImfv = function (input) {
		delete input.collapsed;
		delete input.xxKeyxx;
		delete input.inTreeLevel;
		delete input.arrayItems; // in case of arrays
		
		if (input.type === 'object') {
			let props = Object.keys(input.properties);
			props.forEach(function (each, index) {
				$scope.recursiveCleanImfv(input.properties[props[index]]);
			});
		}
		
		if (input.items && input.items.type === 'object' && input.items.properties) {
			let props = Object.keys(input.items.properties);
			props.forEach(function (each, index) {
				$scope.recursiveCleanImfv(input.items.properties[props[index]]);
			});
		}
		
		if (input.validation && input.validation.type === 'object') {
			if (input.validation.properties) {
				let props = Object.keys(input.validation.properties);
				props.forEach(function (each, index) {
					$scope.recursiveCleanImfv(input.validation.properties[props[index]]);
				});
			}
		}
	};
	
	$scope.cleanCommonFieldsImfv = function (imfv) {
		let mainInputs = Object.keys(imfv);
		mainInputs.forEach(function (each) {
			$scope.recursiveCleanImfv(imfv[each]);
		});
	};
	
	$scope.cleanImfv = function (imfv) {
		let customImfv = imfv.custom;
		let mainInputs = Object.keys(customImfv);
		mainInputs.forEach(function (each) {
			$scope.recursiveCleanImfv(customImfv[each]);
		});
		
		// todo : i think should be done one time only!
		let commonImfv = imfv.tempoCommonFields;
		let mainCommonInputs = Object.keys(commonImfv);
		mainCommonInputs.forEach(function (each) {
			$scope.recursiveCleanImfv(commonImfv[each]);
		});
		
		let output = {
			customImfv,
			commonImfv
		};
		
		return output;
	};
	
	$scope.addNewEndpoint = function (mainType) {
		if (mainType === 'services') {
			$scope.$parent.go("#/swaggerEditor");
		} else {
			$scope.$parent.go("#/endpoints/addEditEndpoint/new");
		}
	};
	
	$scope.setActiveTab = function (schemaTab) {
		sessionStorage.setItem("schemaTab", schemaTab);
	};
	
	$scope.getActiveTab = function () {
		return sessionStorage.getItem("schemaTab");
	};
	
	$scope.isActiveTab = function (tabName, index) {
		let schemaTab = $scope.getActiveTab();
		return (schemaTab === tabName || (schemaTab === null && index === 0));
	};
	
	$scope.onDeleteRoute = function (endpoint, schemaKey, routeKey) {
		delete endpoint.schema[schemaKey][routeKey];
	};
	
	$scope.onUpdateResources = function (mainType, serviceName, authUsed, endpointId, schemaKey, routeKey) {
		
		var currentScope = $scope;
		$modal.open({
			templateUrl: "updateResources.tmpl",
			size: 'lg',
			backdrop: true,
			keyboard: true,
			controller: function ($scope, $modalInstance) {
				$scope.title = 'Update authentication';
				$scope.availableResources = currentScope.tempo.selectedResources[serviceName];
				
				$scope.availableResources.forEach(function (each) {
					each.isSelected = each.name === authUsed;
				});
				
				$scope.selectResource = function (index) {
					$scope.availableResources.forEach(function (each, currentIndex) {
						each.isSelected = (index === currentIndex);
					});
				};
				
				$scope.onSubmit = function () {
					
					let authenticationSelected;
					for (var i = 0; i < $scope.availableResources.length; i++) {
						if ($scope.availableResources[i].isSelected) {
							authenticationSelected = $scope.availableResources[i].name;
						}
					}
					
					overlayLoading.show();
					getSendDataFromServer($scope, ngDataApi, {
						"method": "post",
						"routeName": "/dashboard/apiBuilder/authentication/update",
						"data": {
							mainType,
							"endpointId": endpointId,
							"schemaKey": schemaKey,
							"routeKey": routeKey,
							"authentication": authenticationSelected
						}
					}, function (error, response) {
						overlayLoading.hide();
						$modalInstance.close();
						if (error) {
							$scope.$parent.displayAlert('danger', error.message, true, 'dashboard');
						}
						else {
							currentScope.displayAlert('success', 'Authentication updated successfully');
							currentScope.listEndpoints('endpoints');
						}
					});
				};
				
				$scope.closeModal = function () {
					$modalInstance.close();
				};
			}
		});
	};
	/*
	 $scope.listBronzo = function () {
	 getSendDataFromServer($scope, ngDataApi, {
	 "method": "get",
	 "routeName": "/dashboard/apiBuilder/",
	 "uri": "http://localhost:4000/endpoint.generator/list",
	 "params": {
	 "includeEnvs": true
	 }
	 }, function (error, response) {
	 if (error) {
	 $scope.$parent.displayAlert('danger', error.code, true, 'dashboard', error.message);
	 }
	 else {
	 if (!$scope.grid) {
	 $scope.grid = {};
	 }
	 
	 if (!$scope.grid.rows) {
	 $scope.grid.rows = {};
	 }
	 
	 $scope.grid.rows.Bronzo = [
	 {
	 "_id": '5a5df6254bb5bd09d64406f2',
	 "type": "service",
	 "prerequisites": {
	 "cpu": " ",
	 "memory": " "
	 },
	 "swagger": true,
	 "serviceName": "testService_bronzo",
	 "serviceGroup": "ssss",
	 "serviceVersion": 1,
	 "servicePort": 4444,
	 "requestTimeout": 1,
	 "requestTimeoutRenewal": 1,
	 "extKeyRequired": false,
	 "injection": true,
	 "oauth": false,
	 "urac": false,
	 "urac_Profile": false,
	 "urac_ACL": false,
	 "provision_ACL": false,
	 "session": false,
	 "errors": {},
	 "schema": {}
	 }
	 ];
	 
	 $scope.envs = response.envs; // ???
	 
	 response.records.forEach(function (endpoint) {
	 if (endpoint.authentications) {
	 $scope.tempo.selectedResources[endpoint.serviceName] = endpoint.authentications;
	 } else {
	 $scope.tempo.selectedResources[endpoint.serviceName] = [];
	 }
	 });
	 
	 $scope.setActiveTab('get');
	 $scope.setInitialImfvs(response.records);
	 }
	 });
	 };
	 */
	
	$scope.listEndpoints = function (mainType) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "get",
			"routeName": "/dashboard/apiBuilder/list",
			"params": {
				mainType
			}
		}, function (error, response) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.message, true, 'dashboard');
			}
			else {
				if (!$scope.grid) {
					$scope.grid = {};
				}
				
				if (!$scope.grid.rows) {
					$scope.grid.rows = {};
				}
				
				$scope.grid.rows[mainType] = response.records;
				
				$scope.envs = response.envs; // ???
				
				response.records.forEach(function (endpoint) {
					if (endpoint.authentications) {
						$scope.tempo.selectedResources[endpoint.serviceName] = endpoint.authentications;
					} else {
						$scope.tempo.selectedResources[endpoint.serviceName] = [];
					}
				});
				
				$scope.setActiveTab('get');
				$scope.setInitialImfvs(response.records);
			}
		});
	};
	
	let random_number = 1;
	
	$scope.recursiveInitImfv = function (input, inTreeLevel) {
		input.collapsed = true;
		input.xxKeyxx = random_number;
		input.inTreeLevel = inTreeLevel;
		random_number++;
		
		if (input.type === 'object') {
			inTreeLevel++;
			let props = Object.keys(input.properties);
			props.forEach(function (each, index) {
				$scope.recursiveInitImfv(input.properties[props[index]], inTreeLevel);
			});
		}
		
		// todo: if that's it : include it in the first condition
		if (input.items && input.items.type === 'object' && input.items.properties) {
			inTreeLevel++;
			let props = Object.keys(input.items.properties);
			props.forEach(function (each, index) {
				$scope.recursiveInitImfv(input.items.properties[props[index]], inTreeLevel);
			});
		}
		
		if (input.validation && input.validation.type === 'object') {
			inTreeLevel++;
			
			if (input.validation.properties) {
				let props = Object.keys(input.validation.properties);
				props.forEach(function (each, index) {
					$scope.recursiveInitImfv(input.validation.properties[props[index]], inTreeLevel);
				});
			}
		}
		
	};
	
	$scope.isNotEmpty = function (obj) {
		if (obj && Object.keys(obj).length > 0) {
			return true;
		} else {
			return false;
		}
	};
	
	$scope.setInitialImfvs = function (endpoints) {
		endpoints.forEach(function (endpoint) {
			if (endpoint.schema) {
				let schemas = Object.keys(endpoint.schema);
				schemas.forEach(function (schema) {
					let apis = Object.keys(endpoint.schema[schema]);
					apis.forEach(function (api) {
						let imfv = endpoint.schema[schema][api].imfv;
						
						if (imfv) {
							let custom = imfv.custom;
							if (!custom) {
								imfv.custom = {};
								custom = imfv.custom;
							}
							
							let mainInputs = Object.keys(custom);
							mainInputs.forEach(function (each) {
								$scope.recursiveInitImfv(custom[each], 1);
							});
							
							
							let commonFields = imfv.commonFields;
							imfv.tempoCommonFields = {}; // object // similar to custom // will hold common fields complete objects
							if (commonFields) {
								commonFields.forEach(function (eachCommon) {
									if (!endpoint.schema.commonFields || !endpoint.schema.commonFields[eachCommon]) {
										alert('warning! common field not found!');
									} else {
										imfv.tempoCommonFields[eachCommon] = endpoint.schema.commonFields[eachCommon];
									}
								});
								
								let mainCommonInputs = Object.keys(imfv.tempoCommonFields);
								mainCommonInputs.forEach(function (each) {
									$scope.recursiveInitImfv(imfv.tempoCommonFields[each], 1);
								});
							}
						}
					});
				});
			}
		});
	};
	
	$scope.onRemoveEndpoint = function (mainType, id) {
		getSendDataFromServer($scope, ngDataApi, {
			"method": "delete",
			"routeName": "/dashboard/apiBuilder/delete",
			"params": {
				mainType,
				id
			}
		}, function (error) {
			if (error) {
				$scope.$parent.displayAlert('danger', error.message, true, 'dashboard');
			} else {
				$scope.$parent.displayAlert('success', "Endpoint deleted successfully");
				$scope.listEndpoints(mainType);
			}
		});
	};
	
	//open new tab having the swagger ui to test our APIs
	$scope.swaggerTest = function (serviceName) {
		$scope.$parent.go("#/services/swaggerui/" + serviceName, "_blank");
	};
	
	// swagger stuff
	$scope.collapseExpand = function (epId) {
		if (!$scope.tempo.swagger[epId]) {
			$scope.tempo.swagger[epId] = {};
		}
		
		$scope.tempo.swagger[epId].collapsed = !$scope.tempo.swagger[epId].collapsed;
	};
	
	$scope.clearYamlRight = function (epId) {
		$scope.tempo.swagger[epId].schemaCodeF = "";
	};
	
	/*
	 * This function updates the host value of the swagger simulator and check if the YAML code is valid so it will
	 * enable the generate button.
	 */
	function watchSwaggerSimulator(cb) {
		//grab the swagger info
		var x = swaggerParser.fetch();
		if (!x || x.length === 0 || typeof(x[3]) !== 'object' || Object.keys(x[3]).length === 0) {
			$timeout(function () {
				watchSwaggerSimulator(cb);
			}, 100);
		}
		else {
			var dashboardDomain = apiConfiguration.domain.replace(window.location.protocol + "//", "");
			//modify the host value with the domain value of dashboard taken dynamically from the main config.js
			x[3].host = dashboardDomain;
			x[3].info.host = dashboardDomain;
			x[3].basePath = "/dashboard/swagger/simulate";
			x[3].info.basePath = "/dashboard/swagger/simulate";
			console.log("switching to host and basepath to swagger simulate api in dashboard:", x[3].host + x[3].basePath);
			$scope.swaggerCode = x[4];
			//apply the changes
			swaggerParser.execute.apply(null, x);
			return cb(null, true);
		}
	}
	
	$scope.moveYamlRight = function (endpoint) {
		if (!$scope.tempo.swagger[endpoint._id]) {
			$scope.tempo.swagger[endpoint._id] = {};
		}
		
		$scope.tempo.swagger[endpoint._id].schemaCodeF = endpoint.swaggerInput;
		console.log($scope.tempo.swagger);
		watchSwaggerSimulator(function () {
			console.log("swagger ui info has been updated");
		});
	};
	
	$scope.aceLoaded = function (_editor) {
		$scope.editor = _editor;
		_editor.setShowPrintMargin(false);
	};
	
	if ($scope.access.listEndpoints) {
		injectFiles.injectCss("modules/dashboard/endpoints/endpoints.css");
		$scope.listEndpoints('endpoints');
		$scope.listEndpoints('services');
	}
}]);