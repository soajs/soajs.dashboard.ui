'use strict';

let infraCertificateConfig = {
	permissions: {
		list: ['dashboard', '/infra', 'get'],
		removeCertificate: ['dashboard', '/infra/extras', 'delete'],
		addCertificate: ['dashboard', '/infra/extras', 'post'],
		importCertificate: ['dashboard', '/infra/extras', 'post']
	}
};
