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
					myAcl[oneEnv.code.toUpperCase()] = aclFill[oneEnv.code.toLowerCase()];
					propagateAcl(currentScope, myAcl[oneEnv.code.toUpperCase()]);
				}
			}
		});
		
		if (count === 0) {
			//old schema
			myAcl[envCodes[0].code.toUpperCase()] = aclFill;
			propagateAcl(currentScope, myAcl[envCodes[0].code.toUpperCase()]);
			envCodes.forEach(function (oneEnv) {
				if (oneEnv.code !== envCodes[0].code) {
					myAcl[oneEnv.code.toUpperCase()] = angular.copy(myAcl[envCodes[0].code]);
				}
			});
			currentScope.msg.type = 'warning';
			currentScope.msg.msg = translation.warningMsgAcl[LANG];
		}
		currentScope.aclFill = myAcl;
		
		overlayLoading.hide();
	}
	
	function propagateAcl(currentScope, aclFill) {
		for (var serviceName in aclFill) {
			if (aclFill.hasOwnProperty(serviceName)) {
				var currentService = {};
				for (var x = 0; x < currentScope.allServiceApis.length; x++) {
					if (currentScope.allServiceApis[x].name === serviceName) {
						currentService = currentScope.allServiceApis[x];
						break;
					}
				}
				aclDrawHelpers.fillServiceAccess(aclFill[serviceName], currentService);
				aclDrawHelpers.fillServiceApiAccess(aclFill[serviceName], currentService);
				aclDrawHelpers.applyApiRestriction(aclFill, currentService);
			}
		}
	}
	
	function fillPackageAcl(currentScope) {
		var aclFill = angular.copy(currentScope.aclFill);
		currentScope.fixList = compareWithScope(currentScope);
		let fixAcl = {};
		for (let envS in aclFill){
			if (aclFill[envS]){
				let env = envS.toUpperCase();
				fixAcl[env]= {};
				for (let service in aclFill[envS]){
					if (aclFill[envS][service]){
						fixAcl[env][service]= {};
						if (aclFill[envS][service].length > 0){
							aclFill[envS][service].forEach((v)=>{
								if (v.version){
									fixAcl[env][service][v.version] = {
										"include": true,
										"collapse": false
									};
									for (let method in v){
										if (v[method] && method !== "version"){
											if(v[method].length > 0){
												v[method].forEach((group)=>{
													if (!fixAcl[env][service][v.version][group]){
														fixAcl[env][service][v.version][group] = {};
													}
													fixAcl[env][service][v.version][group][method]= true;
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
	
	function compareWithScope(currentScope) {
		let scopeAcl = angular.copy(currentScope.scopeFill);
		let allServiceApis = angular.copy(currentScope.allServiceApis);
		let serviceList = {};
		let groups = [];
		allServiceApis.forEach((service)=>{
			serviceList[service.name] = {};
			if (service.versions && Object.keys(service.versions).length > 0){
				for (let version in service.versions){
					serviceList[service.name][version] = {};
					serviceList[service.name]["%serviceGroup%"] = service.group;
					if (groups.indexOf(service.group) === -1){
						groups.push(service.group);
					}
					if (service.versions[version] && service.versions[version].apis){
						service.versions[version].apis.forEach((oneApi)=>{
							serviceList[service.name][version][oneApi.v] = {
								m: oneApi.m,
								group: oneApi.group? oneApi.group : "General"
							}
						});
					}
				}
			}
		});
		let fixList = {};
		currentScope.serviceGroup = [];
		if (scopeAcl && Object.keys(scopeAcl.length > 0)){
			for (let env in scopeAcl){
				if(scopeAcl.hasOwnProperty(env)){
					fixList[env] = {};
					groups.forEach((oneGroup)=>{
						fixList[env][oneGroup] = {};
					});
					for (let service in scopeAcl[env]){
						if(scopeAcl[env].hasOwnProperty(service)){
							let group = serviceList[service]["%serviceGroup%"];
							if (currentScope.serviceGroup.indexOf(group) === -1){
								currentScope.serviceGroup.push(group);
							}
							fixList[env][group][service] = {};
							for (let version in scopeAcl[env][service]) {
								fixList[env][group][service] = {
									[version] : {}
								};
								if (scopeAcl[env][service].hasOwnProperty(version)) {
									if (scopeAcl[env][service][version].apisPermission === "restricted" && (scopeAcl[env][service][version].get || scopeAcl[env][service][version].post || scopeAcl[env][service][version].delete || scopeAcl[env][service][version].put)){
										let methods = ["get", "post", "delete", "put"];
										methods.forEach((oneMethod)=>{
											if(scopeAcl[env][service][version][oneMethod] && scopeAcl[env][service][version][oneMethod].apis){
												for (let api in scopeAcl[env][service][version][oneMethod].apis){
													if (scopeAcl[env][service][version][oneMethod].apis.hasOwnProperty(api)){
														
														if (serviceList[service][version] && serviceList[service][version][api]){
															if (!fixList[env][group][service][version][serviceList[service][version][api].group]){
																fixList[env][group][service][version][serviceList[service][version][api].group] = [];
															}
															if (fixList[env][group][service][version][serviceList[service][version][api].group].indexOf(oneMethod) === -1){
																fixList[env][group][service][version][serviceList[service][version][api].group].push(oneMethod);
															}
														}
													}
												}
											}
										});
									}
									else {
										for (let api in serviceList[service][version]){
											if (api !== "%serviceGroup%" && serviceList[service][version] && serviceList[service][version][api]){
												if (!fixList[env][group][service][version][serviceList[service][version][api].group]){
													fixList[env][group][service][version][serviceList[service][version][api].group] = [];
												}
												if (fixList[env][group][service][version][serviceList[service][version][api].group].indexOf(serviceList[service][version][api].m) === -1){
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
		return fixList
	}
	
	
	function applyPermissionRestriction(scope, envCode, service) {
		var aclFill = scope.aclFill[envCode];
		aclDrawHelpers.applyApiRestriction(aclFill, service);
	}
	
	function checkForGroupDefault(scope, envCode, service, grp, val, myApi, v) {
		var aclFill = scope.aclFill[envCode];
		aclDrawHelpers.checkForGroupDefault(aclFill, service, grp, val, myApi, v);
	}
	
	function constructAclFromPost(aclFill, pak) {
		var aclObj = {};
		for (var envCode in aclFill) {
			aclObj[envCode.toLowerCase()] = {};
			if (!pak){
				var result = aclFromPostPerEnv(aclFill[envCode.toUpperCase()], aclObj[envCode.toLowerCase()]);
			}
			else {
				var result = aclFromPostPackPerEnv(aclFill[envCode.toUpperCase()], aclObj[envCode.toLowerCase()]);
			}
			
			if (!result.valid) {
				return result;
			}
			if (Object.keys(aclObj[envCode.toLowerCase()]).length === 0) {
				delete aclObj[envCode.toLowerCase()];
			}
		}
		if (result.valid) {
			result.data = aclObj;
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
	
	return {
		'groupApisForDisplay': groupApisForDisplay,
		'fillAcl': fillAcl,
		'fillPackageAcl': fillPackageAcl,
		'applyPermissionRestriction': applyPermissionRestriction,
		'checkForGroupDefault': checkForGroupDefault,
		'constructAclFromPost': constructAclFromPost,
		'groupApisForPackageDisplay': groupApisForPackageDisplay
	}
}]);