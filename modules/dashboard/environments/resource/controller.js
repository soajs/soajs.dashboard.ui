"use strict";
let resourceCtrl = soajsApp.components;
resourceCtrl.controller('resourceCtrl', ['$scope', '$cookies', 'ngDataApi', 'injectFiles', '$modal', '$timeout', '$localStorage',
	function ($scope, $cookies, ngDataApi, injectFiles, $modal, $timeout, $localStorage) {
		$scope.$parent.isUserLoggedIn();
		$scope.access = {};
		constructModulePermissions($scope, $scope.access, environmentsConfig.permissions);
		
		let localConfig = {
			data: {
				type: [
					{'v': 'cluster', 'l': "Cluster"},
					{'v': 'cdn', 'l': "CDN"},
					{'v': 'system', 'l': "System"},
					{'v': 'authorization', 'l': "Authorization"},
					{'v': 'other', 'l': "Other"}
				],
				category: {
					"cluster": [
						{
							'v': 'mongo', 'l': "Local/External Mongo",
							"schema": {
								"servers": [
									{
										"host": "",
										"port": 27017
									},
									{
										"host": "",
										"port": 27017
									},
									{
										"host": "",
										"port": 27017
									}
								],
								"credentials": {
									"username": "",
									"password": ""
								},
								"URLParam": {
									"readPreference": "secondaryPreferred",
									"replicaSet": "console-shard-0",
									"w": "majority",
									"ha": true,
									"ssl": true,
									"authSource": "admin",
									"useUnifiedTopology": true
								},
								"extraParam": {},
								"streaming": {}
							}
						},
						{
							'v': 'elasticsearch', 'l': "Local/External ElasticSearch",
							"schema": {
								"servers": [
									{
										"host": "",
										"port": 9200
									}
								],
								"credentials": {
									"username": "",
									"password": ""
								},
								"URLParam": {},
								"extraParam": {}
							}
						},
						{
							'v': 'objectrocket_mongo', 'l': "Object Rocket - Mongo SAAS",
							"schema": {
								"servers": [
									{
										"host": "",
										"port": 27017
									},
									{
										"host": "",
										"port": 27017
									},
									{
										"host": "",
										"port": 27017
									}
								],
								"credentials": {
									"username": "",
									"password": ""
								},
								"URLParam": {
									"readPreference": "secondaryPreferred",
									"replicaSet": "console-shard-0",
									"w": "majority",
									"ha": true,
									"ssl": true,
									"authSource": "admin",
									"useUnifiedTopology": true
								},
								"extraParam": {},
								"streaming": {}
							}
						},
						{
							'v': 'objectrocket_elasticsearch', 'l': "Object Rocket - ElasticSearch SAAS",
							"schema": {
								"servers": [
									{
										"host": "",
										"port": 9200
									}
								],
								"credentials": {
									"username": "",
									"password": ""
								},
								"URLParam": {},
								"extraParam": {}
							}
						},
						{
							'v': 'mysql', 'l': "MySQL",
							"schema": {
								"servers": [
									{
										"host": "",
										"port": 3306
									}
								],
								"credentials": {
									"username": "",
									"password": ""
								},
								"properties": {}
							}
						},
						{
							'v': 'sql', 'l': "SQL",
							"schema": {
								"servers": [
									{
										"host": "",
										"port": 1434
									}
								],
								"credentials": {
									"username": "",
									"password": ""
								},
								"properties": {}
							}
						},
						{
							'v': 'oracle', 'l': "Oracle",
							"schema": {
								"servers": [
									{
										"host": "",
										"port": 1521
									}
								],
								"credentials": {
									"username": "",
									"password": ""
								},
								"properties": {}
							}
						},
						{'v': 'other', 'l': "Other"}
					],
					"cdn": [
						
						{
							'v': 'amazons3', 'l': "Amazon S3",
							"schema": {
								"host": "http://files.parse.com/...",
								"bucket": "my.unique.bucket.name",
								"key": "My Key...",
								"expires": "60",
								"acl": "public-read"
							}
						},
						{
							'v': 'rackspace', 'l': "Rackspace",
							"schema": {
								"servers": {
									"host": "127.0.0.1",
									"port": 4000
								},
								"credentials": {
									"username": "Username ...",
									"apiKey": "My API Key..."
								},
								"servicenet": true
							}
						},
						{'v': 'other', 'l': "Other"}
					],
					"system": [
						{'v': 'other', 'l': "Other"},
					],
					"authorization": [
						{
							'v': 'basicauth', 'l': "Basic Auth",
							"schema": {
								"username": "",
								"password": ""
							}
						},
						{
							'v': 'soapbasicauth', 'l': "SOAP Basic Auth",
							"schema": {
								"SOAPApi": "",
								"username": "",
								"password": ""
							}
						},
						{
							'v': 'digestauth',
							'l': "Digest Auth",
							"schema": {
								"username": "",
								"password": "",
								"realm": "",
								"nonce": "",
								"algorithm": "",
								"qop": "",
								"noncecount": "",
								"clientnonce": "",
								"opaque": ""
							}
						},
						{
							'v': 'oauth1', 'l': "Oauth 1",
							"schema": {
								"consumerKey": "",
								"consumerSecret": "",
								"token": "",
								"tokenSecret": "",
								"signatureMethod": "",
								"timestamp": "",
								"nonce": "",
								"version": "",
								"realm": ""
							}
						},
						{
							'v': 'oauth2', 'l': "Oauth 2",
							"schema": {
								"callbackUrl": "",
								"tokenName": "",
								"authUrl": "",
								"accessTokenUrl": "",
								"clientId": "",
								"clientSecret": "",
								"scope": "",
								"grantType": ""
							}
						},
						{
							'v': 'hawkauth', 'l': "Hawk Auth",
							"schema": {
								"hawkAuthId": "",
								"hawkAuthKey": "",
								"algorithm": "",
								"user": "",
								"nonce": "",
								"extraData": "",
								"appId": "",
								"delegation": "",
								"timestamp": ""
							}
						},
						{
							'v': 'awssignature', 'l': "AWS Signature",
							"schema": {
								"username": "",
								"password": ""
							}
						},
						{'v': 'custom', 'l': "Custom"},
					],
					"other": [
						{'v': 'custom', 'l': "Custom"}
					]
				}
			}
		};
		
		function openModal(options) {
			let currentScope = $scope;
			$modal.open({
				templateUrl: options.templateUrl,
				size: 'lg',
				backdrop: true,
				keyboard: true,
				controller: function ($scope, $modalInstance) {
					$scope.formData = {};
					$scope.access = currentScope.access;
					$scope.environments = angular.copy($localStorage.environments);
					$scope.message = {};
					
					// For edit
					if (options.item) {
						$scope.formData = options.item;
					}
					for (let i = 0; i < $scope.environments.length; i++) {
						if ($scope.formData.sharedEnvs) {
							if ($scope.formData.sharedEnvs [$scope.environments[i].code]) {
								$scope.environments[i].selected = true;
							}
						}
						if ($scope.environments[i].code === currentScope.envCode) {
							$scope.environments[i].hidden = true;
						}
					}
					fixBackDrop();
					overlayLoading.show();
					$scope.displayAlert = function (type, message) {
						$scope.message[type] = message;
						setTimeout(function () {
							$scope.message = {};
						}, 5000);
					};
					$scope.cancel = function () {
						if ($modalInstance) {
							$modalInstance.close();
						}
					};
					$scope.submit = function () {
						if (options.submit) {
							options.submit($scope, $modalInstance);
						}
					};
					$scope.changed = function (type, value) {
						if (options.changed) {
							options.changed($scope, $modalInstance, type, value)
						}
					};
					// let aceCustomRegistry = {
					// 	"name": 'customRegistry',
					// 	"height": '16px',
					// 	"firstTime": true
					// };
					$scope.options = {
						aceEditorConfig: {
							maxLines: Infinity,
							minLines: 1,
							useWrapMode: true,
							showGutter: true,
							mode: 'json',
							firstLineNumber: 1,
							onLoad: function (_editor) {
								_editor.$blockScrolling = Infinity;
								_editor.scrollToLine(0, true, true);
								_editor.scrollPageUp();
								_editor.clearSelection();
								_editor.setShowPrintMargin(false);
								_editor.setHighlightActiveLine(false);
								$scope.editor = _editor;
								// const heightUpdateFunction = function () {
								// 	let newHeight =
								// 		_editor.getSession().getScreenLength()
								// 		* _editor.renderer.lineHeight
								// 		+ _editor.renderer.scrollBar.getWidth();
								//
								// 	if (aceCustomRegistry.fixedHeight) {
								// 		newHeight = parseInt(aceCustomRegistry.height);
								// 	}
								// 	else if (parseInt(aceCustomRegistry.height) && parseInt(aceCustomRegistry.height) > newHeight) {
								// 		newHeight = parseInt(aceCustomRegistry.height);
								// 	}
								// 	try {
								// 		if ($scope.formData && $scope.formData.config && aceCustomRegistry.firstTime) {
								// 			aceCustomRegistry.firstTime = false;
								// 			let screenLength = 1;
								// 			if (typeof JSON.parse($scope.formData.config) === 'object') {
								// 				_editor.session.setMode("ace/mode/json");
								// 				screenLength = Object.keys(JSON.parse($scope.formData.config)).length * 16;
								// 				if (screenLength > 1) {
								// 					screenLength += 32;
								// 				} else {
								// 					$scope.displayAlert('Invalid Config JSON Object');
								// 				}
								// 			}
								// 			if (screenLength > newHeight) {
								// 				newHeight = screenLength;
								// 			}
								// 		} else {
								// 			aceCustomRegistry.firstTime = false;
								// 		}
								// 	} catch (e) {
								// 		console.log(e);
								// 		$scope.displayAlert('Invalid Config JSON Object');
								// 	}
								// 	_editor.renderer.scrollBar.setHeight(newHeight.toString() + "px");
								// 	_editor.renderer.scrollBar.setInnerHeight(newHeight.toString() + "px");
								// 	$timeout(function () {
								// 		jQuery('#' + aceCustomRegistry.name).height(newHeight.toString());
								// 		_editor.resize(true);
								// 	}, 5);
								// };
								// heightUpdateFunction();
								// $timeout(function () {
								// 	_editor.heightUpdate = heightUpdateFunction();
								// 	// Set initial size to match initial content
								// 	heightUpdateFunction();
								//
								// 	// Whenever a change happens inside the ACE editor, update
								// 	// the size again
								// 	_editor.getSession().on('change', heightUpdateFunction);
								// }, 2000);
							}
						}
					};
					overlayLoading.hide();
				}
			});
		}
		
		$scope.edit = function (item) {
			let options = {
				"templateUrl": "editResource.tmpl",
				"item": angular.copy(item),
				"submit": function (modalScope, modalInstance) {
					if (!modalScope.formData.name || !modalScope.formData.config) {
						modalScope.displayAlert('danger', "Please fill in all required fields!");
					} else {
						let itemConfig = modalScope.formData.config;
						if (!modalScope.textMode) {
							try {
								itemConfig = JSON.parse(modalScope.formData.config);
							} catch (e) {
								modalScope.displayAlert('Invalid JSON Object');
								return;
							}
						}
						modalScope.formData.shared = !!modalScope.formData.shared;
						modalScope.formData.plugged = !!modalScope.formData.plugged;
						modalScope.formData.sharedEnvs = {};
						if (modalScope.formData.shared) {
							for (let i = 0; i < modalScope.environments.length; i++) {
								if (modalScope.environments[i].selected) {
									modalScope.formData.sharedEnvs[modalScope.environments[i].code] = true;
								}
							}
						}
						getSendDataFromServer(modalScope, ngDataApi, {
							"method": "put",
							"routeName": "/console/registry/resource",
							"data": {
								"id": modalScope.formData._id,
								"env": item.created,
								"data": {
									"name": modalScope.formData.name,
									"plugged": modalScope.formData.plugged,
									"shared": modalScope.formData.shared,
									"sharedEnvs": modalScope.formData.sharedEnvs,
									"type": modalScope.formData.type,
									"category": modalScope.formData.category,
									"config": itemConfig
								}
							}
						}, function (error) {
							if (error) {
								modalScope.displayAlert('danger', error.message);
							}
							else {
								item.name = modalScope.formData.name;
								item.plugged = modalScope.formData.plugged;
								item.shared = modalScope.formData.shared;
								if (modalScope.formData.sharedEnvs) {
									item.sharedEnvs = modalScope.formData.sharedEnvs;
								}
								item.config = modalScope.formData.config;
								modalScope.displayAlert('success', "Resource Configuration has been updated.");
								$scope.$parent.displayAlert('success', "Resource Configuration has been updated.");
								if (modalInstance) {
									modalInstance.close();
								}
							}
						});
					}
				}
			};
			if (options.item && options.item.config && typeof(options.item.config) === 'object') {
				options.item.config = JSON.stringify(options.item.config, null, 2);
			}
			openModal(options);
		};
		$scope.add = function () {
			let options = {
				"templateUrl": "addResource.tmpl",
				"item": {
					"types": localConfig.data.type,
					"categories": localConfig.data.category
				},
				"changed": function (modalScope, modalInstance, type, value) {
					if (modalScope.formData.configValueSchema !== value) {
						modalScope.formData.configValueSchema = value;
						if (localConfig.data[type] && localConfig.data[type][modalScope.formData.type]) {
							let schema_found = false;
							for (let i = 0; i < localConfig.data[type][modalScope.formData.type].length; i++) {
								if (localConfig.data[type][modalScope.formData.type][i].v === value) {
									if (localConfig.data[type][modalScope.formData.type][i].schema) {
										options.item.config = JSON.stringify(localConfig.data[type][modalScope.formData.type][i].schema, null, 2);
										schema_found = true;
									}
								}
							}
							if (!schema_found) {
								options.item.config = null;
							}
						}
					}
				},
				"submit": function (modalScope, modalInstance) {
					if (!modalScope.formData.name || !modalScope.formData.type || !modalScope.formData.category || !modalScope.formData.config) {
						modalScope.displayAlert('danger', "Please fill in all required fields!");
					} else {
						let itemConfig = modalScope.formData.config;
						if (!modalScope.textMode) {
							try {
								itemConfig = JSON.parse(modalScope.formData.config);
							} catch (e) {
								modalScope.displayAlert('Invalid JSON Object');
								return;
							}
						}
						modalScope.formData.shared = !!modalScope.formData.shared;
						modalScope.formData.plugged = !!modalScope.formData.plugged;
						if (modalScope.formData.shared) {
							for (let i = 0; i < modalScope.environments.length; i++) {
								if (modalScope.environments[i].selected) {
									if (!modalScope.formData.sharedEnvs) {
										modalScope.formData.sharedEnvs = {};
									}
									modalScope.formData.sharedEnvs[modalScope.environments[i].code] = true;
								}
							}
						}
						getSendDataFromServer(modalScope, ngDataApi, {
							"method": "post",
							"routeName": "/console/registry/resource",
							"data": {
								"env": $scope.envCode,
								"data": {
									"name": modalScope.formData.name,
									"plugged": modalScope.formData.plugged,
									"shared": modalScope.formData.shared,
									"sharedEnvs": modalScope.formData.sharedEnvs,
									"type": modalScope.formData.type,
									"category": modalScope.formData.category,
									"config": itemConfig
								}
							}
						}, function (error) {
							if (error) {
								modalScope.displayAlert('danger', error.message);
							}
							else {
								modalScope.displayAlert('success', "Resource Configuration has been added.");
								$scope.$parent.displayAlert('success', "Resource Configuration has been added.");
								if (modalInstance) {
									modalInstance.close();
								}
							}
						});
					}
				}
			};
			openModal(options);
		};
		
		$scope.plug = function (item, plugged) {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "put",
				"routeName": "/console/registry/resource",
				"data": {
					"id": item._id,
					"data": {
						"plugged": plugged
					}
				}
			}, function (error) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
				}
				else {
					item.plugged = plugged;
					$scope.$parent.displayAlert('success', "Resource has been " + (plugged ? "plugged." : "un-plugged."));
				}
			});
		};
		
		$scope.delete = function (item) {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "delete",
				"routeName": "/console/registry/resource",
				"data": {
					"id": item._id,
					"env": item.created
				}
			}, function (error) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
				}
				else {
					$scope.$parent.displayAlert('success', "Resource has been deleted.");
				}
			});
		};
		
		$scope.get = function () {
			getSendDataFromServer($scope, ngDataApi, {
				"method": "get",
				"routeName": "/console/registry/resource",
				"params": {
					"env": $scope.envCode
				}
			}, function (error, response) {
				if (error) {
					$scope.$parent.displayAlert('danger', error.code, true, 'console', error.message);
				}
				else {
					$scope.listItems = response || null;
				}
			});
		};
		$scope.openSettings = function (item) {
			$scope.$parent.go("#/resource/configDetailView/" + item._id.toString(), "_blank");
		};
		if ($cookies.getObject('myEnv', {'domain': interfaceDomain})) {
			$scope.envCode = $cookies.getObject('myEnv', {'domain': interfaceDomain}).code;
			if ($scope.envCode) {
				$scope.get();
			}
		}
		
		injectFiles.injectCss("modules/dashboard/environments/environments.css");
	}]);
