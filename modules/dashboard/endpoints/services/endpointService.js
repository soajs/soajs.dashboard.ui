"use strict";
var secretsApp = soajsApp.components;
secretsApp.service('endpointService', ['ngDataApi', '$timeout', '$window', function (ngDataApi, $timeout, $window) {
	
	function processSoaJSON(data, soa, main) {
		data.type = soa.type ? soa.type : 'service';
		data.serviceName = soa.serviceName;
		data.serviceGroup = soa.serviceGroup;
		data.servicePort = soa.servicePort;
		if (soa.maintenance && soa.maintenance.port && soa.maintenance.readiness) {
			data.port = soa.maintenance.port.value;
			data.readiness = soa.maintenance.readiness;
		}
		
		if (soa.requestTimeout) {
			data.requestTimeout = soa.requestTimeout;
		}
		if (soa.requestTimeoutRenewal) {
			data.requestTimeoutRenewal = soa.requestTimeoutRenewal;
		}
		if (soa.program) {
			data.program = soa.program;
		}
		
		if (soa.description) {
			data.description = soa.description;
		}
		
		if (soa.tab) {
			data.tab = soa.tab;
		}
		
		if (soa.tags) {
			data.tags = soa.tags;
		}
		
		if (soa.attributes) {
			data.attributes = soa.attributes;
		}
		if (!main){
			//if no serviceVersion was provided, default to 1
			let version = soa.serviceVersion || 1;
			if (!data.versions) {
				data.versions = {
					[version]: {}
				};
			}
			processSoaVersion (data.versions[version], soa);
		}
	}
	
	function processSoaVersion (data, soa){
		data.extKeyRequired = soa.hasOwnProperty("extKeyRequired") ? !!soa.extKeyRequired : true; //default is true
		data.oauth = soa.hasOwnProperty("oauth") ? !!soa.oauth : false; //default is false
		data.session = soa.hasOwnProperty("session") ? !!soa.session : false; //default is false
		data.urac = soa.hasOwnProperty("urac") ? !!soa.urac : false; //default is false
		data.urac_Profile = soa.hasOwnProperty("urac_Profile") ? !!soa.urac_Profile : false; //default is false
		data.urac_ACL = soa.hasOwnProperty("urac_ACL") ? !!soa.urac_ACL : false; //default is false
		data.provision_ACL = soa.hasOwnProperty("provision_ACL") ? !!soa.provision_ACL : false; //default is false
	}
	
	function checkSoaVersion (version, newVersion){
		let result = {
				allowed : true,
				reason: []
		};
		if (newVersion.type !== version.type){
			result.allowed = false;
			result.reason.push("type")
		}
		if (newVersion.serviceName !== version.serviceName){
			result.allowed = false;
			result.reason.push("Service Names")
		}
		if (newVersion.serviceGroup !== version.serviceGroup){
			result.allowed = false;
			result.reason.push("Service Groups")
		}
		if (newVersion.servicePort !== version.servicePort){
			result.allowed = false;
			result.reason.push("Service Ports")
		}
		return result
	}
	
	return {
		'processSoaJSON': processSoaJSON,
		'processSoaVersion': processSoaVersion,
		'checkSoaVersion': checkSoaVersion
	}
}]);
