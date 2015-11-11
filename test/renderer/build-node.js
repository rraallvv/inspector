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
          __type__: 'MyMixinClass1',
          foo: 'foo',
        },
        {
          __type__: 'MyMixinClass2',
          bar: 2,
        },
      ],
    };

    buildNode(node, {
      MyClass: {
        properties: {
        },
      },
      MyMixinClass1: {
        properties: {
          foo: {
            type: 'String',
          },
        },
      },
      MyMixinClass2: {
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
});
