"use strict";
var productizationService = soajsApp.components;
productizationService.service('aclHelpers', ['aclDrawHelpers', function (aclDrawHelpers) {
	
	function groupApisForDisplay(apisArray, apiGroupName) {
		return aclDrawHelpers.groupApisForDisplay(apisArray, apiGroupName);
	}
	
	function groupApisForPackageDisplay(apisArray, apiGroupName) {
		return aclDrawHelpers.groupApisForPackageDisplay(apisArray, apiGroupName);
	}
	
	function fillAcl(currentScope) {
		var count = 0;
		var myAcl = {};
		var envCodes = currentScope.environments_codes;
		var aclFill = currentScope.aclFill;
		envCodes.forEach(function (oneEnv) {
			if (aclFill && aclFill[oneEnv.code.toLowerCase()]) {
				if (objectIsEnv(aclFill[oneEnv.code.toLowerCase()])) {
					count++;
					myAcl[oneEnv.code.toUpperCase()] = reFormACL(aclFill[oneEnv.code.toLowerCase()]);
					propagateAcl(currentScope, myAcl[oneEnv.code.toUpperCase()]);
				}
			}
		});
		currentScope.aclFill = myAcl;
		
		overlayLoading.hide();
	}
	
	function reFormACL(acl) {
		let newForm = {};
		if (acl && Object.keys(acl).length > 0) {
			for (let service in acl) {
				if (acl.hasOwnProperty(service) && acl[service]) {
					newForm[service] = {};
					for (let version in acl[service]) {
						if (acl[service].hasOwnProperty(version) && acl[service][version]) {
							newForm[service][version] = {};
							if (acl[service][version].hasOwnProperty('apisPermission')) {
								newForm[service][version].apisPermission = acl[service][version].apisPermission;
							}
							if (acl[service][version].hasOwnProperty('access')) {
								newForm[service][version].access = acl[service][version].access;
							}
							for (var method in acl[service][version]) {
								if (acl[service][version].hasOwnProperty(method) && acl[service][version][method] && ['access', 'apisPermission'].indexOf(method) === -1 && acl[service][version][method].length > 0) {
									if (!newForm[service][version][method]) {
										newForm[service][version][method] = {};
									}
									acl[service][version][method].forEach((oneMethod) => {
										if (oneMethod.group && oneMethod.apis) {
											if (!newForm[service][version][method][oneMethod.group]) {
												newForm[service][version][method][oneMethod.group] = {
													apis: {}
												};
											}
											newForm[service][version][method][oneMethod.group].apis = oneMethod.apis;
										}
									});
								}
							}
						}
					}
				}
			}
		}
		return newForm;
	}
	
	function propagateAcl(currentScope, aclFill) {
		for (var serviceName in aclFill) {
			if (aclFill.hasOwnProperty(serviceName)) {
				var currentService = {};
				for (let group in currentScope.allServiceApis) {
					if (group && currentScope.allServiceApis[group]) {
						for (var x = 0; x < currentScope.allServiceApis[group].length; x++) {
							if (currentScope.allServiceApis[group][x].name === serviceName) {
								currentService = currentScope.allServiceApis[group][x];
								break;
							}
						}
					}
				}
				aclDrawHelpers.fillServiceAccess(aclFill[serviceName], currentService);
				aclDrawHelpers.fillServiceApiAccess(aclFill[serviceName], currentService);
			}
		}
	}
	
	function fillPackageAclGranular(currentScope) {
		var count = 0;
		var myAcl = {};
		var envCodes = currentScope.environments_codes;
		var aclFill = currentScope.aclFill;
		envCodes.forEach(function (oneEnv) {
			if (aclFill && aclFill[oneEnv.code.toLowerCase()]) {
				if (objectIsEnv(aclFill[oneEnv.code.toLowerCase()])) {
					count++;
					myAcl[oneEnv.code.toUpperCase()] = reFormPackageAclGranular(aclFill[oneEnv.code.toLowerCase()]);
					propagateAcl(currentScope, myAcl[oneEnv.code.toUpperCase()]);
				}
			}
		});
		currentScope.aclFill = myAcl;
		
		overlayLoading.hide();
	}
	
	function reFormPackageAclGranular(acl) {
		let newForm = {};
		if (acl && Object.keys(acl).length > 0) {
			for (let service in acl) {
				if (acl.hasOwnProperty(service) && acl[service]) {
					newForm[service] = {};
					for (let version in acl[service]) {
						if (acl[service].hasOwnProperty(version) && acl[service][version]) {
							newForm[service][version] = {};
							if (acl[service][version].hasOwnProperty('apisPermission')) {
								newForm[service][version].apisPermission = acl[service][version].apisPermission;
							}
							if (acl[service][version].hasOwnProperty('access')) {
								newForm[service][version].access = acl[service][version].access;
							}
							for (var method in acl[service][version]) {
								if (acl[service][version].hasOwnProperty(method) && acl[service][version][method] && ['access', 'apisPermission'].indexOf(method) === -1) {
									if (!newForm[service][version][method]) {
										newForm[service][version][method] = {};
									}
									if (acl[service][version][method].apis && Object.keys(acl[service][version][method].apis).length > 0){
										for (var api in acl[service][version][method].apis){
											if (api && acl[service][version][method].apis[api] && acl[service][version][method].apis[api].group){
												newForm[service][version][method][acl[service][version][method].apis[api].group] = {
													apis: {}
												};
												if (!newForm[service][version][method][acl[service][version][method].apis[api].group]) {
													newForm[service][version][method][acl[service][version][method].apis[api].group] = {
														apis: {}
													};
												}
												let accessObject = {};
												if (acl[service][version][method].apis[api].hasOwnProperty('access')){
													accessObject.access = acl[service][version][method].apis[api].access;
												}
												newForm[service][version][method][acl[service][version][method].apis[api].group].apis = {
													[api] : accessObject
												};
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
		return newForm;
	}
	
	function fillPackageAcl(currentScope) {
		var aclFill = angular.copy(currentScope.aclFill);
		currentScope.fixList = compareWithScope(currentScope);
		let fixAcl = {};
		for (let envS in aclFill) {
			if (aclFill[envS]) {
				let env = envS.toUpperCase();
				fixAcl[env] = {};
				for (let service in aclFill[envS]) {
					if (aclFill[envS][service]) {
						fixAcl[env][service] = {};
						if (aclFill[envS][service].length > 0) {
							aclFill[envS][service].forEach((v) => {
								if (v.version) {
									fixAcl[env][service][v.version] = {
										"include": true,
										"collapse": false
									};
									for (let method in v) {
										if (v[method] && method !== "version") {
											if (v[method].length > 0) {
												v[method].forEach((group) => {
													if (!fixAcl[env][service][v.version][group]) {
														fixAcl[env][service][v.version][group] = {};
													}
													fixAcl[env][service][v.version][group][method] = true;
												});
											}
										}
									}
								}
							});
						}
					}
				}
			}
		}
		currentScope.aclFill = fixAcl;
		overlayLoading.hide();
	}
	
	function reFormPackACL(acl) {
		let newForm = {};
		if (acl && Object.keys(acl).length > 0) {
			for (let service in acl) {
				if (acl.hasOwnProperty(service) && acl[service]) {
					newForm[service] = {};
					for (let version in acl[service]) {
						if (acl[service].hasOwnProperty(version) && acl[service][version]) {
							newForm[service][version] = {};
							if (acl[service][version].apisPermission) {
								newForm[service][version].apisPermission = acl[service][version].apisPermission;
							}
							for (var method in acl[service][version]) {
								if (acl[service][version].hasOwnProperty(method) && acl[service][version][method] && ['access', 'apisPermission'].indexOf(method) === -1 && acl[service][version][method].length > 0) {
									acl[service][version][method].forEach((oneMethod) => {
										if (oneMethod.group && oneMethod.apis) {
											if (!newForm[service][version][oneMethod.group]) {
												newForm[service][version][oneMethod.group] = [];
											}
											if (newForm[service][version][oneMethod.group].indexOf(method) === -1) {
												newForm[service][version][oneMethod.group].push(method);
											}
										}
									});
								}
							}
						}
					}
				}
			}
		}
		return newForm;
	}
	
	function compareWithScope(currentScope) {
		let scopeAcl = angular.copy(currentScope.scopeFill);
		let allServiceApis = angular.copy(currentScope.allServiceApis);
		let serviceList = {};
		let groups = [];
		allServiceApis.forEach((service) => {
			serviceList[service.name] = {};
			if (service.versions && Object.keys(service.versions).length > 0) {
				for (let version in service.versions) {
					serviceList[service.name][version] = {};
					serviceList[service.name]["%serviceGroup%"] = service.group;
					if (groups.indexOf(service.group) === -1) {
						groups.push(service.group);
					}
					if (service.versions[version] && service.versions[version].apis) {
						service.versions[version].apis.forEach((oneApi) => {
							serviceList[service.name][version][oneApi.v + "%%" + oneApi.m + "%%"] = { // this is used only to allow same rout different method
								m: oneApi.m,
								group: oneApi.group ? oneApi.group : "General"
							}
						});
					}
				}
			}
		});
		let fixList = {};
		let reformedScope = {};
		currentScope.serviceGroup = [];
		if (scopeAcl && Object.keys(scopeAcl.length > 0)) {
			for (let env in scopeAcl) {
				if (scopeAcl.hasOwnProperty(env) && scopeAcl[env]) {
					fixList[env] = {};
					reformedScope = reFormPackACL(scopeAcl[env]);
					
					groups.forEach((oneGroup) => {
						fixList[env][oneGroup] = {};
					});
					for (let service in scopeAcl[env]) {
						if (scopeAcl[env].hasOwnProperty(service)) {
							if (serviceList && serviceList[service] && serviceList[service]["%serviceGroup%"]) {
								let group = serviceList[service]["%serviceGroup%"];
								if (currentScope.serviceGroup.indexOf(group) === -1) {
									currentScope.serviceGroup.push(group);
								}
								fixList[env][group][service] = {};
								for (let version in scopeAcl[env][service]) {
									fixList[env][group][service][version] = {};
									if (scopeAcl[env][service].hasOwnProperty(version)) {
										if (scopeAcl[env][service][version].apisPermission === "restricted") {
											fixList[env][group][service][version] = reformedScope[service][version];
										} else {
											for (let api in serviceList[service][version]) {
												if (api !== "%serviceGroup%" && serviceList[service][version] && serviceList[service][version][api]) {
													if (!fixList[env][group][service][version][serviceList[service][version][api].group]) {
														fixList[env][group][service][version][serviceList[service][version][api].group] = [];
													}
													if (fixList[env][group][service][version][serviceList[service][version][api].group].indexOf(serviceList[service][version][api].m) === -1) {
														fixList[env][group][service][version][serviceList[service][version][api].group].push(serviceList[service][version][api].m);
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
		return fixList
	}
	
	
	function applyPermissionRestriction(aclFill) {
		aclDrawHelpers.applyApiRestriction(aclFill);
	}
	
	function checkForGroupDefault(scope, envCode, service, grp, val, myApi, v) {
		var aclFill = scope.aclFill[envCode];
		aclDrawHelpers.checkForGroupDefault(aclFill, service, grp, val, myApi, v);
	}
	
	function constructAclFromPost(aclFill, pak) {
		var aclObj = {};
		for (var envCode in aclFill) {
			aclObj[envCode.toLowerCase()] = {};
			if (!pak) {
				var result = aclFromPostPerEnv(aclFill[envCode.toUpperCase()], aclObj[envCode.toLowerCase()]);
			} else if(pak === "apiGroup"){
				var result = aclFromPostPackPerEnv(aclFill[envCode.toUpperCase()], aclObj[envCode.toLowerCase()]);
			}
			else {
				var result = aclFromPostPackGranularPerEnv(aclFill[envCode.toUpperCase()], aclObj[envCode.toLowerCase()]);
			}
			
			if (!result.valid) {
				return result;
			}
			if (Object.keys(aclObj[envCode.toLowerCase()]).length === 0) {
				delete aclObj[envCode.toLowerCase()];
			}
		}
		if (result && result.valid) {
			result.data = aclObj;
			
		}
		else if (!result && pak === 'granular') {
			result =  {
				valid : true,
				data: {}
			};
		}
		return result;
	}
	
	function aclFromPostPerEnv(aclEnvFill, aclEnvObj) {
		if (!aclDrawHelpers.prepareSaveObject(aclEnvFill, aclEnvObj).valid) {
			return {'valid': false, 'data': aclEnvObj};
		}
		
		return {'valid': true, 'data': aclEnvObj};
	}
	
	function aclFromPostPackPerEnv(aclEnvFill, aclEnvObj) {
		if (!aclDrawHelpers.prepareSaveObjectPack(aclEnvFill, aclEnvObj).valid) {
			return {'valid': false, 'data': aclEnvObj};
		}
		
		return {'valid': true, 'data': aclEnvObj};
	}
	
	function aclFromPostPackGranularPerEnv(aclEnvFill, aclEnvObj) {
		if (!aclDrawHelpers.prepareSaveObjectPackGranular(aclEnvFill, aclEnvObj).valid) {
			return {'valid': false, 'data': aclEnvObj};
		}
		
		return {'valid': true, 'data': aclEnvObj};
	}
	
	return {
		'groupApisForDisplay': groupApisForDisplay,
		'fillAcl': fillAcl,
		'fillPackageAcl': fillPackageAcl,
		'fillPackageAclGranular': fillPackageAclGranular,
		'applyPermissionRestriction': applyPermissionRestriction,
		'checkForGroupDefault': checkForGroupDefault,
		'constructAclFromPost': constructAclFromPost,
		'groupApisForPackageDisplay': groupApisForPackageDisplay
	}
}]);