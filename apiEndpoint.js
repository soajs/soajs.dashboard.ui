function getAPIDomain() {
	let d = location.host;
	d = d.split(":")[0];
	if (d === "localhost") {
		return d;
	}
	if (location.port && parseInt(location.port)) {
		if (location.port === "4005") {
			return d;
		}
	}
	d = d.split(".");
	d.shift();
	d = d.join(".");
	return d;
}

function getAPIPort() {
	let protocol = window.location.protocol;
	let p = (protocol === 'https:') ? 443 : 80;
	if (location.port && parseInt(location.port)) {
		if (location.port === "4005") {
			p = "4000";
		} else {
			p = location.port;
		}
	}
	return p;
}

let myPort = "4000";
let myDomainAPI = "";
const myDomain = getAPIDomain();
if (myDomain !== "localhost") {
	myPort = getAPIPort();
}
if (customSettings.api && customSettings.api !== "") {
	myDomainAPI = customSettings.api + ".";
}

window.apiSettings = {
	"api": window.location.protocol + '//' + myDomainAPI + myDomain + ":" + myPort,
	"key": customSettings.key
}; 
// window.apiSettings = {
// 	"api": "https://console-api.findnell.com",
// 	"key": "b20c4f9a1c2b1c87c9b5d3a905d642fd114a8d6e5a5ac8b4383b1a3cc22f1889d0f319d5a4e1105d39116933a9784f8779d679a7e6cb932c6e062021585abcbc477ae2f9653624828b6323acbeb9bf986c3abc20ee832626e281eaa3da107758"
// };