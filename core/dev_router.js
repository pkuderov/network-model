var Router = function(name) {
    this.objectTypeName = 'router';
    this.deviceName = name;

    //init protocol handlers
    this.protocolHandlers = {};
    this.protocolHandlers.Ethernet = new EthernetHandler(this);
    this.protocolHandlers.ARP = new ARPHandler(this);
    this.protocolHandlers.IPv4 = new IPv4Handler(this);
        
    this.ports = [];
    this.netIfaces = [];
      
    //Warning! routingTable must be initialized before loopback netIface
    this.arpTable = new ARPTable(this);
    this.routingTable = new RoutingTable(this);
    
    //methods
    this.getObjectName = function() {
        return sprintf("%s%s", this.objectTypeName, this.deviceName);
    }
    this.getPort = function(i) {
        assert(i >= 0 && i < this.ports.length, slogf(this, "port's index is out of bound"));
        return this.ports[i];
    }
    this.addPort = function(mac) {
        var netIface = this.addNetIface(undefined, mac);
        var port = new PhysicalPort(this, this.ports.length, netIface);
        this.ports.push(port);
        netIface.setLowerObject(port);
        return port;
    }
    this.removePort = function(i) {
        assert(i >= 0 && i < this.ports.length, slogf(this, "port's index is out of bound"));
//        var netIfaceIndex = this.netIfaces.indexOf(this.ports[i].upperObject);
//        if (netIfaceIndex >= 0 && netIfaceIndex < this.netIfaces.length)
//            this.removeNetIface(netIfaceIndex);
        if (this.ports[i].upperObject)
            this.removeNetIface(i + 1);
            
        this.ports.splice(i, 1);
        for (var j = i; j < this.ports.length; j++) {
            this.ports[j].setIndex(j);
        }
    }
    this.addNetIface = function(lowerObject, mac) {
        var netIface = new NetIface(this, lowerObject, mac);
        this.netIfaces.push(netIface);
        return netIface;
    }
    this.removeNetIface = function(i) {
        assert(i >= 0 && i < this.netIfaces.length, slogf(this, "interface's index is out of bound")); 
        this.netIfaces[i].removeAllIp();
        this.netIfaces.splice(i, 1);
    }
    this.addActiveElementaryObjects = function(activeObjects) {
        for (var i = 0; i < this.ports.length; i++) {
            this.ports[i].addActiveElementaryObjects(activeObjects);
        }
        for (var protHandler in this.protocolHandlers) {
            this.protocolHandlers[protHandler].addActiveElementaryObjects(activeObjects);
        }
    }
    
    //initialization
    this.loopbackNetIface = new LoopbackNetIface(this);
    this.netIfaces.push(this.loopbackNetIface);
}


var RoutingTable = function(owner) {
    this.objectTypeName = 'routingTable';
    this.maxRecordCount = 128;
    this.zeroGateway = 0;

    //owner: host
    this.owner = owner;
    this.table = [];

    //methods
    this.getObjectName = function() {
        return sprintf("%s.%s", this.owner.getObjectName(), this.objectTypeName);
    }
    this.getRouteIndex = function(ip, netmask, gateway, netIface) {
        for(var i = 0; i < this.table.length; i++) {
            var record = this.table[i];
            if (ip == record.ip && netmask == record.netmask && gateway == record.gateway && netIface == record.netIface) {
                return i;
            }
        }
    }
    this.routeExists = function(ip, netmask, gateway, netIface) {
        return this.getRouteIndex(ip, netmask, gateway, netIface) != undefined;
    }
    this.addRoute = function(ip, netmask, gateway, netIface, metrics) {
        //check
        if (getCanonicalIp(ip, netmask) != ip) {
            logf(this, "ip %s isn't canonical", ipIntToString(ip));
            return;
        }
        
        if (this.routeExists(ip, netmask, gateway, netIface)) {
            logf(this, "route {%s/%d %s %s} already exists", ipIntToString(ip), netmaskFullToShort(netmask), ipIntToString(gateway), netIface.getObjectName());
        } 
        else {
            if (metrics == undefined)
                metrics = 1;
                
            this.table.push({
                ip: ip,
                netmask: netmask,
                gateway: gateway,
                netIface: netIface,
                metrics: metrics
            });
        }
    }
    this.removeRoute = function(ip, netmask, gateway, netIface) {
        var i = this.getRouteIndex(ip, netmask, gateway, netIface);
        if (i == undefined) {
            logf(this, "route {%s/%d %s %s} doesn't exist", ipIntToString(ip), netmaskFullToShort(netmask), ipIntToString(gateway), netIface.getObjectName());
            return;
        }
        table.splice(i, 1);
    }
    this.getPath = function(dstIp) {
        //return gatewayIp/localIp + netIface
        var basicMatch = [];
        var longestMask = 0;
        this.table.forEach(function(record){
            if (isInSubnet(record.ip, record.netmask, dstIp)) {
                basicMatch.push(record);
                if (record.netmask > longestMask)
                    longestMask = record.netmask;
            }
        });
        
        var longestMatch = [];
        basicMatch.forEach(function(record) {
            if (record.netmask == longestMask)
                longestMatch.push(record);
        });
        
        var paths = [];
        longestMatch.forEach(function(record) {
            var metrics = Math.random() / (record.metrics + 0.0001);
            paths.push({
                record: record,
                metrics: metrics
            });
        });
        
        var path;
        paths.forEach(function(p) {
            if (!path || path.metrics < p.metrics)
                path = p;
        });
        
        if (path != undefined)
            return path.record;
    }
}
    

var ARPTable = function(owner) {
    //this.prototype = new ElementaryActionObject();
    ElementaryActionObject.call(this);
    
    this.objectTypeName = 'arpTable';
    this.maxRecordCount = 128;
    this.maxRecordLifeTime = 256;

    //owner: host
    this.owner = owner;
    this.table = new Queue(this.owner, this.objectTypeName, this.maxRecordCount);

    //methods
    this.getObjectName = function() {
        return sprintf("%s.%s", this.owner.getObjectName(), this.objectTypeName);
    }
    this.update = function(ip, mac, netIface) {
        for(var i = 0; i < this.table.count; i++) {
            var item = this.table.getItem(i);
            if (item.ip == ip && item.mac == mac && item.netIface == netIface) {
                item.initTick = Executor.currentTick;
                return;
            }
        }
        
        //{ip, mac, netIface} not found
        if (this.table.isFull()) {
            this.releaseTimedOutRecords();
            if (this.table.isFull()) {
                this.releaseOldestRecord();
            }
        }
        this.table.push(this.createObj(ip, mac, netIface));
    }
    this.createObj = function(ip, mac, netIface) {
        return {
            ip: ip, 
            mac: mac,
            netIface: netIface,
            initTick: Executor.currentTick
        };
    }
    this.releaseTimedOutRecords = function() {
        var comparer = function(obj) {
            return Executor.currentTick <= obj.initTick + this.maxRecordLifeTime;
        }
        this.table.compact(this, this.comparer);
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
    this.determineMac = function(ip, netIface) {
        for(var i = 0; i < this.table.count; i++) {
            var item = this.table.getItem(i);
            if (item.ip == ip && item.netIface == netIface) {
                return item.mac;
            }
        }
    }
    
    this.toString = function() {
        return this.table.toString();
    }
    
    this.doElementaryAction = function() {
        return this.releaseTimedOutRecords();
    }
}
