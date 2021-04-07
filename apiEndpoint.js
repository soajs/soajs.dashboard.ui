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