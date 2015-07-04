var normalizePath = Editor.require('packages://inspector/utils/utils').normalizePath;

describe('basic testing', function() {
    it('should work with simple case', function() {
        expect ( normalizePath('target.position.value.x') ).to.be.equal('position.x');
        expect ( normalizePath('target.foobar.value.foo.value') ).to.be.equal('foobar.foo');
        expect ( normalizePath('target.foobar.value.foo.value.x') ).to.be.equal('foobar.foo.x');
    });

    it('should work with mixins case', function() {
        expect ( normalizePath('target.__mixins__.0.position.value.x') ).to.be.equal('position.x');
        expect ( normalizePath('target.__mixins__.10.foobar.value.foo.value') ).to.be.equal('foobar.foo');
        expect ( normalizePath('target.__mixins__.999.foobar.value.foo.value.x') ).to.be.equal('foobar.foo.x');
    });
});

// describe('smoke testing', function() {
// });
