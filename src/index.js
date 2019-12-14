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
    styleStr,
    label = 0;

  return {
    name: "byy",

    buildStart() {
      fs.stat("./.temp", {}, err => {
        if (err) fs.mkdirSync('.temp');
        fs.writeFileSync(`.temp/index-${label}.scss`, "This is a middleware target...", {
          encoding: "utf-8"
        });
      })
    },

    buildEnd(b) {
      fs.rmdirSync(".temp", {
        recursive: true
      });
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

        styleStr = style;

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
        label++;

        fs.renameSync(`.temp/index-${ label - 1 }.scss`, `.temp/index-${ label }.scss`);
        return { code: styleStr, map: null };
      }
    },

    transform(code, id) {
      if (regExp.test(id)) {
        let src =
          `import "__temp/index-${label}";\n` +
          `${code}`;

        return src;
      }
    },

    generateBundle(a, b) {
      for (let name in b) {
        b[name].code = ts.transpileModule(b[name].code, {
          compilerOptions: ts.convertCompilerOptionsFromJson(readConfigFile(ts), process.cwd()).options
        }).outputText;
      }
      
    }
  };
}