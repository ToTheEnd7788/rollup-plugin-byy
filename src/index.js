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

function tsify(code) {
  return beautify(ts.transpileModule(code, {
    compilerOptions: ts.convertCompilerOptionsFromJson(
      readConfigFile(ts),
      process.cwd()
    ).options
  }).outputText, {
    indent_size: 2,
    space_in_empty_paren: false
  });
}

export default function () {
    let regExp = /\.byy$/,
      styleStr = {};

  return {
    name: "byy",

    load(id) {
      if (/.+byy\.scss$/.test(id)) {
        return styleStr[id];
      }

      return null;
    },

    resolveId(source) {
      return source;
    },

    transform(code, id) {
      if (regExp.test(id)) {
        let { template, script, style } = new SplitCode(code),
          { renderStr, renderFuncList } = new TransformRender(template),
          pos = script.lastIndexOf('}');

        styleStr[`${id}.scss`] = style;
        script = `${script.slice(0, pos)},\n${renderStr}${script.slice(pos)}`;
        
        for (let key in renderFuncList) {
          let mBegin = script.indexOf("methods:");
          let curBegin = script.indexOf("{", mBegin) + 1;
          script = `${script.slice(0, curBegin)}${renderFuncList[key]},\n${script.slice(curBegin)}`
        }

        let src =
          `import "${id}.scss"
          ${script}
          `;

        return src;
      }
    },

    generateBundle({}, bundle) {
      for (let name in bundle) {
        if (/\.js$/.test(name)) {
          if (bundle[name].type === "asset") {
            bundle[name].source = tsify(bundle[name].source);
          } else {
            bundle[name].code = tsify(bundle[name].code);
          }
        }
      }
    }
  };
}