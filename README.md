# acmdjs-javascript

**acmdjs** is a base on **Asynchronous Common Module Definition**. HAHAHA~😄

``` js
acmdjs.define('your_module_id', async function(require, exports, module){
    const $ = await require('jquery'); // awaitable !
    // blabla
    exports.a = 1;
    return { b: 2 };
});

const module = await acmdjs.use('your_module_id');
console.log(module.a); // 1
console.log(module.b); // 2
```
