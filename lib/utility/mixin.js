
import assert from "node:assert";

export const mixin = (target, mixin) => {
    for (const [name, desc] of Object.entries(Object.getOwnPropertyDescriptors(mixin))) {
        if (desc.get != null)
            Object.defineProperty(target, name, desc);
        else if (desc.value != null)
            target[name] = desc.value;
        else
            assert.fail();
    }

    return target;
}