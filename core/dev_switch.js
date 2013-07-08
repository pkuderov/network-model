/*
    Device: Switch
*/

var Switch = function(name) {
    this.objectTypeName = 'switch';
    
    this.deviceName = name;

    this.ports = [];
    this.macTable = new MacTable(this);
    
    //methods
    this.getObjectName = function() {
        return sprintf("%s%s", this.objectTypeName, this.deviceName);
    }
    this.getPort = function(i) {
        assert(i >= 0 && i < this.ports.length, slogf(this, "port's index is out of bound"));
        return this.ports[i];
    }
    this.addPort = function() {
        var port = new PhysicalPort(this, this.ports.length, this);
        this.ports.push(port);
        return port;
    }
    this.removePort = function(i) {
        assert(i >= 0 && i < this.netIfaces.length, slogf(this, "interface's index is out of bound"));
        this.ports.splice(i, 1);
        for (var j = i; j < this.ports.length; j++) {
            this.ports[j].setIndex(j);
        }
    }
    this.receive = function(indexPortFrom, frame) {
        this.macTable.update(this.ports[indexPortFrom], frame.srcMac);
        
        var toSendPorts = [];
        if (frame.dstMac != Ethernet.broadcastMac) {
            //toSendPorts = this.macTable.getPortsToSend(frame.dstMac);
            toSendPorts = this.macTable.getPortsToSendExcept(frame.dstMac, this.ports[indexPortFrom]);
        }
        if (toSendPorts.length == 0)
            toSendPorts = this.getAllPortsExcept(indexPortFrom);
            
        for(var i = 0; i < toSendPorts.length; i++) {
            toSendPorts[i].send(frame);
        }
    }
    this.getAllPortsExcept = function(portIndex) {
        var res = [];
        for (var i = 0; i < this.ports.length; i++) {
            if (portIndex != i)
                res.push(this.ports[i]);
        }
        return res;
    }
    this.addActiveElementaryObjects = function(activeObjects) {
        this.macTable.addActiveElementaryObjects(activeObjects);
        for (var i = 0; i < this.ports.length; i++) {
            this.ports[i].addActiveElementaryObjects(activeObjects);
        }
    }
}    

var MacTable = function(owner) {
    //this.prototype = new ElementaryActionObject();
    ElementaryActionObject.call(this);
    
    this.maxRecordLifetime = 300;
    this.maxRecordCount = 10;

    //owner: switch    
    this.owner = owner;
    this.table = new Queue(this.owner, 'macTable', this.maxRecordCount);
    
    //methods
    this.update = function(port, mac) {
        for(var i = 0; i < this.table.count; i++) {
            var item = this.table.getItem(i);
            if (item.port == port && item.mac == mac) {
                item.initTick = Executor.currentTick;
                return;
            }
        }
        
        //{port, mac} not found
        if (this.table.isFull()) {
            this.releaseTimedOutRecords();
            if (this.table.isFull()) {
                this.releaseOldestRecord();
            }
        }
        this.table.push(this.createObj(port, mac));
    }
    this.createObj = function(port, mac) {
        return {
            port: port, 
            mac: mac, 
            initTick: Executor.currentTick
        };
    }
    this.releaseTimedOutRecords = function() {
        var comparer = function(obj) {
            return Executor.currentTick <= (obj.initTick + this.maxRecordLifetime);
        };
        return this.table.compact(this, comparer);
    }
    this.releaseOldestRecord = function() {
        if (this.table.isEmpty())
            return;
            
        var i_oldest = 0;
        var oldest = this.table.getItem(i_oldest);
        
        for (var i = 0; i < this.table.count; i++) {
            if (this.table.getItem(i).initTick < oldest.initTick) {
                i_oldest = i;
                oldest = this.table.getItem(i);
            }
        }
        
        this.table.removeFrom(i_oldest);
    }
    this.getPortsToSend = function(mac) {
        var res = [];
        for(var i = 0; i < this.table.count; i++) {
            var item = this.table.getItem(i);
            if (item.mac == mac) {
                res.push(item.port);
            }
        }
            
        return res;
    }
    this.getPortsToSendExcept = function(mac, exceptedPort) {
        var arr = this.getPortsToSend(mac);
        var indexOfExcepted = arr.indexOf(exceptedPort);
        if (indexOfExcepted < 0)
            return arr;
        arr.splice(indexOfExcepted, 1);
        return arr;
    }
    this.doElementaryAction = function() {
        return this.releaseTimedOutRecords();
    }
}
