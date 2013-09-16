function inherit(cls, superCls) {
    var construct = function() {};
    construct.prototype = superCls.prototype;
    cls.prototype = new construct();
    cls.prototype.constructor = cls;
    cls.super = superCls;
}

if (!Array.prototype.forEach) {
    Array.prototype.forEach = function forEach(callback, thisArg) {
        var T, k;
        if (this == null) {
            throw new TypeError("this is null or not defined");
        }
        var O = Object(this);
        var len = O.length >>> 0;
        if ({}.toString.call(callback) !== "[object Function]") {
            throw new TypeError(callback + " is not a function");
        }
        if (thisArg) {
            T = thisArg;
        }
        k = 0;
        while (k < len) {
            var kValue;
            if (Object.prototype.hasOwnProperty.call(O, k)) {
                kValue = O[k];
                callback.call(T, kValue, k, O);
            }
            k++;
        }
    };
}

new function() {
    var debug = true;
    var original = window.console;
    window.console = {};
    [ "log", "assert" ].forEach(function(method) {
        console[method] = function() {
            return debug && original ? original[method].apply(original, arguments) : undefined;
        };
    });
}();

var log = function() {
    console.log(sprintf.apply(this, arguments));
};

var slogf = function() {
    return sprintf("[%'05d]|  %-40s|  %s", Executor.currentTick, arguments[0].getObjectName(), sprintf.apply(this, Array.prototype.slice.call(arguments, 1)));
};

var logf = function() {
    console.log(slogf.apply(this, arguments));
};

var alert = window.alert;

var assert = console.assert;

var assert = function() {
    log("assert");
    console.assert.apply(this, arguments);
};

var assertf = function() {
    if (!arguments[0]) {
        console.assert(false, slogf.apply(this, Array.prototype.slice.call(arguments, 1)));
    }
};

function objToString(obj, maxDepth) {
    if (maxDepth <= 0) return "{ }";
    var str = "{";
    for (var elem in obj) {
        if (typeof obj[elem] == "function") continue;
        str += elem + ": ";
        if (typeof obj[elem] == "object") {
            str += objToString(obj[elem], maxDepth - 1);
        } else {
            str += obj[elem];
        }
        str += "; ";
    }
    str += "}";
    return str;
}

function strToInt(str) {
    var tx = +str;
    if (tx == NaN) tx = +("0x" + str);
    if (tx == NaN) return;
    return tx;
}

function ipStringToInt(ipStr) {
    var ipInt = 0;
    var arr = ipStr.split(".");
    if (arr.length > 4) return;
    for (var i = 0; i < arr.length; i++) {
        var tx = strToInt(arr[i]);
        if (!(tx >= 0 && tx <= 255)) return;
        ipInt = ipInt * 256 + tx;
    }
    return ipInt;
}

function ipIntToString(ipInt) {
    var ipStr = (ipInt % 256).toString();
    for (var i = 3; i > 0; i--) {
        ipInt = Math.floor(ipInt / 256);
        ipStr = ipInt % 256 + "." + ipStr;
    }
    return ipStr;
}

function macIntToString(macInt) {
    var macStr = sprintf("%'02x", macInt % 256);
    for (var i = 1; i < 6; i++) {
        macInt = Math.floor(macInt / 256);
        macStr = sprintf("%'02x", macInt % 256) + ":" + macStr;
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
    if (!(short >= 0 && short <= 32)) return;
    return ipFullNetmask - getMask(32 - short);
}

function netmaskFullToShort(full) {
    return 32 - floorLog2(ipFullNetmask - full + 1);
}

function getCanonicalIp(ip, netmask) {
    return ip - ip % (ipFullNetmask - netmask + 1);
}

function isInSubnet(ip, netmask, targetIp) {
    return getCanonicalIp(ip, netmask) == getCanonicalIp(targetIp, netmask);
}

function getBroadcastIp(ip, netmask) {
    return getCanonicalIp(ip, netmask) + (ipFullNetmask - netmask);
}

function isZeroNetwork(ip, netmask) {
    return 0 == getCanonicalIp(ip, netmask);
}

function addressObjToString(addressObj) {
    return sprintf("%s/%d", ipIntToString(addressObj.ip), netmaskFullToShort(addressObj.netmask));
}

function addressStringToObj(addressStr) {
    var t = addressStr.split("/");
    var ipInt = ipStringToInt(t[0]);
    if (ipInt == null) return;
    var netmaskFull = netmaskShortToFull(+t[1]);
    if (netmaskFull == null) return;
    return {
        ip: ipInt,
        netmask: netmaskFull
    };
}

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    if (obj instanceof Date) {
        var copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }
    if (obj instanceof Array) {
        var copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }
    if (obj instanceof Object) {
        var copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }
    throw new Error("Unable to copy obj! Its type isn't supported.");
}

var Queue = function(owner, queueName, size, autoShrink) {
    this.owner = owner;
    this.queueName = queueName;
    this.array = new Array(size);
    this.autoShrink = autoShrink;
    this.clear = function() {
        this.top = 0;
        this.bottom = 0;
        this.count = 0;
    };
    this.deepClear = function() {
        this.compact(this, function() {
            return false;
        });
        this.clear();
    };
    this.isEmpty = function() {
        return this.count == 0;
    };
    this.isFull = function() {
        return this.count == this.array.length;
    };
    this.getItem = function(i) {
        assertf(i >= 0 && i < this.count, slogf(this.owner, "%s's index is out of bound", this.queueName));
        return this.array[(this.bottom + i) % this.array.length];
    };
    this.setItem = function(i, value) {
        assertf(i >= 0 && i < this.count, slogf(this.owner, "%s's index is out of bound", this.queueName));
        return this.array[(this.bottom + i) % this.array.length] = value;
    };
    this.push = function(obj) {
        if (this.isFull()) {
            if (this.autoShrink) {
                this.shrinkQueue();
                this.push(obj);
            } else logf(this.owner, "%s is full => object won't be pushed", this.queueName);
            return;
        }
        this.array[this.top] = obj;
        this.top++;
        this.count++;
        if (this.top == this.array.length) this.top = 0;
    };
    this.pop = function() {
        if (this.isEmpty()) {
            logf(this.owner, "%s is empty => 'undefined' will be returned", this.queueName);
            return;
        }
        var x = this.array[this.bottom];
        this.array[this.bottom] = undefined;
        this.bottom++;
        this.count--;
        if (this.bottom == this.array.length) this.bottom = 0;
        return x;
    };
    this.peek = function() {
        assertf(this.count > 0, slogf(this.owner, "%s's index is out of bound", this.queueName));
        return this.array[this.bottom];
    };
    this.compact = function(obj, comparer) {
        var j = 0;
        for (var i = 0; i < this.count; i++) {
            var x = this.getItem(i);
            if (comparer.call(obj, x)) {
                this.setItem(j, x);
                j++;
            }
        }
        var compactSuccessed = j < this.count;
        for (var i = j; i < this.count; i++) {
            this.setItem(i, undefined);
        }
        this.top = (this.bottom + j) % this.array.length;
        this.count = j;
        return compactSuccessed;
    };
    this.removeFrom = function(index) {
        var comparer = function(x) {
            return x != index;
        };
        return this.compact(this, comparer);
    };
    this.toString = function() {
        var str = "";
        for (var i = 0; i < this.count; i++) {
            str += objToString(this.getItem(i), 2);
        }
        return str;
    };
    this.shrinkQueue = function() {
        var array = new Array(this.array.length * 2);
        for (var i = 0; i < this.count; i++) {
            array[i] = this.getItem(i);
        }
        this.array = array;
        this.bottom = 0;
        this.top = this.count;
    };
    this.clear();
};

var ElementaryActionObject = function() {
    this.doElementaryAction = function() {
        log("handler for elementary action not found");
    };
    this.addActiveElementaryObjects = function(activeObjects) {
        activeObjects.push(this);
    };
};

