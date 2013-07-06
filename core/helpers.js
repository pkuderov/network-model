/*
    some help objects and methods
*/

// Production steps of ECMA-262, Edition 5, 15.4.4.18
// Reference: http://es5.github.com/#x15.4.4.18
if (!Array.prototype.forEach) { 
    Array.prototype.forEach = function forEach(callback, thisArg) {
        var T, k;

        if (this == null) {
            throw new TypeError( "this is null or not defined" );
        }

        // 1. Let O be the result of calling ToObject passing the |this| value as the argument.
        var O = Object(this);

        // 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
        // 3. Let len be ToUint32(lenValue).
        var len = O.length >>> 0; // Hack to convert O.length to a UInt32

        // 4. If IsCallable(callback) is false, throw a TypeError exception.
        // See: http://es5.github.com/#x9.11
        if ({}.toString.call(callback) !== "[object Function]") {
            throw new TypeError(callback + " is not a function");
        }

        // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
        if (thisArg) {
            T = thisArg;
        }

        // 6. Let k be 0
        k = 0;

        // 7. Repeat, while k < len
        while(k < len) {
            var kValue;
            // a. Let Pk be ToString(k).
            //   This is implicit for LHS operands of the in operator
            // b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
            //   This step can be combined with c
            // c. If kPresent is true, then
            if (Object.prototype.hasOwnProperty.call(O, k)) {
                // i. Let kValue be the result of calling the Get internal method of O with argument Pk.
                kValue = O[k];

                // ii. Call the Call internal method of callback with T as the this value and
                // argument list containing kValue, k, and O.
                callback.call(T, kValue, k, O);
            }
            // d. Increase k by 1.
            k++;
        }
        // 8. return undefined
    };
}

/*
    log functions
*/

//console debug
new function () {
    var debug    = true;
    var original = window.console;
    window.console = {};
    ['log', 'assert'].forEach(function (method) {
        console[method] = function () {
            return (debug && original) 
                ? original[method].apply(original, arguments) 
                : undefined;
        }
    });
};

var log = function() {
    console.log(sprintf.apply(this, arguments));
}
var slogf = function() {
    return sprintf("[%'05d]|  %-40s|  %s", Executor.currentTick, arguments[0].getObjectName(), sprintf.apply(this, Array.prototype.slice.call(arguments).slice(1)));
}
var logf = function() {
    log(slogf.apply(this, arguments));
}
var alert = window.alert;
var assert = console.assert;

function objToString (obj, maxDepth) {
    if (maxDepth <= 0)
        return "{ }";
    var str = '{';
    for (var elem in obj) {
        if (typeof(obj[elem]) == "function")
            continue;
        
        str += elem + ": ";
        if (typeof(obj[elem]) == "object") {
            str += objToString(obj[elem], maxDepth - 1);
        }
        else {
            str += obj[elem];
        }
        str += "; ";
    }
    str += '}';
    return str;
}
/*
    ip transformation helpers
*/
function ipStringToInt(ipStr) 
{
    var ipInt = 0; 
    ipStr.split('.').forEach(function(x) {
        ipInt = ipInt * 256 + (+x);
    });
    return ipInt;
}

function ipIntToString(ipInt) 
{
    var ipStr = (ipInt % 256).toString();
    for (var i = 3; i > 0; i--) 
    { 
        ipInt = Math.floor(ipInt / 256);
        ipStr = (ipInt % 256) + '.' + ipStr;
    }
    return ipStr;
}
function macIntToString(macInt) {
    var macStr = sprintf("%'02x", macInt % 256);
    for (var i = 1; i < 6; i ++ ) {
        macInt = Math.floor(macInt / 256);
        macStr = sprintf("%'02x", macInt % 256) + ':' + macStr;
    }
    return macStr;
}
function getMask(length) {
    return Math.pow(2, length) - 1;
}
var ipFullNetmask = getMask(32);
var lnFrom2 = Math.log(2);
function floorLog2(x) {
    return Math.floor(Math.log(x) / lnFrom2);
}
function netmaskShortToFull(short) {
    return ipFullNetmask - getMask(32 - short);
}
function netmaskFullToShort(full) {
    return 32 - floorLog2(ipFullNetmask - full + 1);
}
function getCanonicalIp(ip, netmask) {
    return ip - (ip % (ipFullNetmask - netmask + 1));
}
function isInSubnet(ip, netmask, targetIp) {
    return getCanonicalIp(ip, netmask) == getCanonicalIp(targetIp, netmask);
}
function getBroadcastIp(ip, netmask) {
    return getCanonicalIp(ip, netmask) + (ipFullNetmask - netmask);
}

function isZeroNetwork(ip, netmask) {
    return 0 == getCanonicalIp(ip, netmask)
}

// clone 'simple' object by value
function clone(obj) {
    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        var copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        var copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        var copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}

//queue object
var Queue = function(owner, queueName, size) {
    this.owner = owner;
    this.queueName = queueName;
    this.array = new Array(size);
	
    //methods
	this.clear = function() {
	    this.top = 0;
	    this.bottom = 0;
	    this.count = 0;
    };
    this.isEmpty = function() {
        return this.count == 0;
    }
    this.isFull = function() {
        return this.count == this.array.length;
    }
    this.getItem = function(i) {
        assert(i >= 0 && i < this.count, slogf(this.owner, "%s's index is out of bound", this.queueName));
        return this.array[(this.bottom + i) % this.array.length];
    };
    this.setItem = function(i, value) {
        assert(i >= 0 && i < this.count, slogf(this.owner, "%s's index is out of bound", this.queueName));
        return this.array[(this.bottom + i) % this.array.length] = value;
    };
    this.push = function(obj) {
        if (this.isFull()) {
            logf(this.owner, "%s is full => object won't be pushed", this.queueName);
            return;
        }

        this.array[this.top] = obj;
        this.top ++;
        this.count ++;

        if (this.top == this.array.length)
            this.top = 0;
    };
    this.pop = function() {
        if (this.isEmpty()) {
            logf(this.owner, "%s is empty => 'undefined' will be returned", this.queueName);
            return;
        }
        
        var x = this.array[this.bottom]; 
        this.array[this.bottom] = undefined; //clear
        this.bottom ++;
        this.count --;

        if (this.bottom == this.array.length)
            this.bottom = 0;

        return x;
    };
    this.peek = function() {        
        assert(this.count > 0, slogf(this.owner, "%s's index is out of bound", this.queueName));
	    return this.array[this.bottom];
    };
    this.compact = function(obj, comparer) {
        var j = 0;
        for(var i = 0; i < this.count; i++) {
            var x = this.getItem(i);
            if (comparer.call(obj, x)) {
                this.setItem(j, x);
                j++;
            }
        }
        
        var compactSuccessed = j < this.count;        
        for(var i = j; i < this.count; i++) {
            this.setItem(i, undefined);
        }
        
        this.top = (this.bottom + j) % this.array.length;
        this.count = j;

        return compactSuccessed;
    }
    this.removeFrom = function(index) {
        var comparer = function(x) {
            return x != index;
        }
        this.compact(this, comparer);
    }
    
    this.toString = function() {
        var str = '';
        for (var i = 0; i < this.count; i++) {
            str += objToString(this.getItem(i), 2);
        }
        return str;
    }
    
    //initialization
    this.clear();
}

var ElementaryActionObject = function() {
    this.doElementaryAction = function() {
        log('handler for elementary action not found');
    }
    this.addActiveElementaryObjects = function(activeObjects) {
        activeObjects.push(this);
    }
}
