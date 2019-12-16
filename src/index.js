import { SplitCode } from "./utils/split-code";
import * as ts from "typescript";
import { js as beautify } from "js-beautify";
import TransformRender from "./utils/transform-to-render";
import fs from "fs";
import path from "path";

function readConfigFile(ts) {
  let configPath = path.resolve(process.cwd(), "tsconfig.json");

  return ts.readConfigFile(configPath, function(path) {
    return fs.readFileSync(path, 'utf-8');
  }).config.compilerOptions;
}

export default function byy () {
  let regExp = /\.byy$/,
    styleStr = {},
    label = 0;

  return {
    name: "byy",

    buildStart() {
      label = 0;
      fs.stat("./.temp", {}, err => {
        if (err) fs.mkdirSync('.temp');
        fs.writeFileSync(`.temp/index-${label}.scss`, "This is a middleware target...", {
          encoding: "utf-8"
        });
      })
    },

    resolveId(id) {
      return id
    },

    load(id) {
      if (regExp.test(id)) {
        let source = fs.readFileSync(id).toString();
        let { template, script, style } = new SplitCode(source);

        let { renderStr, renderFuncList } = new TransformRender(template);

        let pos = script.lastIndexOf('}');

        styleStr[label] = style;
        label++;
        script = `${script.slice(0, pos)},\n${renderStr}${script.slice(pos)}`;
        
        for (let key in renderFuncList) {
          let mBegin = script.indexOf("methods:");
          let curBegin = script.indexOf("{", mBegin) + 1;
          script = `${script.slice(0, curBegin)}${renderFuncList[key]},\n${script.slice(curBegin)}`
        }

        return {
          code: beautify(script, {
            indent_size: 2,
            space_in_empty_paren: false
          }),
          map: null
        };
      } 
      
      if (/\.temp.+$/.test(id)) {
        let target = parseInt(id.replace(/.+index-([0-9]+)\.scss$/, "$1")),
        stylesLength = Object.keys(styleStr).length;

        fs.renameSync(`.temp/index-${target}.scss`, `.temp/index-${ target + 1 }.scss`);
        if (target === stylesLength - 1) {
          fs.rmdirSync(".temp", {
            recursive: true
          });
        }

        return {
          code: styleStr[`${target}`],
          map: null
        };
      }
    },

    transform(code, id) {
      if (regExp.test(id)) {
        let src =
          `import "__temp/index-${label - 1}";\n` +
          `${code}`;

        return src;
      }
    },

    renderChunk(code) {
      return ts.transpileModule(code, {
        compilerOptions: ts.convertCompilerOptionsFromJson(readConfigFile(ts), process.cwd()).options
      }).outputText;
    },
  };
}