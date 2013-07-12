var Environment = new function() {
    this.objects = {
        'tm': [],
        'switch': [],
        'router': [],
        'host': [],
    };
     
    this.isChanged = false;  
    this.activeObjects = [];

    this.nextUniqueMac = 1;
    this.nextUniqueSwitch = 1;
    
    //methods
    this.getActiveElementaryObjects = function() {
        if (!this.isChanged)
            return this.activeObjects;
            
        this.activeObjects = [];
        for(var objectType in this.objects) {
            var arr = this.objects[objectType];
            for(var j = 0; j < arr.length; j++) {
                arr[j].addActiveElementaryObjects(this.activeObjects);
            }
        }
        this.isChanged = false;
        return this.activeObjects;
    }
    this.addObject = function(obj) {
        this.objects[obj.objectTypeName].push(obj);
        this.isChanged = true;
        return obj;
    }
    this.removeObject = function(obj) {
        if (obj.objectTypeName == 'tm') {
            this.removeTransMedium(obj, true);
        }
        else {
            this.removeHostOrSwitch(obj);
        }
    }
    this.removeHostOrSwitch = function(obj) {
        obj.ports.forEach(function(port) {
            if (port.toSendTMDirection) {
                //connected
                this.removeTransMedium(port.toSendTMDirection.owner);
            }
        });
        this.removeObjectFromEnvironment(obj);
    }
    this.removeTransMedium = function(tm, withPortsRemoval) {        
        var port1 = tm.directions.toPort1.toPort;
        var port2 = tm.directions.toPort1.fromPort;
        port1.owner.removePort(port1.index);
        port2.owner.removePort(port2.index);
        tm.disconnectPorts();
        
        this.removeObjectFromEnvironment(tm);
    }
    this.removeObjectFromEnvironment = function(obj) {
        var arr = this.objects[obj.objectTypeName]; 
        for(var i = 0; i < arr.length; i++) {
            if (arr[i] == obj) {
                arr.splice(i, 1);
                this.isChanged = true;
                
                break;
            }
        }
    }
    this.connectPorts = function(portX, portY, transMedium) {            
        //change old ways
        transMedium.connectPorts(portX, portY);
    }
    this.getNextUniqueMac = function() {
        return macIntToString(this.nextUniqueMac++);
    }
    this.getNextUniqueSwitchNumber = function() {
        return this.nextUniqueSwitch++;
    }
    this.createSubnet = function(firstIpStr, netmaskShort, hostsCount, router) {
        //star - 'hostsCount' hosts linked through switch with name 'subnetIndex' to each other and router
        //default gateway to outer subnets for each host is router
        
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

        var sw = new Switch(Environment.objects['switch'].length.toString());
        for (var i = 0; i < hostsCount + 1; i++) {
            sw.addPort();
        }
        this.addObject(sw);

        for (var i = 0; i < hostsCount; i++) {
            this.connectPorts(hosts[i].getPort(hosts[i].ports.length - 1), sw.getPort(i), tms[i]);
        }
        this.connectPorts(router.getPort(router.ports.length - 1), sw.getPort(hostsCount), tms[hostsCount]);
    }
    this.sendTo = function(objectType, hostIndexFrom, srcIp, srcPort, dstIp, dstPort, message) {
        Environment.objects[objectType][hostIndexFrom].protocolHandlers.UDP.send(ipStringToInt(srcIp), srcPort, ipStringToInt(dstIp), dstPort, message);
    }
}
