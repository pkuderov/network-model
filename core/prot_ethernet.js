/*
    level 2 protocol interface. Ethernet
*/

var Ethernet = new function() {
    this.protName = "Ethernet";
    this.protocols = new Array();
    this.protocols[0x0800] = "IPv4";
    this.protocols[0x0806] = "ARP";
    
    this.broadcastMac = "ff:ff:ff:ff:ff:ff";
    this.maxTransmissionUnit = 1518;   
    
    // sizes in bytes
    this.headerSize = 18; // for Ethernet II (with CRC) without VLAN tagging
}

var EthernetHandler = function(owner) {
    //this.prototype = new ElementaryActionObject();
    ElementaryActionObject.call(this);

    //owner: host
    this.owner = owner;
    
    this.toSendQueueSize = 5;
    this.toSend = new Queue(this.owner, Ethernet.protName, this.toSendQueueSize);      
    
    //methods
    this.getObjectName = function() {
        return sprintf("%s.%s", this.owner.getObjectName(), Ethernet.protName);
    }
    this.receive = function(fromNetIface, frame) {        
        if (fromNetIface.promiscousMode || frame.dstMac == Ethernet.broadcastMac || fromNetIface.mac == frame.dstMac) {
            var upperProtocol = this.owner.protocolHandlers[Ethernet.protocols[frame.etherType]];
            if (upperProtocol) {
                upperProtocol.receive(fromNetIface, frame.data, frame.dstMac == Ethernet.broadcastMac);
            }
            else {
                logf(this, "the device doesn't support appropriate protocol => frame dropped: %s received through %s", frame.toString(), fromNetIface.getObjectName());
            }
        }
        else {
            logf(this, "dropped frame %s received through %s", frame.toString(), fromNetIface.getObjectName());
        }
    }
    this.send = function(toNetIface, dstMac, etherType, data) {
        this.toSend.push({
            toNetIface: toNetIface,
            dstMac: dstMac,
            etherType: etherType,
            data: data
        });
        
    }
    this.doSendAction = function() {
        if (this.toSend.isEmpty())
            return false;
            
        var args = this.toSend.pop();
        var toNetIface = args.toNetIface;
        var dstMac = args.dstMac;
        var etherType = args.etherType;
        var data = args.data;
        
        var frame = new EthernetFrame(toNetIface.mac, dstMac, etherType, data);
        if (frame.getSize() <= Ethernet.maxTransmissionUnit) {
            //data satisfies size limitations            
            logf(this, "sent frame %s through %s", frame.toString(), toNetIface.getObjectName());
            
            toNetIface.send(frame);
        }
        else
            logf(this, "dropped frame due to MTU limits exceeding: %s", frame.toString());
        return true;
    }
    this.doElementaryAction = function() {
        return this.doSendAction();
    }
}

EthernetFrame = function(srcMac, dstMac, etherType, data) {
    this.srcMac = srcMac;
    this.dstMac = dstMac;
    this.etherType = etherType;
    this.data = data;
    
    //methods
    this.toString = function() {
        return sprintf("[%s: from=%s, to=%s, etherType=%s, data=%s]", Ethernet.protName, this.srcMac, this.dstMac, this.etherType, this.data.toString());
    }
    this.getSize = function() {
        var size = 0;
        if (typeof(this.data) == "object") {
            size = this.data.getSize();
        } else {
            assert(typeof(this.data) == "string", "EthernetFrame: unknown type of data")
            size = this.data.length;
        }
        return size + Ethernet.headerSize;
    }
} 
