# MAVLink JavaScript Library

This directory contains the generated JavaScript library for MAVLink. It was generated on `3ca42d6cdab73122d9c677f88e64882ef2b0dde8` (latest at time of generation) using the following command within the mavlink repository (then
copied here):

```
python ./pymavlink/tools/mavgen.py --lang JavaScript_NextGen --wire-protocol 2.0 --output generated/mavlink message_definitions/v1.0/all.xml
```

Additionally, pymavlink's modified copy of `jspack` is included as part of the
generated library, which I had to make two additional modifications to
`jspack.js` to get it to work properly in browser:

1. Delete the unused `var Long = require('long');` import
2. Change the last line from `exports.jspack = jspack;` to something more
   universal:

    ```js
    if (typeof module !== "undefined" && module.exports) {
      module.exports = JSPack;
      module.exports.jspack = new JSPack();
    }
    export default JSPack;
    ```

I will upstream those changes to pymavlink when I learn enough to be sure that I
fully understand the consequences of those changes, and that I'm not breaking
anything for other users.
