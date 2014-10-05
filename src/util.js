/**
 * Type enum
 * @type {Object}
 */
var Types = {
    ARRAY: 1,
    OBJECT: 2,
};

function getTypeEnum(obj) {
    var typeString = Object.prototype.toString.call(obj);
    if (isObject(typeString)) {
        return Types.OBJECT;
    } else if (isArray(typeString)) {
        return Types.ARRAY;
    }
}

function isObject(typeString) {
    return typeString === "[object Object]";
}

function isArray(typeString) {
    return typeString === "[object Array]";
}

function cloneObject(obj){
    var clone = Object.create(
        Object.getPrototypeOf(obj),
        Object.getOwnPropertyNames(obj).reduce(
            function(prev, cur){
                prev[cur] = Object.getOwnPropertyDescriptor(obj ,cur);
                return prev;
            },
            {}
        )
    );
    if(!Object.isExtensible(obj)){ Object.preventExtensions(clone); }
    if(Object.isSealed(obj)){ Object.seal(clone); }
    if(Object.isFrozen(obj)){ Object.freeze(clone); }
    return clone;
}


module.exports = {

    Types: Types,

    getTypeEnum: getTypeEnum,

    isObject: isObject,

    isArray: isArray,

    cloneObject: cloneObject,

};
