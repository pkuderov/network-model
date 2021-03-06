/*
    net interface
*/

var NetIface = function(owner, lowerObject, mac) {
    this.objectTypeName = 'netiface';
    
    this.owner = owner;
    this.mac = mac;
    this.lowerObject = lowerObject;
    this.upperProtocol = 'Ethernet';
    this.promiscousMode = false;
    this.addresses = [];
    
    //methods
    this.getObjectName = function() {
        return sprintf("%s.%s%s", this.owner.getObjectName(), this.objectTypeName, this.mac);
    }
    this.setLowerObject = function(lowerObject) {
        this.lowerObject = lowerObject;
    }
    this.receive = function(lowerObject, frame) {
        // WARNING! lowerObject might be NetIface as [Object] or portNumber as [Number]
        logf(this, "received frame: %s", frame.toString());
        this.owner.protocolHandlers[this.upperProtocol].receive(this, frame);
        
    }
    this.send = function(frame) {
        if (this.lowerObject) 
            this.lowerObject.send(frame);
    }
    this.hasIp = function(ip) {
        for (pair in this.addresses) {
            if (ip == this.addresses[pair].ip) {
                return true;
            }
        }    
        return false;
    }
    this.addIp = function(ip, netmask) {
        if (ip == getBroadcastIp(ip, netmask) || ip == getCanonicalIp(ip, netmask) || isZeroNetwork(ip, netmask)) {
            //ip is incorrect
            logf(this, "ip address %s is canonical or broadcast or has network prefix = 0 for particular netmask %s", ipIntToString(ip), ipIntToString(netmask));
            return;
        }
        else if (this.hasIp(ip)) {
            //ip already exists
            logf(this, "pair {ip, netmask} = {%s, %s} already exists for selected interface", ipIntToString(ip), ipIntToString(netmask));
            return;
        }    
        this.addresses.push({ip: ip, netmask: netmask});
        
        var canonicalIp = getCanonicalIp(ip, netmask);
        if (!this.owner.routingTable.routeExists(canonicalIp, netmask, this.owner.routingTable.zeroGateway, this)) {
            this.owner.routingTable.addRoute(
			    canonicalIp, netmask, this.owner.routingTable.zeroGateway, this
		    );
        }
    }
    this.removeIp = function(ip) {
	    //get index to delete
	    var i;
	    var network;
        for(i = 0; i < this.addresses.length; i++) {
            if (ip == this.addresses[i].ip) { 
			    network = getCanonicalIp(ip, this.addresses[i].netmask);
			    break; 
		    }
        }
        if (i == this.addresses.length) {
		    logf(this, "ip %s doesn't exist", this.objectTypeName, ipIntToString(ip));
		    return;
	    }
	
	    //get networksCount	
        var networksCount = 0;
	    this.addresses.forEach(function(pair) {
		    if (network == getCanonicalIp(pair.ip, pair.netmask))
			    networksCount ++;
	    });
	
	    if (networksCount == 1) {
		    //delete default route for the network
		    var canonicalIp = network;
		    var netmask = this.addresses[i].netmask;
		    if (this.owner.routingTable.routeExists(canonicalIp, netmask, this.owner.routingTable.zeroGateway, this)) {
            	this.owner.routingTable.removeRoute(canonicalIp, netmask, this.owner.routingTable.zeroGateway, this);
        	}
	    }
	
	    //delete ip record from addresses
	    this.addresses.splice(i, 1);
    }
    this.removeAllIp = function() {
        var netIface = this;
        this.addresses.forEach(function(pair) {
            netIface.removeIp(pair.ip);
        });
    }        
}

var LoopbackNetIface = function(owner) {
    //this.prototype = new NetIface();
    NetIface.call(this, owner);
    
    this.promiscousMode = true;
    this.addIp(IPv4.reservedAddresses.loopback.ip, IPv4.reservedAddresses.loopback.netmask);
    
    this.send = function(frame) {
        this.receive(this, frame);
    }
}
inherit(LoopbackNetIface, NetIface);