var Environment = new function() {
    this.objects = {
        tm: [],
        "switch": [],
        router: [],
        host: []
    };
    this.isChanged = false;
    this.activeObjects = [];
    this.nextUniqueName = 1;
    this.nextUniqueMac = 1;
    this.getActiveElementaryObjects = function() {
        if (!this.isChanged) return this.activeObjects;
        this.activeObjects = [];
        for (var objectType in this.objects) {
            var arr = this.objects[objectType];
            for (var j = 0; j < arr.length; j++) {
                arr[j].addActiveElementaryObjects(this.activeObjects);
            }
        }
        this.isChanged = false;
        return this.activeObjects;
    };
    this.createObject = function(objectTypeName) {
        var newObject;
        switch (objectTypeName) {
          case "host":
            newObject = new Host(this.getNextUniqueName());
            break;

          case "router":
            newObject = new Router(this.getNextUniqueName());
            break;

          case "switch":
            newObject = new Switch(this.getNextUniqueName());
            break;

          case "tm":
            newObject = new TransMedium();
            break;

          default:
            log("unknown new node type: %s", objectTypeName);
            break;
        }
        return newObject;
    };
    this.addObject = function(obj) {
        this.objects[obj.objectTypeName].push(obj);
        this.isChanged = true;
        return obj;
    };
    this.removeObject = function(obj) {
        if (obj.objectTypeName == "tm") {
            this.removeTransMedium(obj);
        } else {
            this.removeHostOrSwitch(obj);
        }
    };
    this.removeHostOrSwitch = function(obj) {
        obj.ports.forEach(function(port) {
            if (port.toSendTMDirection) {
                Environment.removeTransMedium(port.toSendTMDirection.owner);
            }
        });
        this.removeObjectFromEnvironment(obj);
    };
    this.removeTransMedium = function(tm) {
        var port1 = tm.directions.toPort1.toPort, port2 = tm.directions.toPort1.fromPort;
        port1.owner.removePort(port1.index);
        port2.owner.removePort(port2.index);
        tm.disconnectPorts();
        this.removeObjectFromEnvironment(tm);
    };
    this.removeObjectFromEnvironment = function(obj) {
        var arr = this.objects[obj.objectTypeName];
        var i = arr.indexOf(obj);
        if (i >= 0) {
            arr.splice(i, 1);
            this.isChanged = true;
        }
    };
    this.connectObjects = function(objX, objY) {
        var portX = objX.addPort(this.getNextUniqueMac()), portY = objY.addPort(this.getNextUniqueMac()), tm = this.createObject("tm");
        tm.connectPorts(portX, portY);
        return this.addObject(tm);
    };
    this.getNextUniqueMac = function() {
        return macIntToString(this.nextUniqueMac++);
    };
    this.getNextUniqueName = function() {
        return this.nextUniqueName++;
    };
    this.createSubnet = function(firstIpStr, netmaskShort, hostsCount, router) {
        var firstIp = ipStringToInt(firstIpStr);
        var netmask = netmaskShortToFull(netmaskShort);
        router.addPort(this.getNextUniqueMac());
        router.netIfaces[router.netIfaces.length - 1].addIp(firstIp, netmask);
        var hosts = [];
        for (var i = 0; i < hostsCount; i++) {
            hosts[i] = new Host(this.objects.host.length.toString());
            hosts[i].addPort(this.getNextUniqueMac());
            var netIfaceIndex = hosts[i].netIfaces.length - 1;
            hosts[i].netIfaces[netIfaceIndex].addIp(firstIp + i + 1, netmask);
            hosts[i].routingTable.addRoute(0, 0, firstIp, hosts[i].netIfaces[netIfaceIndex], 1);
            this.addObject(hosts[i]);
        }
        var tmsCount = hostsCount + 1;
        var tms = [];
        for (var i = 0; i < tmsCount; i++) {
            tms[i] = new TransMedium();
            this.addObject(tms[i]);
        }
        var sw = new Switch(Environment.objects["switch"].length.toString());
        for (var i = 0; i < hostsCount + 1; i++) {
            sw.addPort();
        }
        this.addObject(sw);
        for (var i = 0; i < hostsCount; i++) {
            this.connectPorts(hosts[i].getPort(hosts[i].ports.length - 1), sw.getPort(i), tms[i]);
        }
        this.connectPorts(router.getPort(router.ports.length - 1), sw.getPort(hostsCount), tms[hostsCount]);
    };
    this.sendTo = function(fromHost, srcIp, srcPort, dstIp, dstPort, message) {
        if (Environment.objects["host"].indexOf(fromHost) >= 0) {
            fromHost.protocolHandlers.UDP.send(srcIp, srcPort, dstIp, dstPort, message);
        }
    };
}();

var Executor = new function() {
    this.pauseBetweenTicksInMs = 100;
    this.currentTick = -1;
    this.objectTypeName = "Executor";
    this.indexToCall = 0;
    this.timerId;
    this.jobs = new Queue(this, "jobs queue", 25, true);
    this.activeObjects = [];
    this.getObjectName = function() {
        return this.objectTypeName;
    };
    this.isTickExecutionDone = function() {
        return this.indexToCall == this.activeObjects.length;
    };
    this.invokeCurrentActiveObject = function() {
        return this.activeObjects[this.indexToCall].doElementaryAction();
    };
    this.doElementaryActionsUntilValuableOrTickDone = function() {
        this.runJobs();
        while (!this.isTickExecutionDone() && !this.invokeCurrentActiveObject()) {
            this.indexToCall++;
        }
        if (this.isTickExecutionDone()) {
            Visualizer.redrawMessages();
            this.prepareNextTickExectuion();
        } else this.indexToCall++;
    };
    this.doTickUntilDone = function() {
        this.runJobs();
        while (!this.isTickExecutionDone()) {
            this.invokeCurrentActiveObject();
            this.indexToCall++;
        }
        Visualizer.redrawMessages();
        this.prepareNextTickExectuion();
    };
    this.isPaused = function() {
        return !this.timerId;
    };
    this.pause = function() {
        if (!this.isPaused()) {
            window.clearInterval(this.timerId);
            this.timerId = undefined;
        }
    };
    this.stepForward = function() {
        if (this.isPaused()) {
            this.doElementaryActionsUntilValuableOrTickDone();
        }
    };
    this.play = function() {
        if (this.isPaused()) {
            this.timerId = window.setInterval(function() {
                Executor.doTickUntilDone();
            }, this.pauseBetweenTicksInMs);
        }
    };
    this.prepareNextTickExectuion = function() {
        this.indexToCall = 0;
        this.activeObjects = Environment.getActiveElementaryObjects();
        this.currentTick++;
        if (this.currentTick % Math.floor(5e3 / this.pauseBetweenTicksInMs) == 0) log("vtime:      %s", this.currentTick);
    };
    this.addJob = function(func, runTickDelay) {
        this.jobs.push({
            func: func,
            runTick: this.currentTick + runTickDelay
        });
    };
    this.runJobs = function() {
        while (!this.jobs.isEmpty()) {
            if (this.jobs.peek().runTick > this.currentTick) break;
            var job = this.jobs.pop();
            job.func();
        }
    };
    this.prepareNextTickExectuion();
}();

var TransMedium = function(ticksToTransfer) {
    this.objectTypeName = "tm";
    this.directions = {};
    if (ticksToTransfer == undefined) this.ticksToTransfer = 5; else this.ticksToTransfer = ticksToTransfer;
    this.getObjectName = function() {
        return this.objectTypeName;
    };
    this.connectPorts = function(port1, port2) {
        this.directions = {};
        this.directions.toPort1 = new TransMediumDirection(this, port2, port1);
        this.directions.toPort2 = new TransMediumDirection(this, port1, port2);
        port1.setTMDirectionToSend(this.directions.toPort2);
        port2.setTMDirectionToSend(this.directions.toPort1);
    };
    this.disconnectPorts = function() {
        this.directions.toPort1.toPort.unsetTMDirectionToSend();
        this.directions.toPort2.toPort.unsetTMDirectionToSend();
        this.directions = {};
    };
    this.addActiveElementaryObjects = function(activeObjects) {
        if (this.directions) {
            for (var direction in this.directions) {
                this.directions[direction].addActiveElementaryObjects(activeObjects);
            }
        }
    };
};

