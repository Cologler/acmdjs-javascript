'use strict';

require('../src/acmdjs');
const assert = require('assert');

beforeEach(() => {
    return acmdjs.clear();
});

describe('acmdjs', function() {
    describe('#isDefined()', function() {
        it('isDefined should be false before defined.', async function() {
            assert.strictEqual(acmdjs.isDefined('module_1'), false);
        });

        it('isDefined should be true after defined.', async function() {
            acmdjs.define('module_1', async function(require, exports) {
                exports.value = 1;
            });
            assert.strictEqual(acmdjs.isDefined('module_1'), true);
        });
    });

    describe('#clear()', function() {
        it('clear() should clean whole namespace', async function() {
            acmdjs.define('module_1', async function(require, exports) {
                exports.value = 1;
            });
            assert.strictEqual(acmdjs.isDefined('module_1'), true);
            acmdjs.clear();
            assert.strictEqual(acmdjs.isDefined('module_1'), false);
        });
    });

    describe('#define()', function() {
        it('define should accept sync factory', async function() {
            acmdjs.define('module_1', function(require, exports) {
                exports.value = 1;
            });

            const module = await acmdjs.use('module_1');
            assert.strictEqual(module.value, 1);
        });

        it('define should accept async factory', async function() {
            acmdjs.define('module_1', async function(require, exports) {
                await new Promise(resolve => resolve());
                exports.value = 1;
            });

            const module = await acmdjs.use('module_1');
            assert.strictEqual(module.value, 1);
        });
    });

    describe('#define()~require', function() {
        it('require should return the exports object', async function() {
            let outerExports = null;

            acmdjs.define('module_1', async function(require, exports) {
                outerExports = exports;
            });

            const module = await acmdjs.use('module_1');
            assert.strictEqual(module, outerExports);
        });

        it('require should allow call from module builder', async function() {
            acmdjs.define('module_1', async function(require, exports) {
                const module_2 = await require('module_2');
                exports.value = module_2.value;
            });

            acmdjs.define('module_2', async function(require, exports) {
                const module_3 = await require('module_3');
                exports.value = module_3.value;
            });

            acmdjs.define('module_3', async function(require, exports) {
                exports.value = 20;
            });

            const module_1 = await acmdjs.use('module_1');
            assert.strictEqual(module_1.value, 20);
        });

        it('require should could detect loop dependencies.', async function() {
            acmdjs.define('module_1', async function(require, exports) {
                const module_2 = await require('module_2');
                exports.value = module_2.value;
            });

            acmdjs.define('module_2', async function(require, exports) {
                const module_3 = await require('module_3');
                exports.value = module_3.value;
            });

            acmdjs.define('module_3', async function(require, exports) {
                await require('module_1'); // throw from here
            });

            try {
                await acmdjs.use('module_1');
                assert.fail();
            } catch (error) {
                assert.strictEqual(error.message, 'loop dependencies found: module_1 => module_2 => module_3 => module_1');
                assert.strictEqual(error instanceof acmdjs.ACMDJSError, true);
            }
        });
    });

    describe('#define()~exports', function() {
        it('define should accept factory return value', async function() {
            acmdjs.define('module_1', async function(require, exports) {
                await new Promise(resolve => resolve());
                exports.value = 1;
                exports.valueBeOverwrite = 2;
                return { retval: 3, valueBeOverwrite: 4 };
            });

            const module = await acmdjs.use('module_1');
            assert.strictEqual(module.value, 1);
            assert.strictEqual(module.retval, 3);
            assert.strictEqual(module.valueBeOverwrite, 4);
        });

        it('define should accept data factory', async function() {
            acmdjs.define('module_1', {
                value: 4
            });

            const module = await acmdjs.use('module_1');
            assert.strictEqual(module.value, 4);
        });
    });

    describe('#define()~module', function() {
        it('module should has Name', async function() {
            acmdjs.define('module_1', async function(require, exports, module) {
                assert.strictEqual(module.Name, 'module_1');
            });

            await acmdjs.use('module_1');
        });
    });
});
