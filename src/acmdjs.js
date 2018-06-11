'use strict';

var acmdjs;
(function(context) {

    /**
     * @callback RequireFunction
     * @param {string} moduleId
     * @return {Promise}
     *
     * @typedef ModuleDescriptor
     * @prop {string} Name
     * @prop {string} Version
     *
     * @callback ModuleFactory
     * @param {RequireFunction} require
     * @param {Object} exports
     * @param {Module} module
     *
     */

    if (typeof acmdjs !== 'undefined') {
        return;
    }

    class ACMDJSError extends Error { }

    acmdjs = {};

    function clear() {

        const _modules = {};
        const _modulesWaiters = {};

        function _require(moduleName, loaderChain) {
            const resolver = _modules[moduleName];
            if (resolver) {
                return resolver.resolve(loaderChain);
            } else {
                return new Promise((resolve, reject) => {
                    const queue = _modulesWaiters[moduleName] || [];
                    if (queue.length === 0) { // created
                        _modulesWaiters[moduleName] = queue;
                    }
                    queue.push({resolve, reject});
                });
            }
        }

        /**
         * @func
         * @param {string} moduleName
         * @return {Promise<Object>}
         */
        function use(moduleName) {
            return _require(moduleName, null).catch(error => {
                if (error instanceof ACMDJSError) {
                    throw new ACMDJSError(error.message);
                } else {
                    throw error;
                }
            });
        };

        /**
         * @func
         * @param {ModuleDescriptor|string} descriptor
         * @param {ModuleFactory} factory
         */
        function define(descriptor, factory) {
            if (typeof descriptor === 'string') {
                descriptor = {
                    Name: descriptor
                };
            }

            if (typeof factory !== 'function' && typeof factory !== 'object') {
                throw new Error('factory should be a function or object.');
            }

            const resolver = new ModuleResolver(descriptor, factory);
            _modules[resolver.Name] = resolver;
            _modules[resolver.ModuleId] = resolver;

            // call waiters
            const waiters = (_modulesWaiters[resolver.Name] || []).concat(_modulesWaiters[resolver.ModuleId] || []);
            if (waiters.length > 0) {
                _modulesWaiters[resolver.ModuleId] = _modulesWaiters[resolver.Name] = undefined;
                resolver.resolve()
                    .then(module => {
                        waiters.forEach(promise => {
                            promise.resolve(module);
                        });
                    }).catch(error => {
                        waiters.forEach(promise => {
                            promise.reject(error);
                        });
                    });
            }
        };

        /**
         * @func
         * @param {string} moduleId
         * @param {ModuleFactory} factory
         */
        function isDefined(moduleId) {
            return Boolean(_modules[moduleId]);
        }

        class Module {
            /**
             * Creates an instance of Module.
             * @param {ModuleDescriptor} descriptor
             * @memberof Module
             */
            constructor(descriptor) {
                const exports = {};

                Object.defineProperties(this, {
                    Name: {
                        get: () => descriptor.Name
                    },

                    Version: {
                        get: () => descriptor.Version
                    },

                    Exports: {
                        get: () => exports
                    },
                });
            }
        }

        class LoaderChain {
            constructor() {
                this._chain = [];
                this._chainItems = new Set();
            }

            enter(moduleId) {
                if (this._chainItems.has(moduleId)) {
                    const chainText = this._chain.concat([moduleId]).join(' => ');
                    throw new ACMDJSError(`loop dependencies found: ${chainText}`);
                }
                this._chain.push(moduleId);
                this._chainItems.add(moduleId);
            }

            exit(moduleId) {
                if (!this._chainItems.has(moduleId)) {
                    throw new Error();
                }
                this._chainItems.delete(moduleId);

                if (this._chain[this._chain.length - 1] !== moduleId) {
                    throw new Error();
                }
                this._chain.splice(this._chain.length - 1, 1);
            }
        }

        class ModuleResolver {
            /**
             * Creates an instance of ModuleResolver.
             * @param {ModuleDescriptor} descriptor
             * @param {ModuleFactory} factory
             * @memberof ModuleResolver
             */
            constructor(descriptor, factory) {
                this._Descriptor = descriptor;
                this._Factory = factory;
                this._ModuleId = this._Descriptor.Name;
                if (this._Descriptor.Version) {
                    this._ModuleId += '#' + this._Descriptor.Version;
                }
                /** @type {Promise} */
                this._ModuleLoader = null;
            }

            get Name() {
                return this._Descriptor.Name;
            }

            get ModuleId() {
                return this._ModuleId;
            }

            /**
             *
             * @param {LoaderChain} loaderChain
             */
            resolve(loaderChain = null) {
                if (this._ModuleLoader === null) {
                    if (loaderChain === null) {
                        loaderChain = new LoaderChain();
                    }

                    this._ModuleLoader = new Promise((resolve, reject) => {
                        const require = moduleId => {
                            return _require(moduleId, loaderChain);
                        };
                        const module = new Module(this._Descriptor);
                        const exports = module.Exports;
                        loaderChain.enter(this.ModuleId);
                        if (typeof this._Factory === 'function') {
                            Promise.resolve(this._Factory(require, exports, module)).then(ret => {
                                loaderChain.exit(this.ModuleId);
                                if (typeof ret === 'object') {
                                    Object.assign(exports, ret);
                                }
                                resolve(exports);
                            }).catch(reject);
                        } else if (typeof this._Factory === 'object') {
                            resolve(this._Factory);
                        }
                    });
                }

                return this._ModuleLoader;
            }
        }

        Object.assign(acmdjs, {
            define,
            use,
            isDefined
        });
    }

    Object.assign(acmdjs, {
        ACMDJSError,
        clear
    });

    acmdjs.clear(); // ensure reset.
})(this);

(c => {
    if (!c) return;
    if (typeof c.acmdjs === 'undefined') {
        c.acmdjs = acmdjs;
    }
})((() => {
    if (typeof process !== 'undefined') {
        // run on node for test
        module.exports = { acmdjs };
        return global;
    } else {
        // run on browser
        return window;
    }
})());