var TransMediumDirection = function(owner, fromPort, toPort) {
    ElementaryActionObject.call(this);
    this.owner = owner;
    this.fromPort = fromPort;
    this.toPort = toPort;
    this.getObjectName = function() {
        return sprintf("%s.<%s> → <%s>", this.owner.getObjectName(), this.fromPort.getObjectName(), this.toPort.getObjectName());
    };
    this.resetOptions = function() {
        this.busy = false;
        this.frame = undefined;
        this.ticksToFlushPortsBuffer = undefined;
        this.transferStartTick = undefined;
    };
    this.isDelivered = function() {
        return this.busy && Executor.currentTick - this.transferStartTick >= this.owner.ticksToTransfer + this.ticksToFlushPortsBuffer;
    };
    this.randomDropFrame = function() {
        if (Math.random() < .01) {
            logf(this, "frame damaged during transfer: %s", this.frame.toString());
            return true;
        }
    };
    this.doElementaryAction = function() {
        if (this.busy) {
            if (this.randomDropFrame()) {
                this.resetOptions();
                return true;
            }
            if (this.isDelivered()) {
                this.send();
                this.resetOptions();
                return true;
            }
        }
        return false;
    };
    this.receive = function(frame, ticksToFlushPortsBuffer) {
        this.busy = true;
        this.frame = frame;
        this.ticksToFlushPortsBuffer = ticksToFlushPortsBuffer;
        this.transferStartTick = Executor.currentTick;
        logf(this, "received frame");
    };
    this.send = function() {
        if (this.toPort) {
            this.toPort.receive(this.frame);
        }
    };
    this.getFrameDeliveryPercent = function() {
        if (this.busy) {
            return Math.min(1, (Executor.currentTick - this.transferStartTick) / (this.owner.ticksToTransfer + this.ticksToFlushPortsBuffer));
        }
    };
    this.resetOptions();
};

var PhysicalPort = function(owner, index, upperObject) {
    this.prototype = new ElementaryActionObject();
    ElementaryActionObject.call(this);
    this.objectTypeName = "port";
    this.owner = owner;
    this.index = index;
    this.upperObject = upperObject;
    this.toSendTMDirection;
    this.toSendQueueSize = 128;
    this.toSend = new Queue(this, "toSendQueue", this.toSendQueueSize);
    this.transferRateByOctets = 512;
    this.setIndex = function(i) {
        this.index = i;
    };
    this.getObjectName = function() {
        return sprintf("%s.%s%d", this.owner.getObjectName(), this.objectTypeName, this.index);
    };
    this.setTMDirectionToSend = function(toSendTMDirection) {
        this.toSendTMDirection = toSendTMDirection;
    };
    this.unsetTMDirectionToSend = function() {
        this.toSendTMDirection = null;
    };
    this.receive = function(frame) {
        logf(this, "received frame: %s", frame.toString());
        if (this.upperObject) {
            this.upperObject.receive(index, frame);
        }
    };
    this.send = function(frame) {
        this.toSend.push({
            frame: frame
        });
    };
    this.doSendAction = function() {
        if (!this.toSendTMDirection) {
            if (!this.toSend.isEmpty()) {
                logf(this, "dropped frame due to no transmission medium connected: %s", this.toSend.pop().frame.toString());
                return true;
            }
            return false;
        }
        if (this.toSendTMDirection.busy || this.toSend.isEmpty()) return false;
        var args = this.toSend.pop();
        var frame = args.frame;
        logf(this, "sent frame: %s", frame.toString());
        this.toSendTMDirection.receive(frame, Math.floor(frame.getSize() / this.transferRateByOctets));
        return true;
    };
    this.doElementaryAction = function() {
        return this.doSendAction();
    };
};

var NetIface = function(owner, lowerObject, mac) {
    this.objectTypeName = "netiface";
    this.owner = owner;
    this.mac = mac;
    this.lowerObject = lowerObject;
    this.upperProtocol = "Ethernet";
    this.promiscousMode = false;
    this.addresses = [];
    this.getObjectName = function() {
        return sprintf("%s.%s%s", this.owner.getObjectName(), this.objectTypeName, this.mac);
    };
    this.setLowerObject = function(lowerObject) {
        this.lowerObject = lowerObject;
    };
    this.receive = function(lowerObject, frame) {
        logf(this, "received frame: %s", frame.toString());
        this.owner.protocolHandlers[this.upperProtocol].receive(this, frame);
    };
    this.send = function(frame) {
        if (this.lowerObject) this.lowerObject.send(frame);
    };
    this.hasIp = function(ip) {
        for (pair in this.addresses) {
            if (ip == this.addresses[pair].ip) {
                return true;
            }
        }
        return false;
    };
    this.addIp = function(ip, netmask) {
        if (ip == getBroadcastIp(ip, netmask) || ip == getCanonicalIp(ip, netmask) || isZeroNetwork(ip, netmask)) {
            logf(this, "ip address %s is canonical or broadcast or has network prefix = 0 for particular netmask %s", ipIntToString(ip), ipIntToString(netmask));
            return;
        } else if (this.hasIp(ip)) {
            logf(this, "pair {ip, netmask} = {%s, %s} already exists for selected interface", ipIntToString(ip), ipIntToString(netmask));
            return;
        }
        this.addresses.push({
            ip: ip,
            netmask: netmask
        });
        var canonicalIp = getCanonicalIp(ip, netmask);
        if (!this.owner.routingTable.routeExists(canonicalIp, netmask, this.owner.routingTable.zeroGateway, this)) {
            this.owner.routingTable.addRoute(canonicalIp, netmask, this.owner.routingTable.zeroGateway, this);
        }
    };
    this.removeIp = function(ip) {
        var i;
        var network;
        for (i = 0; i < this.addresses.length; i++) {
            if (ip == this.addresses[i].ip) {
                network = getCanonicalIp(ip, this.addresses[i].netmask);
                break;
            }
        }
        if (i == this.addresses.length) {
            logf(this, "ip %s doesn't exist", this.objectTypeName, ipIntToString(ip));
            return;
        }
        var networksCount = 0;
        this.addresses.forEach(function(pair) {
            if (network == getCanonicalIp(pair.ip, pair.netmask)) networksCount++;
        });
        if (networksCount == 1) {
            var canonicalIp = network;
            var netmask = this.addresses[i].netmask;
            if (this.owner.routingTable.routeExists(canonicalIp, netmask, this.owner.routingTable.zeroGateway, this)) {
                this.owner.routingTable.removeRoute(canonicalIp, netmask, this.owner.routingTable.zeroGateway, this);
            }
        }
        this.addresses.splice(i, 1);
    };
    this.removeAllIp = function() {
        this.addresses.forEach(function(pair) {
            NetIface.removeIp(pair.ip);
        });
    };
};

var LoopbackNetIface = function(owner) {
    NetIface.call(this, owner);
    this.promiscousMode = true;
    this.addIp(IPv4.reservedAddresses.loopback.ip, IPv4.reservedAddresses.loopback.netmask);
    this.send = function(frame) {
        this.receive(this, frame);
    };
};

inherit(LoopbackNetIface, NetIface);

var Ethernet = new function() {
    this.protName = "Ethernet";
    this.protocols = new Array();
    this.protocols[2048] = "IPv4";
    this.protocols[2054] = "ARP";
    this.broadcastMac = "ff:ff:ff:ff:ff:ff";
    this.maxTransmissionUnit = 1518;
    this.headerSize = 18;
}();

