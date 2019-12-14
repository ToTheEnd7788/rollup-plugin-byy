import HtmlAst from "./clean-html-ast";

class TransformRender {
  constructor(tpl) {
    this.tpl = tpl;
    this.ast = null;
    this.renderStr;
    this._renderFuncIndex = 0;
    this.renderFuncList = {};

    this._init();
  }

  _init() {
    this.ast = new HtmlAst(this.tpl).ast;
    
    this.renderStr =
    `render(_c) {
      return ${this._buildRender(this.ast[0])};
    }`;
  }

  __buildTextNode(value) {
    let tplStrExp = /^{{([\s\S]+)}}$/,
      result;

    if (tplStrExp.test(value)) {
      result = `${value.replace(tplStrExp, "$1")}`;
    } else {
      result = `"${value}"`;
    }

    return result;
  }

  __buildAttributes(node) {
    let result = "",
      colonExp = /^:(.+)$/,
      atExp = /^@(.+)$/;

    let colons = node.attrs.filter(item => {
      return colonExp.test(item.name);
    }),
      ats = node.attrs.filter(item => {
        return atExp.test(item.name);
      });

    if (node.isComponent) {
      let map = {
        props: {
          exp: colonExp,
          list: colons,
          begin: colons.length > 0
            ? "props: {\n"
            : ""
        },
        bind: {
          exp: atExp,
          list: ats,
          begin: ats.length > 0
            ? "bind: {\n"
            : ""
        }
      };

      for (let key in map) {
        result += map[key]['list'].reduce((acc, {name, value}, index, arr) => {
          if (index !== arr.length - 1) {
            acc += `${name.replace(map[key]['exp'], "$1")}: ${value},\n`;
          } else {
            acc += `${name.replace(map[key]['exp'], "$1")}: ${value}\n}`;

            if (key !== 'bind') {
              acc += ",\n";
            }
          }
  
          return acc;
        }, map[key]['begin']);
      }
    } else {
      ats = ats.map(item => {
        let temp = item;

        if (atExp.test(item.name)) {
          temp.value = this.__solveOriginEvent(item.value);
        }

        return temp;
      });

      let commons = node.attrs.filter(item => {
        return /^[a-z].+$/.test(item.name)
      }),
        map = {
          on: {
            exp: atExp,
            list: ats,
            begin: ats.length > 0
              ? "on: {\n"
              : ""
          },
          commons: {
            exp: /^(.+)$/,
            list: commons.map(({ name, value }) => {
              return {
                name,
                value: `"${value.trim()}"`
              };
            }),
            begin: ""
          },
          autoAttr: {
            exp: colonExp,
            list: colons,
            begin: ""
          }
        };

      for (let key in map) {
        result += map[key]['list'].reduce((acc, {name, value}, index, arr) => {
          let tempName = `${name.replace(map[key].exp, "$1")}` === "class"
            ? "className"
            : `${name.replace(map[key].exp, "$1")}`;

          if (index !== arr.length - 1) {
            acc += `'${tempName}': ${value},\n`;
          } else {
            if (map[key]["begin"]) {
              acc += `'${tempName}': ${value}\n},`;
            } else {
              acc += `'${tempName}': ${value},\n`;
            }
          }
  
          return acc;
        }, map[key]["begin"]);
      }
    }

    return result;
  }

  __solveOriginEvent(value) {
    let exp = /^(.+)\((.+)\)$/;
    
    let funcName = value.replace(exp, "$1"),
    paramsList = value.replace(exp, "$2").split(","),
    paramsStr = paramsList.reduce((acc, item, index, arr) => {
      item = item.trim();
      if (item === "$event") item = `"${item}"`;
      
      if (arr.length - 1 !== index) {
        acc += `${item}, `
      } else {
        acc += `${item}`;
      }

      return acc;
    }, "")

    return `[${funcName}, ${paramsStr}]`;
  }

  __buildRenderListFunc(name, value, node) {
    let list = value.split(/[\s]+in[\s]+/);

    this.renderFuncList[`${name}`] =
      `${name}(_c) {
        return ${list[1]}.map(${list[0]} => {
          return ${this._buildRender(node)};
        })
      }`;
  }

  _buildRender(node) {
    node.attrs = node.attrs || [];
    let {
      nodeName,
      childNodes,
      value
    } = node,
    str,
    bForIndex = node.attrs.findIndex(({ name }) => {
      return name === "b-for";
    });

    if (bForIndex > -1) {
      str = `...this.__renderList_${this._renderFuncIndex}__(_c)`;
      let target = node.attrs.splice(bForIndex, 1);

      this.__buildRenderListFunc(
        `__renderList_${this._renderFuncIndex}__`,
        target[0].value,
        node
      );
      
      this._renderFuncIndex++;
    } else {
      if (nodeName ==="#text") {
        str = this.__buildTextNode(value.trim());
      } else {
        let childs = childNodes.map(item => {
          let temp =
            `${this._buildRender(item)}`;
          return temp;
        });
  
        str =
          `_c("${nodeName}", {
            ${this.__buildAttributes(node)}
          }, [
            ${childs.join(',\n')}
          ])`;
      }
    }


    return str;
  }
}

export default TransformRender;