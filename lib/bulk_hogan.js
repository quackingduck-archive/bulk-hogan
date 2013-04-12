(function() {
  var assert, async, basenameWithoutExtension, contents, dir, fs, fse, glob, hogan, modulePrefixedBasenameWithoutExtension, name, noErr, path, readAndCompileTemplates, resultEquals, sources, templates;

  fs = require('fs');

  hogan = require('hogan.js');

  async = require('async');

  glob = require('glob');

  module.exports = templates = {};

  templates.source = function(name, cb) {
    return this.load(function(err, compiledTemplates, sourceTemplates) {
      var sourceTemplate;
      if (err != null) return cb(err);
      if (name === '*') return cb(noErr, sourceTemplates);
      sourceTemplate = sourceTemplates[name];
      if (sourceTemplate == null) {
        return cb(new Error("No template named: " + name));
      }
      return cb(noErr, sourceTemplate);
    });
  };

  templates.render = function(name, view, cb) {
    return this.load(function(err, compiledTemplates, sourceTemplates) {
      var compiledTemplate, html;
      if (err != null) return cb(err);
      compiledTemplate = compiledTemplates[name];
      if (compiledTemplate == null) {
        return cb(new Error("No template named: " + name));
      }
      try {
        html = compiledTemplate.render(view, compiledTemplates);
        return cb(noErr, html);
      } catch (err) {
        return cb(err);
      }
    });
  };

  templates.renderSync = function(name, view) {
    var compiledTemplate;
    if (this.compiledCache == null) {
      throw new Error('Template files have not been loaded');
    }
    compiledTemplate = this.compiledCache[name];
    if (compiledTemplate == null) throw new Error("No template named: " + name);
    return compiledTemplate.render(view, this.compiledCache);
  };

  templates.load = function(cb) {
    var _this = this;
    if (this.compiledCache != null) {
      return cb(noErr, this.compiledCache, this.sourceCache);
    }
    return async.parallel({
      templates: function(cb) {
        return readAndCompileTemplates(_this.dir, '*.mustache', basenameWithoutExtension, cb);
      },
      moduleTemplates: function(cb) {
        if (_this.modulesDir == null) return cb(noErr, {});
        return readAndCompileTemplates(_this.modulesDir, '**/*.mustache', modulePrefixedBasenameWithoutExtension, cb);
      }
    }, function(err, results) {
      var compiledTemplates, k, sourceTemplates, v, _ref, _ref2, _ref3, _ref4;
      if (err != null) return cb(err);
      compiledTemplates = {};
      sourceTemplates = {};
      _ref = results.templates.compiledTemplates;
      for (k in _ref) {
        v = _ref[k];
        compiledTemplates[k] = v;
      }
      _ref2 = results.moduleTemplates.compiledTemplates;
      for (k in _ref2) {
        v = _ref2[k];
        compiledTemplates[k] = v;
      }
      _ref3 = results.templates.sourceTemplates;
      for (k in _ref3) {
        v = _ref3[k];
        sourceTemplates[k] = v;
      }
      _ref4 = results.moduleTemplates.sourceTemplates;
      for (k in _ref4) {
        v = _ref4[k];
        sourceTemplates[k] = v;
      }
      if (!_this.reload) _this.compiledCache = compiledTemplates;
      if (!_this.reload) _this.sourceCache = sourceTemplates;
      return cb(noErr, compiledTemplates, sourceTemplates);
    });
  };

  templates.dir = __dirname + '/templates';

  templates.sourceCache = null;

  templates.compiledCache = null;

  templates.reload = process.env.NODE_ENV === 'development';

  readAndCompileTemplates = function(dir, globFilter, nameFromFilenameFn, cb) {
    return async.waterfall([
      function(cb) {
        return glob(dir + '/' + globFilter, cb);
      }, function(fileNames, cb) {
        return async.map(fileNames, fs.readFile, function(err, fileContents) {
          return cb(err, fileNames, fileContents);
        });
      }
    ], function(err, fileNames, fileContents) {
      var fileName, i, name, result, _len;
      if (err != null) return cb(err);
      result = {
        compiledTemplates: {},
        sourceTemplates: {}
      };
      for (i = 0, _len = fileNames.length; i < _len; i++) {
        fileName = fileNames[i];
        name = nameFromFilenameFn(fileName);
        result.compiledTemplates[name] = hogan.compile(fileContents[i].toString('utf8'));
        result.sourceTemplates[name] = fileContents[i].toString('utf8');
      }
      return cb(noErr, result);
    });
  };

  noErr = null;

  basenameWithoutExtension = function(fileName) {
    return fileName.match(/.+\/(.+)\..+\.mustache$/)[1];
  };

  modulePrefixedBasenameWithoutExtension = function(fileName) {
    var moduleName, templateName, _ref;
    _ref = fileName.match(/.+\/(.+)\/(.+)\..+\.mustache$/).slice(1, 3), moduleName = _ref[0], templateName = _ref[1];
    if (templateName === 'main') {
      return moduleName;
    } else {
      return moduleName + '_' + templateName;
    }
  };

  if (process.argv[1] === __filename) {
    assert = require('assert');
    assert.equal("foo", basenameWithoutExtension('/tmp/foo.html.mustache'));
    assert.equal("baz", modulePrefixedBasenameWithoutExtension('/tmp/modules/baz/main.html.mustache'));
    assert.equal("baz_qux", modulePrefixedBasenameWithoutExtension('/tmp/modules/baz/qux.html.mustache'));
    fse = require('fs-extra');
    path = require('path');
    dir = "/tmp/" + (path.basename(__filename)) + "-test";
    fse.removeSync(dir);
    fse.mkdirSync(dir);
    templates.dir = dir;
    sources = {
      foo: "{{foo}}",
      bar: "{{bar}}",
      partials: "{{>foo}}{{>bar}}"
    };
    for (name in sources) {
      contents = sources[name];
      fse.writeFileSync("" + dir + "/" + name + ".html.mustache", contents, 'utf8');
    }
    resultEquals = function(expected, next) {
      return function(err, html) {
        assert.ifError(err);
        assert.equal(expected, html);
        return next();
      };
    };
    async.series([
      function(next) {
        var view;
        view = {
          foo: 'value of foo'
        };
        return templates.render('foo', view, resultEquals('value of foo', next));
      }, function(next) {
        return templates.source('foo', resultEquals(sources.foo, next));
      }, function(next) {
        return templates.source('*', function(err, sources) {
          assert.equal(typeof sources, 'object');
          assert.equal(sources.foo, "{{foo}}");
          return next();
        });
      }, function(next) {
        var view;
        view = {
          foo: 'a',
          bar: 'b'
        };
        return templates.render('partials', view, resultEquals('ab', next));
      }
    ], function(err) {
      var bazModuleDir, bazModuleSources, contents, modulesDir, name;
      assert.ifError(err);
      modulesDir = dir + '-modules';
      bazModuleDir = modulesDir + '/baz';
      fse.mkdirSync(bazModuleDir);
      templates.modulesDir = modulesDir;
      bazModuleSources = {
        main: "{{>baz_qux}}",
        qux: "contents of baz_qux module template"
      };
      for (name in bazModuleSources) {
        contents = bazModuleSources[name];
        fse.writeFileSync("" + bazModuleDir + "/" + name + ".html.mustache", contents, 'utf8');
      }
      templates.compiledCache = null;
      templates.sourceCache = null;
      return templates.render('baz', {}, function(err, html) {
        assert.ifError(err);
        assert.equal("contents of baz_qux module template", html);
        assert.equal("contents of baz_qux module template", templates.sourceCache['baz_qux']);
        assert.equal("{{>baz_qux}}", templates.sourceCache['baz']);
        console.log("ok");
        return process.exit();
      });
    });
  }

}).call(this);