var EthernetHandler = function(owner) {
    ElementaryActionObject.call(this);
    this.owner = owner;
    this.toSendQueueSize = 5;
    this.toSend = new Queue(this.owner, Ethernet.protName, this.toSendQueueSize);
    this.getObjectName = function() {
        return sprintf("%s.%s", this.owner.getObjectName(), Ethernet.protName);
    };
    this.receive = function(fromNetIface, frame) {
        if (fromNetIface.promiscousMode || frame.dstMac == Ethernet.broadcastMac || fromNetIface.mac == frame.dstMac) {
            var upperProtocol = this.owner.protocolHandlers[Ethernet.protocols[frame.etherType]];
            if (upperProtocol) {
                upperProtocol.receive(fromNetIface, frame.data, frame.dstMac == Ethernet.broadcastMac);
            } else {
                logf(this, "the device doesn't support appropriate protocol => frame dropped: %s received through %s", frame.toString(), fromNetIface.getObjectName());
            }
        } else {
            logf(this, "dropped frame %s received through %s", frame.toString(), fromNetIface.getObjectName());
        }
    };
    this.send = function(toNetIface, dstMac, etherType, data) {
        this.toSend.push({
            toNetIface: toNetIface,
            dstMac: dstMac,
            etherType: etherType,
            data: data
        });
    };
    this.doSendAction = function() {
        if (this.toSend.isEmpty()) return false;
        var args = this.toSend.pop();
        var toNetIface = args.toNetIface;
        var dstMac = args.dstMac;
        var etherType = args.etherType;
        var data = args.data;
        var frame = new EthernetFrame(toNetIface.mac, dstMac, etherType, data);
        if (frame.getSize() <= Ethernet.maxTransmissionUnit) {
            logf(this, "sent frame %s through %s", frame.toString(), toNetIface.getObjectName());
            toNetIface.send(frame);
        } else logf(this, "dropped frame due to MTU limits exceeding: %s", frame.toString());
        return true;
    };
    this.doElementaryAction = function() {
        return this.doSendAction();
    };
};

EthernetFrame = function(srcMac, dstMac, etherType, data) {
    this.srcMac = srcMac;
    this.dstMac = dstMac;
    this.etherType = etherType;
    this.data = data;
    this.toString = function() {
        return sprintf("[%s: from=%s, to=%s, etherType=%s, data=%s]", Ethernet.protName, this.srcMac, this.dstMac, this.etherType, this.data.toString());
    };
    this.getSize = function() {
        var size = 0;
        if (typeof this.data == "object") {
            size = this.data.getSize();
        } else {
            assertf(typeof this.data == "string", "EthernetFrame: unknown type of data");
            size = this.data.length;
        }
        return size + Ethernet.headerSize;
    };
};

var ARP = new function() {
    this.protName = "ARP";
    this.operations = {
        request: 1,
        reply: 2
    };
    this.unknownHardwareAddress = "00:00:00:00:00:00";
    this.lowerProtocol = "Ethernet";
    this.protocolNumberForEthernet = 2054;
    this.headerSize = 28;
}();

var ARPHandler = function(owner) {
    ElementaryActionObject.call(this);
    this.toSendQueueSize = 128;
    this.cacheOfRecentlyRequestedIpQueueSize = this.toSendQueueSize;
    this.cacheOfRecentlyRequestedIpRecordTimeout = 24;
    this.owner = owner;
    this.toSend = new Queue(this, ARP.protName, this.toSendQueueSize);
    this.cacheOfRecentlyRequestedIp = new Queue(this, ARP.protName, this.cacheOfRecentlyRequestedIpQueueSize);
    this.getObjectName = function() {
        return sprintf("%s.%s", this.owner.getObjectName(), ARP.protName);
    };
    this.receive = function(fromNetIface, packet) {
        if (this.senderIpIsValid(fromNetIface, packet.senderProtocolAddress)) {
            this.owner.arpTable.update(packet.senderProtocolAddress, packet.senderHardwareAddress, fromNetIface);
        }
        if (packet.operation == ARP.operations.request && fromNetIface.hasIp(packet.targetProtocolAddress)) {
            this.reply(fromNetIface, ARP.operations.reply, packet.targetProtocolAddress, packet.senderHardwareAddress, packet.senderProtocolAddress);
        }
    };
    this.senderIpIsValid = function(netIface, ip) {
        return !IPv4.isThisNetworkIp(ip) && !IPv4.isLoopbackIp(ip) && !IPv4.isMulticastIp(ip) && !IPv4.isBroadcastIpForNetIface(netIface, ip) && IPv4.getMinNetworkWhereIpNotBroadcast(netIface, ip) != undefined;
    };
    this.reply = function(toNetIface, operation, senderProtocolAddress, targetHardwareAddress, targetProtocolAddress) {
        this.toSend.push({
            toNetIface: toNetIface,
            operation: operation,
            senderProtocolAddress: senderProtocolAddress,
            targetHardwareAddress: targetHardwareAddress,
            targetProtocolAddress: targetProtocolAddress
        });
    };
    this.send = function(toNetIface, operation, senderProtocolAddress, targetProtocolAddress) {
        this.toSend.push({
            toNetIface: toNetIface,
            operation: operation,
            senderProtocolAddress: senderProtocolAddress,
            targetProtocolAddress: targetProtocolAddress
        });
    };
    this.doSendAction = function() {
        if (this.toSend.isEmpty()) return false;
        var args = this.toSend.pop();
        var toNetIface = args.toNetIface;
        var operation = args.operation;
        var senderProtocolAddress = args.senderProtocolAddress;
        var targetProtocolAddress = args.targetProtocolAddress;
        if (operation == ARP.operations.request || args.targetHardwareAddress == undefined) {
            var networkSendFrom = IPv4.getMinNetworkWhereIpNotBroadcast(toNetIface, targetProtocolAddress);
            if (!networkSendFrom) {
                logf(this, "cannot send packet to %s through %s. Is it broadcast?", targetProtocolAddress, toNetIface.getObjectName());
                return true;
            }
        }
        var lowerProtocol = this.owner.protocolHandlers[ARP.lowerProtocol];
        if (operation == ARP.operations.request) {
            if (!this.isIpInCache(targetProtocolAddress)) {
                var packet = new ARPPacket(operation, toNetIface.mac, networkSendFrom.ip, ARP.unknownHardwareAddress, targetProtocolAddress);
                logf(this, "sent request %s through %s", packet.toString(), toNetIface.getObjectName());
                this.cacheOfRecentlyRequestedIp.push({
                    ip: targetProtocolAddress,
                    initTick: Executor.currentTick
                });
                lowerProtocol.send(toNetIface, Ethernet.broadcastMac, ARP.protocolNumberForEthernet, packet);
            } else {}
        } else if (operation == ARP.operations.reply) {
            if (args.targetHardwareAddress != undefined) var dstMac = args.targetHardwareAddress; else var dstMac = this.owner.arpTable.determineMac(targetProtocolAddress, toNetIface);
            if (dstMac != undefined) {
                var packet = new ARPPacket(operation, toNetIface.mac, senderProtocolAddress, dstMac, targetProtocolAddress);
                logf(this, "sent reply %s through %s", packet.toString(), toNetIface.getObjectName());
                lowerProtocol.send(toNetIface, dstMac, ARP.protocolNumberForEthernet, packet);
            } else {
                logf(this, "targetHardwareAddress to reply is not found => packet dropped");
            }
        } else {
            logf(this, "unknown packet operation => packet dropped");
        }
        return true;
    };
    this.isIpInCache = function(ip) {
        for (var i = 0; i < this.cacheOfRecentlyRequestedIp.count; i++) {
            if (ip == this.cacheOfRecentlyRequestedIp.getItem(i).ip) return true;
        }
        return false;
    };
    this.releaseTimedOutRecordsFromCacheOfRecentlyRequestedIp = function() {
        while (!this.cacheOfRecentlyRequestedIp.isEmpty() && Executor.currentTick - this.cacheOfRecentlyRequestedIp.peek().initTick > this.cacheOfRecentlyRequestedIpRecordTimeout) {
            this.cacheOfRecentlyRequestedIp.pop();
        }
    };
    this.doElementaryAction = function() {
        this.releaseTimedOutRecordsFromCacheOfRecentlyRequestedIp();
        return this.doSendAction();
    };
};

