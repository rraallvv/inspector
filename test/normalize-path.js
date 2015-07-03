var normalizePath = Editor.require('packages://inspector/utils/utils').normalizePath;

describe('basic testing', function() {
    it('should work with simple case', function() {
        expect ( normalizePath('target.position.value.x', 'target') ).to.be.equal('position.x');
        expect ( normalizePath('target.foobar.value.foo.value', 'target') ).to.be.equal('foobar.foo');
        expect ( normalizePath('target.foobar.value.foo.value.x', 'target') ).to.be.equal('foobar.foo.x');
    });
});

// describe('smoke testing', function() {
// });
