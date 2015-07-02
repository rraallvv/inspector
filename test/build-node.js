var buildNode = Editor.require('packages://inspector/utils/build-node');

describe('smoke testing', function() {
    it('should pass if properties is null', function() {
        var node = {
            __type__: 'MyClass',
            foobar: null,
        };

        buildNode( node, {
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
});