var ARPPacket = function(operation, senderHardwareAddress, senderProtocolAddress, targetHardwareAddress, targetProtocolAddress) {
    this.operation = operation;
    this.senderHardwareAddress = senderHardwareAddress;
    this.senderProtocolAddress = senderProtocolAddress;
    this.targetHardwareAddress = targetHardwareAddress;
    this.targetProtocolAddress = targetProtocolAddress;
    this.toString = function() {
        return sprintf("[%s: operation=%s, sha=%s, spa=%s, tha=%s, tpa=%s]", ARP.protName, this.operation == ARP.operations.request ? "request" : this.operation == ARP.operations.reply ? "reply" : "unknown", this.senderHardwareAddress, ipIntToString(this.senderProtocolAddress), this.targetHardwareAddress, ipIntToString(this.targetProtocolAddress));
    };
    this.getSize = function() {
        return ARP.headerSize;
    };
};

var IPv4 = new function() {
    this.reservedAddresses = {
        loopback: {
            ip: ipStringToInt("127.0.0.1"),
            netmask: netmaskShortToFull(8)
        },
        thisNetwork: {
            ip: ipStringToInt("0.0.0.0"),
            netmask: netmaskShortToFull(8)
        },
        broadcast: {
            ip: ipStringToInt("255.255.255.255"),
            netmask: netmaskShortToFull(32)
        },
        multicast: {
            ip: ipStringToInt("224.0.0.0"),
            netmask: netmaskShortToFull(4)
        }
    };
    this.protName = "IPv4";
    this.protocols = [];
    this.protocols[16] = "UDP";
    this.lowerProtocol = "Ethernet";
    this.protocolNumberForEthernet = 2048;
    this.maxTransmissionUnit = 1500;
    this.headerSize = 20;
    this.maxDatagramTotalSize = 65535;
    this.maxFragmentOffset = 65528;
    this.maxFragmentLength = 65535;
    this.timeoutToSendPacket = 256;
    this.timeoutToAssembleDatagram = 512;
    this.isThisNetworkIp = function(ip) {
        return isInSubnet(IPv4.reservedAddresses.thisNetwork.ip, IPv4.reservedAddresses.thisNetwork.netmask, ip);
    };
    this.isLimitedBroadcastIp = function(ip) {
        return isInSubnet(IPv4.reservedAddresses.broadcast.ip, IPv4.reservedAddresses.broadcast.netmask, ip);
    };
    this.isLoopbackIp = function(ip) {
        return isInSubnet(IPv4.reservedAddresses.loopback.ip, IPv4.reservedAddresses.loopback.netmask, ip);
    };
    this.isMulticastIp = function(ip) {
        return isInSubnet(IPv4.reservedAddresses.multicast.ip, IPv4.reservedAddresses.multicast.netmask, ip);
    };
    this.isCanonicalIpForNetIface = function(netIface, ip) {
        var res = false;
        netIface.addresses.forEach(function(address) {
            if (getCanonicalIp(address.ip, address.netmask) == ip) res = true;
        });
        return res;
    };
    this.isZeroNetworkForNetIface = function(netIface, ip) {
        var res = false;
        netIface.addresses.forEach(function(address) {
            if (isZeroNetwork(ip, address.netmask)) res = true;
        });
        return res;
    };
    this.isBroadcastIpForNetIface = function(netIface, ip) {
        var res = false;
        netIface.addresses.forEach(function(address) {
            if (getBroadcastIp(address.ip, address.netmask) == ip) res = true;
        });
        return res;
    };
    this.getMinNetworkWhereIpNotBroadcast = function(netIface, ipMustNotBroadcast) {
        var minNetwork = {
            ip: 0,
            netmask: 0
        };
        netIface.addresses.forEach(function(network) {
            if (isInSubnet(network.ip, network.netmask, ipMustNotBroadcast) && ipMustNotBroadcast != getBroadcastIp(network.ip, network.netmask) && network.netmask > minNetwork.netmask) {
                minNetwork = network;
            }
        });
        if (minNetwork.ip != 0) return minNetwork;
    };
}();

