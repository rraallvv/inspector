'use strict';

let normalizePath = Editor.require('packages://inspector/utils/utils').normalizePath;

describe('basic testing', function() {
  it('should work with simple case', function() {
    expect ( normalizePath('target.position.x') ).to.be.equal('position.x');
    expect ( normalizePath('target.foobar.foo') ).to.be.equal('foobar.foo');
    expect ( normalizePath('target.foobar.foo.x') ).to.be.equal('foobar.foo.x');
  });

  it('should work with mixins case', function() {
    expect ( normalizePath('target.__comps__.0.position.x') ).to.be.equal('position.x');
    expect ( normalizePath('target.__comps__.10.foobar.foo') ).to.be.equal('foobar.foo');
    expect ( normalizePath('target.__comps__.999.foobar.foo.x') ).to.be.equal('foobar.foo.x');
  });
});

// describe('smoke testing', function() {
// });
