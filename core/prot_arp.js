/*
    level 3 protocol interface. ARP
*/

var ARP = new function() {
    this.protName = "ARP";
    this.operations = {request: 1, reply: 2};
    this.unknownHardwareAddress = '00:00:00:00:00:00';

    //IPv4 - Ethernet!!!
    this.lowerProtocol = "Ethernet";
    this.protocolNumberForEthernet = 0x0806;

    //sizes in bytes
    this.headerSize = 28; // for Ethernet II (with CRC) without VLAN tagging
}

var ARPHandler = function(owner) { 
    //this.prototype = new ElementaryActionObject();
    ElementaryActionObject.call(this);
               
    this.toSendQueueSize = 128;
    this.cacheOfRecentlyRequestedIpQueueSize = this.toSendQueueSize;
    this.cacheOfRecentlyRequestedIpRecordTimeout = 24;

    //owner: host
    this.owner = owner;
    this.toSend = new Queue(this, ARP.protName, this.toSendQueueSize);    
    //cache of ip addresses on which arp request were sent last time
    this.cacheOfRecentlyRequestedIp = new Queue(this, ARP.protName, this.cacheOfRecentlyRequestedIpQueueSize);

    //methods
    this.getObjectName = function() {
        return sprintf("%s.%s", this.owner.getObjectName(), ARP.protName);
    }
    this.receive = function(fromNetIface, packet) {        
        // Update ARP-table
        if (this.senderIpIsValid(fromNetIface, packet.senderProtocolAddress)) {
            this.owner.arpTable.update(
                packet.senderProtocolAddress,
                packet.senderHardwareAddress,
                fromNetIface
            );
        }
        
        if (packet.operation == ARP.operations.request && fromNetIface.hasIp(packet.targetProtocolAddress)) {
            this.reply(
                fromNetIface, ARP.operations.reply, 
                packet.targetProtocolAddress, packet.senderHardwareAddress, packet.senderProtocolAddress
            );
        }
    }
    this.senderIpIsValid = function(netIface, ip) {
        return !IPv4.isThisNetworkIp(ip)
            && !IPv4.isLoopbackIp(ip)
            && !IPv4.isMulticastIp(ip)
            && !IPv4.isBroadcastIpForNetIface(netIface, ip)
            && IPv4.getMinNetworkWhereIpNotBroadcast(netIface, ip) != undefined;
    }
    
    //only for reply to ARP request
    this.reply = function(toNetIface, operation, senderProtocolAddress, targetHardwareAddress, targetProtocolAddress) {
        this.toSend.push({
	        toNetIface: toNetIface,
	        operation: operation,
	        senderProtocolAddress: senderProtocolAddress,
            targetHardwareAddress: targetHardwareAddress,   //extra argument!!!
	        targetProtocolAddress: targetProtocolAddress
        });
    }
    this.send = function(toNetIface, operation, senderProtocolAddress, targetProtocolAddress) {
        this.toSend.push({
	        toNetIface: toNetIface,
	        operation: operation,
	        senderProtocolAddress: senderProtocolAddress,
	        targetProtocolAddress: targetProtocolAddress
        });
    }

    this.doSendAction = function() {	
        if (this.toSend.isEmpty())
	        return false;

        var args = this.toSend.pop();
        var toNetIface = args.toNetIface;
        var operation = args.operation;
        var senderProtocolAddress = args.senderProtocolAddress;
        var targetProtocolAddress = args.targetProtocolAddress;

        if (operation == ARP.operations.request || args.targetHardwareAddress == undefined) {
            var networkSendFrom = IPv4.getMinNetworkWhereIpNotBroadcast(toNetIface, targetProtocolAddress)
            if (!networkSendFrom) {
                logf(this, "cannot send packet to %s through %s. Is it broadcast?", targetProtocolAddress, toNetIface.getObjectName())
                return true;
            }
        }
        
        var lowerProtocol = this.owner.protocolHandlers[ARP.lowerProtocol];
        if (operation == ARP.operations.request) {
            if (!this.isIpInCache(targetProtocolAddress)) {
                var packet = new ARPPacket(operation, toNetIface.mac, networkSendFrom.ip, ARP.unknownHardwareAddress, targetProtocolAddress);
                
                
                logf(this, "sent request %s through %s", packet.toString(), toNetIface.getObjectName());
                this.cacheOfRecentlyRequestedIp.push({ ip: targetProtocolAddress, initTick: Executor.currentTick });
                lowerProtocol.send(toNetIface, Ethernet.broadcastMac, ARP.protocolNumberForEthernet, packet);
            }
            else {
                //logf(this, "targetProtocolAddress is found in cache of recently requested ip => packet dropped");
            }
        } 
        else if (operation == ARP.operations.reply) {
            if (args.targetHardwareAddress != undefined)
                var dstMac = args.targetHardwareAddress;
            else 
                var dstMac = this.owner.arpTable.determineMac(targetProtocolAddress, toNetIface);
            
            if (dstMac != undefined) {
                var packet = new ARPPacket(operation, toNetIface.mac, senderProtocolAddress, dstMac, targetProtocolAddress);
                
                logf(this, "sent reply %s through %s", packet.toString(), toNetIface.getObjectName());
                lowerProtocol.send(toNetIface, dstMac, ARP.protocolNumberForEthernet, packet);
            }
            else {
                logf(this, "targetHardwareAddress to reply is not found => packet dropped");
            }
        }
        else {
            logf(this, "unknown packet operation => packet dropped");
        }
        
        return true;
    }
    this.isIpInCache = function(ip) {
        for (var i = 0; i < this.cacheOfRecentlyRequestedIp.count; i++) {
            if (ip == this.cacheOfRecentlyRequestedIp.getItem(i).ip)
                return true;
        }
        return false;
    }
    this.releaseTimedOutRecordsFromCacheOfRecentlyRequestedIp = function() {
        while (!this.cacheOfRecentlyRequestedIp.isEmpty() && (Executor.currentTick - this.cacheOfRecentlyRequestedIp.peek().initTick) > this.cacheOfRecentlyRequestedIpRecordTimeout) {
            this.cacheOfRecentlyRequestedIp.pop();
        }
    }
    this.doElementaryAction = function() {
        this.releaseTimedOutRecordsFromCacheOfRecentlyRequestedIp();
        return this.doSendAction();
    }
}


var ARPPacket = function(operation, senderHardwareAddress, senderProtocolAddress, targetHardwareAddress, targetProtocolAddress) {
	this.operation = operation;
	this.senderHardwareAddress = senderHardwareAddress;
	this.senderProtocolAddress = senderProtocolAddress;
	this.targetHardwareAddress = targetHardwareAddress;
	this.targetProtocolAddress = targetProtocolAddress;
	
	
    //methods
    this.toString = function() {
        return sprintf("[%s: operation=%s, sha=%s, spa=%s, tha=%s, tpa=%s]", ARP.protName,
            (this.operation == ARP.operations.request) ? 'request' : ((this.operation == ARP.operations.reply) ? 'reply' : 'unknown'),
            this.senderHardwareAddress, ipIntToString(this.senderProtocolAddress),
            this.targetHardwareAddress, ipIntToString(this.targetProtocolAddress)
        );
    }
    this.getSize = function() {
        return ARP.headerSize;
    }
}