var IPv4Handler = function(owner) {
    ElementaryActionObject.call(this);
    this.owner = owner;
    this.toSendQueueSize = 128;
    this.toSend = new Queue(this, IPv4.protNamek, this.toSendQueueSize);
    this.receivedFragmentedPackets = [];
    this.innerUIDForFragmentedPackets = 0;
    this.getObjectName = function() {
        return sprintf("%s.%s", this.owner.getObjectName(), IPv4.protName);
    };
    this.getInnerUIDForFragmentedPackets = function() {
        return this.innerUIDForFragmentedPackets++;
    };
    this.receive = function(fromNetIface, packet, isBroadcastEthernetFrame) {
        if (packet.fragmentOffset > IPv4.maxFragmentOffset) {
            logf(this, "received packet with too big offset field => packet dropped: %s", packet.toString());
        } else if (packet.fragmentLength > IPv4.maxFragmentLength) {
            logf(this, "received packet with too big length field => packet dropped: %s", packet.toString());
        } else if (!this.checkSrcIpIsValid(packet.srcIp)) {
            logf(this, "invalid srcIp => packet dropped: %s", packet.toString());
        } else if (IPv4.isMulticastIp(packet.dstIp)) {
            logf(this, "received multicast packet. Not implemented now due to IGMP => packet dropped: %s", packet.toString());
        } else if (IPv4.isCanonicalIpForNetIface(fromNetIface, packet.dstIp)) {
            logf(this, "received packet with dstIp like {<netIface.network>.0} => packet dropped: %s", packet.toString());
        } else if (IPv4.isLoopbackIp(packet.srcIp) && fromNetIface != this.owner.loopbackNetIface) {
            logf(this, "packet may be malicious since it has been received from loopback network but from non-loopback netIface => packet dropped: %s", packet.toString());
        } else if (IPv4.isLoopbackIp(packet.dstIp) && fromNetIface != this.owner.loopbackNetIface) {
            logf(this, "packet may be malicious since it is directed to 'localhost' but received from non-loopback netIface => packet dropped: %s", packet.toString());
        } else if (IPv4.isLimitedBroadcastIp(packet.dstIp)) {
            this.handleReceivedPacket(packet);
        } else if (IPv4.isBroadcastIpForNetIface(fromNetIface, packet.dstIp)) {
            if (!isBroadcastEthernetFrame) {
                this.forward(fromNetIface, packet, isBroadcastEthernetFrame);
            }
            this.handleReceivedPacket(packet);
        } else if (this.hasIp(packet.dstIp)) {
            this.handleReceivedPacket(packet);
        } else {
            this.forward(fromNetIface, packet, isBroadcastEthernetFrame);
            var needToHandleReceivedPacket = false;
            this.owner.netIfaces.forEach(function(netIface) {
                if (netIface != fromNetIface && IPv4.isBroadcastIpForNetIface(netIface, packet.dstIp)) {
                    needToHandleReceivedPacket = true;
                }
            });
            if (needToHandleReceivedPacket) this.handleReceivedPacket(packet);
        }
    };
    this.forward = function(fromNetIface, packet, isBroadcastEthernetFrame) {
        if (isBroadcastEthernetFrame) {
            logf(this, "packet received as broadcast from channel level => packet isn't forwarded, i.e. packet dropped: %s", packet.toString());
        } else if (IPv4.isZeroNetworkForNetIface(fromNetIface, packet.srcIp)) {
            logf(this, "packet has network prefix = 0 for netIface received it => packet isn't forwarded, i.e. packet dropped: %s", packet.toString());
        } else {
            if (packet.getSize() <= IPv4.maxTransmissionUnit) this.toSend.push({
                packet: packet
            }); else {
                this.fragmentizePacket(packet).forEach(function(fragment) {
                    this.toSend.push({
                        packet: fragment
                    });
                }, this);
            }
        }
    };
    this.send = function(srcIp, dstIp, fromProtocolNumber, data) {
        if (data.getSize() > IPv4.maxFragmentLength - IPv4.headerSize) {
            logf(this, "datagram exceeds maximum allowed for ipv4 length => datagram dropped: %s", data.toString());
        } else if (!this.checkSrcIpIsValid(srcIp)) {
            logf(this, "invalid srcIp %s => datagram isn't sent: %s", ipIntToString(srcIp), data.toString());
        } else if ((IPv4.isLoopbackIp(srcIp) || IPv4.isLoopbackIp(dstIp)) && (!IPv4.isLoopbackIp(srcIp) || !IPv4.isLoopbackIp(dstIp))) {
            logf(this, "it isn't allowed to send datagrams from localhost to non-localhost and vice versa address => datagram dropped: %s", data.toString());
        } else if (!this.hasIp(srcIp)) {
            logf(this, "srcIp %s should be valid ip address of one of the device's netIface => datagram dropped: %s", ipIntToString(srcIp), data.toString());
        } else {
            var packet = new IPv4Packet(srcIp, dstIp, fromProtocolNumber, this.getInnerUIDForFragmentedPackets(), IPv4.headerSize + data.getSize(), 0, 0, data);
            if (packet.getSize() <= IPv4.maxTransmissionUnit) this.toSend.push({
                packet: packet
            }); else {
                this.fragmentizePacket(packet).forEach(function(fragment) {
                    this.toSend.push({
                        packet: fragment
                    });
                }, this);
            }
        }
    };
    this.doSendAction = function() {
        while (!this.toSend.isEmpty() && this.sendingTimeExpired(this.toSend.peek())) {
            logf(this, "packet's sending timeout expired => packet dropped: %s", this.toSend.peek().packet.toString());
            this.toSend.pop();
        }
        if (this.toSend.isEmpty()) return false;
        var args = this.toSend.pop();
        var packet = args.packet;
        var dstIp = packet.dstIp;
        var srcIp = packet.srcIp;
        if (IPv4.isLoopbackIp(dstIp)) {
            this.handleReceivedPacket(packet);
        } else if (this.hasIp(dstIp)) {
            this.handleReceivedPacket(packet);
        } else {
            var path = this.owner.routingTable.getPath(dstIp);
            if (path == undefined) {
                logf(this, "path to %s hasn't been found => packet dropped: %s", ipIntToString(dstIp), packet.toString());
                return;
            }
            var nextHopIp;
            if (path.gateway == 0) {
                nextHopIp = dstIp;
            } else {
                nextHopIp = path.gateway;
            }
            var dstMac;
            if (IPv4.isBroadcastIpForNetIface(path.netIface, dstIp)) dstMac = Ethernet.broadcastMac; else dstMac = this.owner.arpTable.determineMac(nextHopIp, path.netIface);
            if (dstMac != undefined) {
                logf(this, "sent packet %s through %s", packet.toString(), path.netIface.getObjectName());
                this.owner.protocolHandlers[IPv4.lowerProtocol].send(path.netIface, dstMac, IPv4.protocolNumberForEthernet, packet);
            } else {
                var resendTime = args.resendTime;
                if (resendTime == undefined) resendTime = Executor.currentTick;
                this.toSend.push({
                    packet: packet,
                    resendTime: resendTime
                });
                this.owner.protocolHandlers["ARP"].send(path.netIface, ARP.operations.request, srcIp, nextHopIp);
            }
        }
    };
    this.handleReceivedPacket = function(packet) {
        var upperProtocol = this.owner.protocolHandlers[IPv4.protocols[packet.protocolNumber]];
        if (upperProtocol) {
            if (packet.fragmentOffset != 0 || packet.moreFragments) {
                if (!this.receivedFragmentedPackets[packet.fragmentUniqueKey]) this.receivedFragmentedPackets[packet.fragmentUniqueKey] = {
                    fragments: [],
                    firstFragmentReceivedTick: Executor.currentTick
                };
                this.receivedFragmentedPackets[packet.fragmentUniqueKey].fragments[packet.fragmentOffset] = packet;
                var datagram = this.tryToAssembleDatagram(packet.fragmentUniqueKey);
            } else var datagram = packet.data;
            if (datagram) {
                if (datagram.getSize() > IPv4.maxDatagramTotalSize) {
                    logf(this, "datagram exceeds maximum allowed length => packet dropped: %s", packet.toString());
                } else {
                    upperProtocol.receive(packet.srcIp, packet.dstIp, datagram);
                }
            }
        } else {
            logf(this, "the device doesn't support appropriate protocol => packet dropped: %s", packet.toString());
        }
    };
    this.checkSrcIpIsValid = function(ip) {
        return !IPv4.isThisNetworkIp(ip) && !IPv4.isLimitedBroadcastIp(ip) && !IPv4.isMulticastIp(ip);
    };
    this.hasIp = function(ip) {
        var res = false;
        this.owner.netIfaces.forEach(function(netIface) {
            if (netIface.hasIp(ip)) res = true;
        });
        return res;
    };
    this.tryToAssembleDatagram = function(key) {
        var offset = 0;
        var arr = this.receivedFragmentedPackets[key].fragments;
        while (arr[offset]) {
            if (!arr[offset].moreFragments) {
                return this.assembleDatagram(key);
            }
            offset += arr[offset].fragmentLength;
        }
    };
    this.assembleDatagram = function(key) {
        var arr = this.receivedFragmentedPackets[key].fragments;
        var datagram = clone(arr[0].data);
        var offset = arr[0].fragmentLength;
        while (arr[offset]) {
            datagram.data += arr[offset].data;
            if (!arr[offset].moreFragments) break;
            offset += arr[offset].fragmentLength;
        }
        delete this.receivedFragmentedPackets[key];
        return datagram;
    };
    this.fragmentizePacket = function(packet) {
        var fragments = [];
        var length = 0;
        var offset = 0;
        var data = packet.data;
        var packetId = packet.packetId;
        if (packet.fragmentOffset == 0) {
            data = data.data;
            length = Math.min(IPv4.maxTransmissionUnit - UDP.headerSize - IPv4.headerSize, data.length);
            var fragment = packet.clonePacketByHeader(length + UDP.headerSize, 0, 1, new UDPDatagram(packet.data.srcPort, packet.data.dstPort, data.slice(0, length)));
            fragments.push(fragment);
            offset += length;
        }
        while (data.length > offset) {
            length = Math.min(IPv4.maxTransmissionUnit - IPv4.headerSize, data.length - offset);
            fragments.push(packet.clonePacketByHeader(length, packet.fragmentOffset + offset + UDP.headerSize, 1, data.slice(offset, offset + length)));
            offset += length;
        }
        fragments[fragments.length - 1].moreFragments = packet.moreFragments;
        return fragments;
    };
    this.sendingTimeExpired = function(objToSend) {
        return objToSend.resendTime != undefined ? Executor.currentTick - objToSend.resendTime > IPv4.timeoutToSendPacket : false;
    };
    this.releaseTimedOutFragmentedPackets = function() {
        for (var key in this.receivedFragmentedPackets) {
            var record = this.receivedFragmentedPackets[key];
            if (record.firstFragmentReceivedTick != undefined) {
                if (Executor.currentTick - record.firstFragmentReceivedTick > IPv4.timeoutToAssembleDatagram) {
                    logf(this, "released fragments for key %s", key);
                    delete this.receivedFragmentedPackets[key];
                }
            }
        }
    };
    this.doElementaryAction = function() {
        this.releaseTimedOutFragmentedPackets();
        return this.doSendAction();
    };
};

