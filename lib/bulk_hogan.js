(function() {
  var assert, async, basenameWithoutExtension, contents, dir, fs, fse, glob, hogan, modulePrefixedBasenameWithoutExtension, name, noErr, path, readAndCompileTemplates, resultEquals, sources, templates;

  fs = require('fs');

  hogan = require('hogan');

  async = require('async');

  glob = require('glob');

  module.exports = templates = {};

  templates.render = function(name, view, cb) {
    return this.load(function(err, compiledTemplates) {
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

  templates.load = function(cb) {
    var _this = this;
    if (this.cache != null) return cb(noErr, this.cache);
    return async.parallel({
      templates: function(cb) {
        return readAndCompileTemplates(_this.dir, '*.mustache', basenameWithoutExtension, cb);
      },
      moduleTemplates: function(cb) {
        if (_this.modulesDir == null) return cb(noErr, {});
        return readAndCompileTemplates(_this.modulesDir, '*/*.mustache', modulePrefixedBasenameWithoutExtension, cb);
      }
    }, function(err, results) {
      var compiledTemplates, k, v, _ref, _ref2;
      if (err != null) return cb(err);
      compiledTemplates = {};
      _ref = results.templates;
      for (k in _ref) {
        v = _ref[k];
        compiledTemplates[k] = v;
      }
      _ref2 = results.moduleTemplates;
      for (k in _ref2) {
        v = _ref2[k];
        compiledTemplates[k] = v;
      }
      if (!_this.reload) _this.cache = compiledTemplates;
      return cb(noErr, compiledTemplates);
    });
  };

  templates.dir = __dirname + '/templates';

  templates.cache = null;

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
      var compiledTemplates, fileName, i, name, _len;
      if (err != null) return cb(err);
      compiledTemplates = {};
      for (i = 0, _len = fileNames.length; i < _len; i++) {
        fileName = fileNames[i];
        name = nameFromFilenameFn(fileName);
        compiledTemplates[name] = hogan.compile(fileContents[i].toString('utf8'));
      }
      return cb(noErr, compiledTemplates);
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
      templates.cache = null;
      return templates.render('baz', {}, function(err, html) {
        assert.ifError(err);
        assert.equal("contents of baz_qux module template", html);
        console.log("ok");
        return process.exit();
      });
    });
  }

}).call(this);
