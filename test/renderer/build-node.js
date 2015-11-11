'use strict';

let buildNode = Editor.require('packages://inspector/utils/utils').buildNode;

describe('smoke testing', function() {
  it('should pass if properties is null', function() {
    let node = {
      __type__: 'MyClass',
      foobar: null,
    };

    buildNode(node, {
      MyClass: {
        properties: {
          foobar: {
            type: 'Integer',
          },
        },
      },
    }, 'target', false);

    expect ( node.foobar.value ).to.be.equal(null);
  });
});

describe('build result', function() {
  it('should work with simple case', function() {
    let node = {
      __type__: 'MyClass',
      foobar: 'foobar',
    };

    buildNode(node, {
      MyClass: {
        properties: {
          foobar: {
            type: 'String',
          }
        },
      },
    }, 'target', false);

    expect ( node.foobar.value ).to.be.equal('foobar');
    expect ( node.foobar.attrs.type ).to.be.equal('String');
  });

  it('should work with __comps__', function() {
    let node = {
      __type__: 'MyClass',
      __comps__: [
        {
          __type__: 'MyComp01',
          foo: 'foo',
        },
        {
          __type__: 'MyComp02',
          bar: 2,
        },
      ],
    };

    buildNode(node, {
      MyClass: {
        properties: {
        },
      },
      MyComp01: {
        properties: {
          foo: {
            type: 'String',
          },
        },
      },
      MyComp02: {
        properties: {
          bar: {
            type: 'Integer',
          },
        },
      },
    }, 'target', false);

    expect ( node.__comps__[0].__props__[0].value ).to.be.equal('foo');
    expect ( node.__comps__[0].__props__[0].attrs.type ).to.be.equal('String');
    expect ( node.__comps__[1].__props__[0].value ).to.be.equal(2);
    expect ( node.__comps__[1].__props__[0].attrs.type ).to.be.equal('Integer');
  });

  it('should use properties\' type', function() {
    let node = {
      __type__: 'MyClass',
      foobar: {
        __type__: 'Foobar',
        a: 'a',
      },
    };

    buildNode(node, {
      MyClass: {
        properties: {
          foobar: {
            type: 'String',
          }
        },
      },
    }, 'target', false);

    expect ( node.foobar.value ).to.be.deep.equal({ a: 'a' });
    expect ( node.foobar.type ).to.be.equal('Foobar');
  });

  it('store editor data to __editor__ for both component and node', function() {
    let node = {
      __type__: 'MyClass',
      __comps__: [
        {
          __type__: 'MyComp01',
          foo: 'foo',
        },
      ],
    };

    buildNode(node, {
      MyClass: {
        editor: {
          inspector: 'packages://foo/bar/foobar.html',
        },
      },
      MyComp01: {
        editor: {
          inspector: 'packages://my/comp/my-comp-01.html',
        },
        properties: {
          foo: {
            type: 'String',
          },
        },
      },
    }, 'target', false);

    expect ( node.__editor__.inspector ).to.be.deep.equal('packages://foo/bar/foobar.html');
    expect ( node.__comps__[0].__editor__.inspector ).to.be.deep.equal('packages://my/comp/my-comp-01.html');
  });
});
