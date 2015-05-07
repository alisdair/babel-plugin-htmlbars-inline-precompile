var semver = require('semver');

module.exports = function(precompile) {
  return function(babel) {
    if (!semver.satisfies(babel.version, '>= 5.2.10')) {
      throw new Error("htmlbars-inline-precompile requires at least babel v5.2.10");
    }

    var t = babel.types;

    return new babel.Transformer('htmlbars-inline-precompile', {
      ImportDeclaration: function(node, parent, scope, file) {
        if (t.isLiteral(node.source, { value: "htmlbars-inline-precompile" })) {
          var first = node.specifiers && node.specifiers[0];
          if (t.isImportDefaultSpecifier(first)) {
            file.importSpecifier = first.local.name;
          } else {
            var input = file.code;
            var usedImportStatement = input.slice(node.start, node.end);
            var msg = "Only `import hbs from 'htmlbars-inline-precompile'` is supported. You used: `" + usedImportStatement + "`";
            throw file.errorWithNode(node, msg);
          }

          this.remove();
        }
      },

      TaggedTemplateExpression: function(node, parent, scope, file) {
        if (t.isIdentifier(node.tag, { name: file.importSpecifier })) {
          if (node.quasi.expressions.length) {
            throw file.errorWithNode(node, "placeholders inside a tagged template string are not supported");
          }

          var template = node.quasi.quasis.map(function(quasi) {
            return quasi.value.cooked;
          }).join("");

          return "Ember.HTMLBars.template(" + precompile(template) + ")";
        }
      }
    });
  }
};
