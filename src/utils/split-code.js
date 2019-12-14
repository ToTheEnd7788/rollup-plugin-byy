class SplitCode {
  constructor(code) {
    this.code = code;

    this.template = "";
    this.script = "";
    this.style = "";

    this._init();
  }

  _buildRangeExp(name) {
    return new RegExp(`<${name}.*>([\\s\\S]*)<\\/${name}>`);
  }

  _getCode(name) {
    let regExp = this._buildRangeExp(name),
      result = this.code.match(regExp),
      res = "";

    if (result) {
      res = result[1];
    }

    return res;
  }

  _init() {
    this.template = this._getCode('template');
    this.script = this._getCode('script');
    this.style = this._getCode('style');
  }
};

export { SplitCode };