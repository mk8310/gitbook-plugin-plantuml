var fs = require('fs');
var re = /^```uml((.*\n)+?)?```$/img;
var crypto = require('crypto');
var path = require('path');
var https = require('https');
var qs = require('querystring');

require('shelljs/global');

module.exports = {
	hooks: {
		"init": function () {
			var output = this.output;
			var umlPath = output.resolve('assets/images/uml');

			mkdir('-p', umlPath);
		},
		"page:before": function (page) {
			var output = this.output;
			var content = page.content;

			var umls = [];
			while ((match = re.exec(content))) {
				var rawBlock = match[0];
				var umlBlock = match[1];
				var md5 = crypto.createHash('md5').update(umlBlock).digest('hex');
				var svgPath = path.join('assets', 'images', 'uml', md5 + '.svg');
				umls.push({
					rawBlock: match[0],
					umlBlock: match[1],
					svgPath: svgPath
				});
			}

			Promise.all([umls.map(uml => {
				var svgTag = '![](/' + uml.svgPath + ')';
				page.content = content = content.replace(uml.rawBlock, svgTag);

				return output.hasFile(uml.svgPath).then(exists => {
					if (!exists) {
						return new Promise((resolve, reject) => {
							https.request({
								host: 'plantuml-service.herokuapp.com',
								path: '/svg/' + qs.escape(uml.umlBlock)
							}, (res) => {
								var ws = fs.createWriteStream(output.resolve(uml.svgPath));
								res.pipe(ws);
								res.on('end', resolve);
							}).end();
						});
					}
				})
			})]);

			return page;
		},

		"page": function (page) { return page; },
		"page:after": function (page) { return page; }
	}
};