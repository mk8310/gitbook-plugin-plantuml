const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const https = require('https');
const http = require('http');
const zlib = require('zlib');

const plantUml = require('./plantuml_encode');

require('shelljs/global');

let options;

const plantumlServerEscape = (block) => {
  //UTF8
  const toDeflate = unescape(encodeURIComponent(block));
  const deflated = zlib.deflateRawSync(toDeflate, {level: 9});
  return plantUml.encode64(deflated);
};

const createUML = async (content, uml, output) => {
  const svgTag = `![](/${uml.svgPath});`
  content = content.replace(uml.rawBlock, svgTag);
  await output.hasFile(uml.svgPath).then(exists => {
    if (!exists) {
      return new Promise(resolve => {
        const client = options.protocol === 'https' ? https : http;

        let path = options.path;
        let method = 'GET';
        if (options.type === 'plantuml-server') {
          path = options.path + '/' + plantumlServerEscape(uml.umlBlock);
        } else {
          method = 'POST';
        }

        const req = client.request({method: method, host: options.host, port: options.port, path: path}, res => {
          const ws = fs.createWriteStream(output.resolve(uml.svgPath));
          res.pipe(ws);
          res.on('end', resolve);
        })
        if (method === 'POST') req.write(uml.umlBlock);
        req.end();
      });
    }
  });
  return content;
};

module.exports = {
  hooks: {
    'init': function() {
      const output = this.output;
      const config = this.config.values.pluginsConfig['plantuml-cloud'];
      options = {
        umlPath:  config.umlPath || 'assets/images/uml',
        type: config.type || 'plantuml-service',
        host: config.host || 'plantuml-service.herokuapp.com',
        port: config.port || 80,
        protocol: config.protocol ||'https',
        path: config.path || '/svg',
        blockRegex: config.blockRegex || '^```uml((.*[\r\n])+?)?```$'
      };
      const umlPath = output.resolve(options.umlPath);
      mkdir('-p', umlPath);
    },
    'page:before': async function(page) {
      let content = page.content;
      const output = this.output;

      const umls = [];
      const re = new RegExp(options.blockRegex, 'img');

      while (match = re.exec(content)) {
        const rawBlock = match[0];
        const umlBlock = match[1].trim();
        const md5 = crypto.createHash('md5').update(umlBlock).digest('hex');
        const svgPath = path.join(options.umlPath, `${md5}.svg`);
        umls.push({rawBlock, umlBlock,svgPath});
      }

      for (const uml of umls) {
        content = await createUML(content, uml, output);
      }

      page.content = content;
      return page;
    },
    'page': page => page,
    'page:after': page => page
  }
};
