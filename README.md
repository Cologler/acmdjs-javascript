# acmdjs-javascript

**acmdjs** is a base on **Asynchronous Common Module Definition**.

``` js
acmdjs.define('your_module_id', async function(require, exports, module){
    const $ = await require('jquery');
    // blabla
    exports.a = function() {
        return 1;
    };
});

const module = await acmdjs.require('your_module_id');

module.a() // 1
```
