/*
    level 4 protocol interface. UDP
*/

var UDP = new function() {
    this.protName = "UDP";
    this.lowerProtocol = "IPv4";
    this.maxTransmissionUnit = 65515;
    this.headerSize = 8;
    this.protocolNumberForIPv4 = 0x10;
}

var UDPHandler = function(owner) {
    //this.prototype = new ElementaryActionObject();
    ElementaryActionObject.call(this);
    
    this.owner = owner;
    this.toSendQueueSize = 128;
    this.toSend = new Queue(this, UDP.protName, this.toSendQueueSize);   
    
    //methods
    this.getObjectName = function() {
        return sprintf("%s.%s", this.owner.getObjectName(), UDP.protName);
    }
    this.receive = function(srcIp, dstIp, datagram) {        
        logf(this, "received datagram from %s to %s: %s", ipIntToString(srcIp), ipIntToString(dstIp), datagram.toString());
    }

    this.send = function(srcIp, srcPort, dstIp, dstPort, data) {
        this.toSend.push({
            srcIp: srcIp,
            srcPort: srcPort,
            dstIp: dstIp,
            dstPort: dstPort,
            data: data
        });
    }
    this.doSendAction = function() {	
        if (this.toSend.isEmpty())
            return false;

        var args = this.toSend.pop();
            
        var datagram = new UDPDatagram(args.srcPort, args.dstPort, args.data);
        if (datagram.getSize() <= UDP.maxTransmissionUnit) {
            //data satisfies payload size limitations            
            logf(this, "sent datagram from %s to %s: %s", ipIntToString(args.srcIp), ipIntToString(args.dstIp), datagram.toString());
            this.owner.protocolHandlers[UDP.lowerProtocol].send(args.srcIp, args.dstIp, UDP.protocolNumberForIPv4, datagram);
        }
        else {
            logf(this, "dropped datagram due to MTU limits exceeding: %s", datagram.toString());
        }
        return true;
    }
    this.doElementaryAction = function() {
        return this.doSendAction();
    }
} 

var UDPDatagram = function(srcPort, dstPort, data) {
	this.srcPort = srcPort;
	this.dstPort = dstPort;
	this.data = data;
    
    //methods
    this.toString = function() {
        return sprintf('[%s: srcPort=%s, dstPort=%s, data="%s"]', UDP.protName,
            this.srcPort, this.dstPort, this.data.toString()
        );
    }
    this.getSize = function() {
        var size = 0;
        if (typeof(this.data) == "object") {
            size = this.data.getSize();
        } else {
            assertf(typeof(this.data) == "string", "UDPDatagram: unknown type of data")
            size = this.data.length;
        }
        return size + UDP.headerSize;
    }
}