var IPv4Packet = function(srcIp, dstIp, protocolNumber, packetId, fragmentLength, fragmentOffset, moreFragments, data) {
    if (packetId == undefined) {
        window.alert("forgot to set packet id");
    }
    this.srcIp = srcIp;
    this.dstIp = dstIp;
    this.protocolNumber = protocolNumber;
    this.packetId = packetId;
    this.fragmentLength = fragmentLength;
    this.fragmentOffset = fragmentOffset;
    this.moreFragments = moreFragments;
    this.data = data;
    this.toString = function() {
        return sprintf("[%s: srcIp=%s, dstIp=%s, protNumber=%s, packetId=%s, length=%s, offset=%s, mf=%s, data=%s]", IPv4.protName, ipIntToString(this.srcIp), ipIntToString(this.dstIp), this.protocolNumber, this.packetId, this.fragmentLength, this.fragmentOffset, this.moreFragments, this.data.toString());
    };
    this.getSize = function() {
        var size = 0;
        if (typeof this.data == "object") {
            size = this.data.getSize();
        } else {
            assertf(typeof this.data == "string", "IPv4Packet: unknown type of data");
            size = this.data.length;
        }
        return size + IPv4.headerSize;
    };
    this.getFragmentUniqueKey = function() {
        return sprintf("%d_%d_%d_%d", this.packetId, this.dstIp, this.srcIp, this.protocolNumber);
    };
    this.clonePacketByHeader = function(fragmentLength, fragmentOffset, moreFragments, data) {
        return new IPv4Packet(this.srcIp, this.dstIp, this.protocolNumber, this.packetId, fragmentLength, fragmentOffset, moreFragments, data);
    };
    if (this.fragmentOffset != 0 || this.moreFragments) {
        this.fragmentUniqueKey = this.getFragmentUniqueKey();
    }
};

var UDP = new function() {
    this.protName = "UDP";
    this.lowerProtocol = "IPv4";
    this.maxTransmissionUnit = 65515;
    this.headerSize = 8;
    this.protocolNumberForIPv4 = 16;
}();

var UDPHandler = function(owner) {
    ElementaryActionObject.call(this);
    this.owner = owner;
    this.toSendQueueSize = 128;
    this.toSend = new Queue(this, UDP.protName, this.toSendQueueSize);
    this.getObjectName = function() {
        return sprintf("%s.%s", this.owner.getObjectName(), UDP.protName);
    };
    this.receive = function(srcIp, dstIp, datagram) {
        logf(this, "received datagram from %s to %s: %s", ipIntToString(srcIp), ipIntToString(dstIp), datagram.toString());
    };
    this.send = function(srcIp, srcPort, dstIp, dstPort, data) {
        this.toSend.push({
            srcIp: srcIp,
            srcPort: srcPort,
            dstIp: dstIp,
            dstPort: dstPort,
            data: data
        });
    };
    this.doSendAction = function() {
        if (this.toSend.isEmpty()) return false;
        var args = this.toSend.pop();
        var datagram = new UDPDatagram(args.srcPort, args.dstPort, args.data);
        if (datagram.getSize() <= UDP.maxTransmissionUnit) {
            logf(this, "sent datagram from %s to %s: %s", ipIntToString(args.srcIp), ipIntToString(args.dstIp), datagram.toString());
            this.owner.protocolHandlers[UDP.lowerProtocol].send(args.srcIp, args.dstIp, UDP.protocolNumberForIPv4, datagram);
        } else {
            logf(this, "dropped datagram due to MTU limits exceeding: %s", datagram.toString());
        }
        return true;
    };
    this.doElementaryAction = function() {
        return this.doSendAction();
    };
};

var UDPDatagram = function(srcPort, dstPort, data) {
    this.srcPort = srcPort;
    this.dstPort = dstPort;
    this.data = data;
    this.toString = function() {
        return sprintf('[%s: srcPort=%s, dstPort=%s, data="%s"]', UDP.protName, this.srcPort, this.dstPort, this.data.toString());
    };
    this.getSize = function() {
        var size = 0;
        if (typeof this.data == "object") {
            size = this.data.getSize();
        } else {
            assertf(typeof this.data == "string", "UDPDatagram: unknown type of data");
            size = this.data.length;
        }
        return size + UDP.headerSize;
    };
};

var Switch = function(name) {
    this.objectTypeName = "switch";
    this.deviceName = name;
    this.ports = [];
    this.macTable = new MacTable(this);
    this.getObjectName = function() {
        return sprintf("%s%s", this.objectTypeName, this.deviceName);
    };
    this.getPort = function(i) {
        assertf(i >= 0 && i < this.ports.length, slogf(this, "port's index is out of bound"));
        return this.ports[i];
    };
    this.addPort = function() {
        var port = new PhysicalPort(this, this.ports.length, this);
        this.ports.push(port);
        return port;
    };
    this.removePort = function(i) {
        assertf(i >= 0 && i < this.ports.length, slogf(this, "port's index is out of bound"));
        this.ports.splice(i, 1);
        for (var j = i; j < this.ports.length; j++) {
            this.ports[j].setIndex(j);
        }
    };
    this.receive = function(indexPortFrom, frame) {
        this.macTable.update(this.ports[indexPortFrom], frame.srcMac);
        var toSendPorts = [];
        if (frame.dstMac != Ethernet.broadcastMac) {
            toSendPorts = this.macTable.getPortsToSendExcept(frame.dstMac, this.ports[indexPortFrom]);
        }
        if (toSendPorts.length == 0) toSendPorts = this.getAllPortsExcept(indexPortFrom);
        for (var i = 0; i < toSendPorts.length; i++) {
            toSendPorts[i].send(frame);
        }
    };
    this.getAllPortsExcept = function(portIndex) {
        var res = [];
        for (var i = 0; i < this.ports.length; i++) {
            if (portIndex != i) res.push(this.ports[i]);
        }
        return res;
    };
    this.addActiveElementaryObjects = function(activeObjects) {
        this.macTable.addActiveElementaryObjects(activeObjects);
        for (var i = 0; i < this.ports.length; i++) {
            this.ports[i].addActiveElementaryObjects(activeObjects);
        }
    };
};

var MacTable = function(owner) {
    ElementaryActionObject.call(this);
    this.maxRecordLifetime = 300;
    this.maxRecordCount = 10;
    this.owner = owner;
    this.table = new Queue(this.owner, "macTable", this.maxRecordCount);
    this.update = function(port, mac) {
        for (var i = 0; i < this.table.count; i++) {
            var item = this.table.getItem(i);
            if (item.port == port && item.mac == mac) {
                item.initTick = Executor.currentTick;
                return;
            }
        }
        if (this.table.isFull()) {
            this.releaseTimedOutRecords();
            if (this.table.isFull()) {
                this.releaseOldestRecord();
            }
        }
        this.table.push(this.createObj(port, mac));
    };
    this.createObj = function(port, mac) {
        return {
            port: port,
            mac: mac,
            initTick: Executor.currentTick
        };
    };
    this.releaseTimedOutRecords = function() {
        var comparer = function(obj) {
            return Executor.currentTick <= obj.initTick + this.maxRecordLifetime;
        };
        return this.table.compact(this, comparer);
    };
    this.releaseOldestRecord = function() {
        if (this.table.isEmpty()) return;
        var i_oldest = 0;
        var oldest = this.table.getItem(i_oldest);
        for (var i = 0; i < this.table.count; i++) {
            if (this.table.getItem(i).initTick < oldest.initTick) {
                i_oldest = i;
                oldest = this.table.getItem(i);
            }
        }
        this.table.removeFrom(i_oldest);
    };
    this.getPortsToSend = function(mac) {
        var res = [];
        for (var i = 0; i < this.table.count; i++) {
            var item = this.table.getItem(i);
            if (item.mac == mac) {
                res.push(item.port);
            }
        }
        return res;
    };
    this.getPortsToSendExcept = function(mac, exceptedPort) {
        var arr = this.getPortsToSend(mac);
        var indexOfExcepted = arr.indexOf(exceptedPort);
        if (indexOfExcepted < 0) return arr;
        arr.splice(indexOfExcepted, 1);
        return arr;
    };
    this.doElementaryAction = function() {
        return this.releaseTimedOutRecords();
    };
};

