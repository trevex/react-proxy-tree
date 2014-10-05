var util = require('./util'),
    Types = util.Types;

/**
 * Changes enum
 * @type {Object}
 */
var Changes = {
    SET: 1,
    UPDATE: 2,
    PUSH: 3,
};

/*
 * NODE
 */
/**
 * A created node recursively creates its children dependen on value
 * @param {object} tree
 * @param {any} value
 * @param {array} path
 */
function Node(tree, value, path) {
    // bind data object to node and save parent and tree references
    this.__tree = tree;
    this.__path = path || [];
    this.value = value;
    // cache the type
    this.__type = util.getTypeEnum(value);
    // get the keys to index the object or array
    var keys = [];
    if (this.__type === Types.OBJECT) {
        keys = Object.keys(value);
    } else if (this.__type === Types.ARRAY) {
        keys = value;
    }
    // iterate through keys and create sub-nodes
    keys.forEach(function (key) {
        var nextPath = this.__path.slice();
        nextPath.push(key);
        this[key] = new Node(this.__tree, this.value[key], nextPath);
    }.bind(this));
}

Node.prototype = {

    constructor: Node,

    /**
     * Queues a set for the current node/path
     * @param {any} nextValue
     */
    set: function(nextValue) {
        this.__tree.queue(Changes.SET, this.__path, nextValue);
    },

    /**
     * Queues an update using the provided function
     * @param  {function} updateFn
     */
    update: function(updateFn) {
        this.__tree.queue(Changes.UPDATE, this.__path, updateFn);
    },

    /**
     * Checks whether the current node is an array and
     * queues a push to the contained array or issues a warning.
     * @param  {any} newValue
     */
    push: function(newValue) {
        if (this.__type === Types.ARRAY) {
            this.__tree.queue(Changes.PUSH, this.__path, newValue);
        } else {
            console.warn("Can't push object to non-array tree node!");
        }
    },

};

/*
 * TREE
 */
/**
 * Creates a tree of the provided data.
 * NOTE: the data parameter will be mutated!
 */
function Tree(data) {
    this.root = new Node(this, data);
    this.__callbacks = [];
    this.__updateQueued = false;
    this.__updates = [];
}

Tree.prototype = {

    constructor: Tree,

    /**
     * Pushes an update configuration into the __updates queue.
     * @param  {int} type Any valid type value see 'constants.js'
     * @param  {array} path
     * @param  {any} arg Provided argument for the update, i.e. nextValue
     */
    queue: function(type, path, arg) {
        this.__updates.push(new Update(this, type, path, arg));
        this._tryUpdate();
    },

    /**
     * Adds a callback, for the update event.
     * @param  {Function} callback
     */
    addUpdateListener: function(callback) {
        this.__callbacks.push(callback);
    },

    /**
     * Removes the specified callback from the update event.
     * @param  {Function} callback
     */
    removeUpdateListener: function(callback) {
        if(callback) {
            var i = this.__callbacks.length;
            while (i--) {
                if (callback === this.__callbacks[i]) {
                    this.__callbacks.splice(i, 1);
                    break;
                }
            }
        } else {
            this.__callbacks = [];
        }
    },

    /**
     * Tries to queue an update/processQueue if the flag is not set.
     * NOTE: Flag gets immediately set back to false in '_processQueue'.
     */
    _tryUpdate: function() {
        if (!this.__updateQueued) {
            this.__updateQueued = true;
            // Process next tick, i.e. once current stack is done
            setTimeout(this._processQueue.bind(this), 0);
        }
    },

    /**
     * Iterates over the queued updates and tries to resolve them.
     * Once done emits the update event.
     */
    _processQueue: function() {
        this.__updateQueued = false;
        while (this.__updates.length) {
            var update = this.__updates.shift();
            update.resolve();
        }
        this._notifyCallbacks();
    },

    /**
     * Iterate over callbacks and let them know, that the tree has changed.
     */
    _notifyCallbacks: function() {
        this.__callbacks.forEach(function(callback) {
            callback();
        });
    },

    /**
     * Helper function taking a path and traversing it while
     * constantly rewraping/cloning the nodes
     * @param  {array} path
     */
    _rewrap: function(path) {
        var node = this.root = util.cloneObject(this.root);
        var length = path.length;
        for (var i = 0; i < length - 1; i++) {
            node[path[i]] = util.cloneObject(node[path[i]]);
            node = node[path[i]];
        }
    },
};

/*
 * UPDATE
 */
/**
 * Essential helper class. Each instance describes changes to
 * a tree. These are queued and resolved when applicable (usually next tick).
 * After an update is resolved the specified path of an update is rewrapped
 * (see 'Tree._rewrap') to make sure the necessary branch of object pointers
 * is invalidated.
 * @param {Tree} tree
 * @param {int} type
 * @param {array} path
 * @param {any} arg
 */
function Update(tree, type, path, arg) {
    this.__tree = tree;
    this.__type = type;
    this.__path = path;
    this.__arg = arg;
}

Update.prototype = {

    constructor: Update,

    /**
     * Resolves the update by calling the associated function to the type,
     * i.e. '__type === Changes.SET' would call '_set'. Furthermore makes sure
     * to rewrap the tree after the changes are applied.
     */
    resolve: function() {
        switch(this.__type) {
        case Changes.SET:
            this._set();
            break;
        case Changes.UPDATE:
            this._update();
            break;
        case Changes.PUSH:
            this._push();
            break;
        default:
            break;
        }
        this.__tree._rewrap(this.__path);
    },

    /**
     * Sets the specified value.
     */
    _set: function() {
        var tree = this.__tree;
        var path = this.__path;
        var arg = this.__arg;
        this._traverse(
            function(value, lastPath) {
                value[lastPath] = arg;
            },
            function(node, lastPath) {
                node[lastPath] = new Node(tree, arg, path.slice());
            }
        );
    },

    /**
     * Updates the path with the specified function
     */
    _update: function() {
        var tree = this.__tree;
        var path = this.__path;
        var updateFn = this.__arg;
        var nextValue;
        this._traverse(
            function(value, lastPath) {
                nextValue = updateFn(value[lastPath])
                value[lastPath] = nextValue;
            },
            function(node, lastPath) {
                node[lastPath] = new Node(tree, nextValue, path.slice());
            }
        );
    },

    _push: function() {
        var tree = this.__tree;
        var path = this.__path;
        var arg = this.__arg;
        var nextValue;
        this._traverse(
            function(value, lastPath) {
                value[lastPath].push(arg);
                nextValue = value[lastPath];
            },
            function(node, lastPath) {
                node[lastPath] = new Node(tree, nextValue, path.slice());
            }
        );
    },

    /**
     * Traverses the path of the update instance and calls
     * the specified callbacks with the second last node and value
     * and the last path segment.
     * @param  {Function} valueCallback
     * @param  {Function} nodeCallback
     */
    _traverse: function(valueCallback, nodeCallback) {
        var path = this.__path;
        var length = path.length;
        var node = this.__tree.root;
        var value = node.value;
        for (var i = 0; i < length - 1; i++) {
            value = value[path[i]];
            node = node[path[i]];
        }
        var lastPath = path[length - 1];
        valueCallback(value, lastPath);
        nodeCallback(node, lastPath);
    }
};

module.exports = Tree;
