var buildNode = Editor.require('packages://inspector/utils/utils').buildNode;

describe('smoke testing', function() {
    it('should pass if properties is null', function() {
        var node = {
            __type__: 'MyClass',
            foobar: null,
        };

        buildNode( node, node.__type__, {
            MyClass: {
                properties: {
                    foobar: {
                        type: 'Integer',
                    },
                },
            },
        } );

        expect ( node.foobar.value ).to.be.equal(null);
    });
});

describe('build result', function() {
    it('should work with simple case', function() {
        var node = {
            __type__: 'MyClass',
            foobar: 'foobar',
        };

        buildNode( node, node.__type__, {
            MyClass: {
                properties: {
                    foobar: {
                        type: 'String',
                    }
                },
            },
        } );

        expect ( node.foobar.value ).to.be.equal('foobar');
        expect ( node.foobar.attrs.type ).to.be.equal('String');
    });

    it('should work with __mixins__', function() {
        var node = {
            __type__: 'MyClass',
            __mixins__: [
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

        buildNode( node, node.__type__, {
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
        } );

        expect ( node.__mixins__[0].foo.value ).to.be.equal('foo');
        expect ( node.__mixins__[0].foo.attrs.type ).to.be.equal('String');
        expect ( node.__mixins__[1].bar.value ).to.be.equal(2);
        expect ( node.__mixins__[1].bar.attrs.type ).to.be.equal('Integer');
    });

    it('should use properties\' type', function() {
        var node = {
            __type__: 'MyClass',
            foobar: {
                __type__: 'Foobar',
                a: 'a',
            },
        };

        buildNode( node, node.__type__, {
            MyClass: {
                properties: {
                    foobar: {
                        type: 'Foobar02',
                    }
                },
            },
        } );

        expect ( node.foobar.value ).to.be.deep.equal({ a: 'a' });
        expect ( node.foobar.type ).to.be.equal('Foobar');
    });
});