var Router = function(name) {
    this.objectTypeName = "router";
    this.deviceName = name;
    this.protocolHandlers = {};
    this.protocolHandlers.Ethernet = new EthernetHandler(this);
    this.protocolHandlers.ARP = new ARPHandler(this);
    this.protocolHandlers.IPv4 = new IPv4Handler(this);
    this.ports = [];
    this.netIfaces = [];
    this.arpTable = new ARPTable(this);
    this.routingTable = new RoutingTable(this);
    this.getObjectName = function() {
        return sprintf("%s%s", this.objectTypeName, this.deviceName);
    };
    this.getPort = function(i) {
        assertf(i >= 0 && i < this.ports.length, slogf(this, "port's index is out of bound"));
        return this.ports[i];
    };
    this.addPort = function(mac) {
        var netIface = this.addNetIface(undefined, mac);
        var port = new PhysicalPort(this, this.ports.length, netIface);
        this.ports.push(port);
        netIface.setLowerObject(port);
        return port;
    };
    this.removePort = function(i) {
        assertf(i >= 0 && i < this.ports.length, slogf(this, "port's index is out of bound"));
        if (this.ports[i].upperObject) this.removeNetIface(i + 1);
        this.ports.splice(i, 1);
        for (var j = i; j < this.ports.length; j++) {
            this.ports[j].setIndex(j);
        }
    };
    this.addNetIface = function(lowerObject, mac) {
        var netIface = new NetIface(this, lowerObject, mac);
        this.netIfaces.push(netIface);
        return netIface;
    };
    this.removeNetIface = function(i) {
        assertf(i >= 0 && i < this.netIfaces.length, slogf(this, "interface's index is out of bound"));
        this.netIfaces[i].removeAllIp();
        this.netIfaces.splice(i, 1);
    };
    this.addActiveElementaryObjects = function(activeObjects) {
        for (var i = 0; i < this.ports.length; i++) {
            this.ports[i].addActiveElementaryObjects(activeObjects);
        }
        for (var protHandler in this.protocolHandlers) {
            this.protocolHandlers[protHandler].addActiveElementaryObjects(activeObjects);
        }
    };
    this.loopbackNetIface = new LoopbackNetIface(this);
    this.netIfaces.push(this.loopbackNetIface);
};

var RoutingTable = function(owner) {
    this.objectTypeName = "routingTable";
    this.maxRecordCount = 128;
    this.zeroGateway = 0;
    this.owner = owner;
    this.table = [];
    this.getObjectName = function() {
        return sprintf("%s.%s", this.owner.getObjectName(), this.objectTypeName);
    };
    this.getRouteIndex = function(ip, netmask, gateway, netIface) {
        for (var i = 0; i < this.table.length; i++) {
            var record = this.table[i];
            if (ip == record.ip && netmask == record.netmask && gateway == record.gateway && netIface == record.netIface) {
                return i;
            }
        }
    };
    this.routeExists = function(ip, netmask, gateway, netIface) {
        return this.getRouteIndex(ip, netmask, gateway, netIface) != undefined;
    };
    this.addRoute = function(ip, netmask, gateway, netIface, metrics) {
        if (getCanonicalIp(ip, netmask) != ip) {
            logf(this, "ip %s isn't canonical", ipIntToString(ip));
            return;
        }
        if (this.routeExists(ip, netmask, gateway, netIface)) {
            logf(this, "route {%s/%d %s %s} already exists", ipIntToString(ip), netmaskFullToShort(netmask), ipIntToString(gateway), netIface.getObjectName());
        } else {
            if (metrics == undefined) metrics = 1;
            this.table.push({
                ip: ip,
                netmask: netmask,
                gateway: gateway,
                netIface: netIface,
                metrics: metrics
            });
        }
    };
    this.removeRoute = function(ip, netmask, gateway, netIface) {
        var i = this.getRouteIndex(ip, netmask, gateway, netIface);
        if (i == undefined) {
            logf(this, "route {%s/%d %s %s} doesn't exist", ipIntToString(ip), netmaskFullToShort(netmask), ipIntToString(gateway), netIface.getObjectName());
            return;
        }
        this.table.splice(i, 1);
    };
    this.getPath = function(dstIp) {
        var basicMatch = [];
        var longestMask = 0;
        this.table.forEach(function(record) {
            if (isInSubnet(record.ip, record.netmask, dstIp)) {
                basicMatch.push(record);
                if (record.netmask > longestMask) longestMask = record.netmask;
            }
        });
        var longestMatch = [];
        basicMatch.forEach(function(record) {
            if (record.netmask == longestMask) longestMatch.push(record);
        });
        var paths = [];
        longestMatch.forEach(function(record) {
            var metrics = Math.random() / (record.metrics + 1e-4);
            paths.push({
                record: record,
                metrics: metrics
            });
        });
        var path;
        paths.forEach(function(p) {
            if (!path || path.metrics < p.metrics) path = p;
        });
        if (path != undefined) return path.record;
    };
};

var ARPTable = function(owner) {
    ElementaryActionObject.call(this);
    this.objectTypeName = "arpTable";
    this.maxRecordCount = 128;
    this.maxRecordLifeTime = 256;
    this.owner = owner;
    this.table = new Queue(this.owner, this.objectTypeName, this.maxRecordCount);
    this.getObjectName = function() {
        return sprintf("%s.%s", this.owner.getObjectName(), this.objectTypeName);
    };
    this.update = function(ip, mac, netIface) {
        for (var i = 0; i < this.table.count; i++) {
            var item = this.table.getItem(i);
            if (item.ip == ip && item.mac == mac && item.netIface == netIface) {
                item.initTick = Executor.currentTick;
                return;
            }
        }
        if (this.table.isFull()) {
            this.releaseTimedOutRecords();
            if (this.table.isFull()) {
                this.releaseOldestRecord();
            }
        }
        this.table.push(this.createObj(ip, mac, netIface));
    };
    this.createObj = function(ip, mac, netIface) {
        return {
            ip: ip,
            mac: mac,
            netIface: netIface,
            initTick: Executor.currentTick
        };
    };
    this.releaseTimedOutRecords = function() {
        var comparer = function(obj) {
            return Executor.currentTick <= obj.initTick + this.maxRecordLifeTime;
        };
        this.table.compact(this, this.comparer);
    };
    this.releaseOldestRecord = function() {
        if (this.table.isEmpty()) return;
        var i_oldest = 0;
        var oldest = this.table.getItem(i_oldest);
        for (var i = 0; i < this.table.count; i++) {
            if (this.table.getItem(i).initTick < oldest.initTick) {
                i_oldest = i;
                oldest = this.table.getItem(i);
            }
        }
        this.table.removeFrom(i_oldest);
    };
    this.determineMac = function(ip, netIface) {
        for (var i = 0; i < this.table.count; i++) {
            var item = this.table.getItem(i);
            if (item.ip == ip && item.netIface == netIface) {
                return item.mac;
            }
        }
    };
    this.toString = function() {
        return this.table.toString();
    };
    this.doElementaryAction = function() {
        return this.releaseTimedOutRecords();
    };
};

var Host = function(name) {
    Router.call(this, name);
    this.objectTypeName = "host";
    this.protocolHandlers.UDP = new UDPHandler(this);
};

inherit(Host, Router);