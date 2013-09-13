/*
    level 3 protocol interface. IPv4
*/

var IPv4 = new function() {
    this.reservedAddresses = {
        loopback: { ip: ipStringToInt("127.0.0.1"), netmask: netmaskShortToFull(8)},
        thisNetwork: { ip: ipStringToInt("0.0.0.0"), netmask: netmaskShortToFull(8)},
        broadcast: { ip: ipStringToInt("255.255.255.255"), netmask: netmaskShortToFull(32)},
        multicast: { ip: ipStringToInt("224.0.0.0"), netmask: netmaskShortToFull(4)}
    };
    
    this.protName = "IPv4";
    this.protocols = [];
    
    this.protocols[0x10] = "UDP";
    
    this.lowerProtocol = "Ethernet";
    this.protocolNumberForEthernet = 0x0800;
    this.maxTransmissionUnit = 1500;
    this.headerSize = 20;
    this.maxDatagramTotalSize = 65535;
    this.maxFragmentOffset = 65528;
    this.maxFragmentLength = 65535;
    
    this.timeoutToSendPacket = 256;
    this.timeoutToAssembleDatagram = 512;

    //methods
    this.isThisNetworkIp = function(ip) {
        return isInSubnet(IPv4.reservedAddresses.thisNetwork.ip, IPv4.reservedAddresses.thisNetwork.netmask, ip);
    }
    this.isLimitedBroadcastIp = function(ip) {
        return isInSubnet(IPv4.reservedAddresses.broadcast.ip, IPv4.reservedAddresses.broadcast.netmask, ip);
    }
    this.isLoopbackIp = function(ip) {
        return isInSubnet(IPv4.reservedAddresses.loopback.ip, IPv4.reservedAddresses.loopback.netmask, ip);
    }
    this.isMulticastIp = function(ip) {
        return isInSubnet(IPv4.reservedAddresses.multicast.ip, IPv4.reservedAddresses.multicast.netmask, ip);
    }
    this.isCanonicalIpForNetIface = function(netIface, ip) {
        var res = false;
        netIface.addresses.forEach(function(address) {
            if (getCanonicalIp(address.ip, address.netmask) == ip)
                res = true;
        });
        return res;
    }
    this.isZeroNetworkForNetIface = function(netIface, ip) {      
        var res = false;      
        netIface.addresses.forEach(function(address) {
            if (isZeroNetwork(ip, address.netmask))
                res = true;
        });
        return res;
    }
    // Determine if ip is broadcast for any subnet in interface (handle also main broadcast)
    this.isBroadcastIpForNetIface = function(netIface, ip) {
        var res = false;
        netIface.addresses.forEach(function(address) {
            if (getBroadcastIp(address.ip, address.netmask) == ip)
                res = true;
        });
        return res;
    }
    this.getMinNetworkWhereIpNotBroadcast = function(netIface, ipMustNotBroadcast) {
        var minNetwork = {
            ip: 0,
            netmask: 0
        };
        netIface.addresses.forEach(function(network){
            if (isInSubnet(network.ip, network.netmask, ipMustNotBroadcast)
                && (ipMustNotBroadcast != getBroadcastIp(network.ip, network.netmask))
                && (network.netmask > minNetwork.netmask)
            ) {
                minNetwork = network;
            }
        });
        if (minNetwork.ip != 0)
            return minNetwork;
    }
}

var IPv4Handler = function(owner) {
    //this.prototype = new ElementaryActionObject();
    ElementaryActionObject.call(this);
    
    this.owner = owner;
    
    this.toSendQueueSize = 128;
    this.toSend = new Queue(this, IPv4.protNamek, this.toSendQueueSize);

    this.receivedFragmentedPackets = [];
    this.innerUIDForFragmentedPackets = 0;
    
    //methods
    this.getObjectName = function() {
        return sprintf("%s.%s", this.owner.getObjectName(), IPv4.protName);
    }
    this.getInnerUIDForFragmentedPackets = function() {
        return this.innerUIDForFragmentedPackets++;
    }
    this.receive = function(fromNetIface, packet, isBroadcastEthernetFrame) {        
        if (packet.fragmentOffset > IPv4.maxFragmentOffset) {
            logf(this, "received packet with too big offset field => packet dropped: %s", packet.toString());
        }
        else if (packet.fragmentLength > IPv4.maxFragmentLength) {
            logf(this, "received packet with too big length field => packet dropped: %s", packet.toString());
        }
        else if (!this.checkSrcIpIsValid(packet.srcIp)) {
            logf(this, "invalid srcIp => packet dropped: %s", packet.toString());
        }
        else if (IPv4.isMulticastIp(packet.dstIp)) {
            logf(this, "received multicast packet. Not implemented now due to IGMP => packet dropped: %s", packet.toString());
        }
        else if (IPv4.isCanonicalIpForNetIface(fromNetIface, packet.dstIp)) {
            logf(this, "received packet with dstIp like {<netIface.network>.0} => packet dropped: %s", packet.toString());
        }
        else if (IPv4.isLoopbackIp(packet.srcIp) && fromNetIface != this.owner.loopbackNetIface) {
            logf(this, "packet may be malicious since it has been received from loopback network but from non-loopback netIface => packet dropped: %s", packet.toString());
        }
        else if (IPv4.isLoopbackIp(packet.dstIp) && fromNetIface != this.owner.loopbackNetIface) {
            logf(this, "packet may be malicious since it is directed to 'localhost' but received from non-loopback netIface => packet dropped: %s", packet.toString());
        }
        else if (IPv4.isLimitedBroadcastIp(packet.dstIp)) {
            //limited broadcast => handle packet
            this.handleReceivedPacket(packet);
        }
        else if (IPv4.isBroadcastIpForNetIface(fromNetIface, packet.dstIp)) {
            //network directed broadcast for netiface which received this packet => handle packet
            if (!isBroadcastEthernetFrame) {
                //unicast channel address => [channel] broadcast is need to be done by the current device (will be done in send action)
                this.forward(fromNetIface, packet, isBroadcastEthernetFrame);
            }

            //anyway, handle packet
            this.handleReceivedPacket(packet);
        }
        else if (this.hasIp(packet.dstIp)) {
            //unicast for particular device's netIface => handle packet
            this.handleReceivedPacket(packet);
        }
        else {
            //forward packet
            this.forward(fromNetIface, packet, isBroadcastEthernetFrame);
            
            //check is packet a network directed broadcast for some of the netIfaces except the one which received this packet [WHICH ALREADY HANDLED, see 'if' blocks above]
            var needToHandleReceivedPacket = false;
            this.owner.netIfaces.forEach(function(netIface) {
                if (netIface != fromNetIface && IPv4.isBroadcastIpForNetIface(netIface, packet.dstIp)) {
                    needToHandleReceivedPacket = true;
                    //no need to explicit call 'forward' - the same logic is needed to be in send action so let's don't duplicate it
                }
            });
            
            if (needToHandleReceivedPacket)
                this.handleReceivedPacket(packet);
            
        }
    }
    this.forward = function(fromNetIface, packet, isBroadcastEthernetFrame) {
        if (isBroadcastEthernetFrame) {
            logf(this, "packet received as broadcast from channel level => packet isn't forwarded, i.e. packet dropped: %s", packet.toString());
        }
        else if (IPv4.isZeroNetworkForNetIface(fromNetIface, packet.srcIp)) {
            logf(this, "packet has network prefix = 0 for netIface received it => packet isn't forwarded, i.e. packet dropped: %s", packet.toString());
        }
        else {
            //send
            if (packet.getSize() <= IPv4.maxTransmissionUnit)
                this.toSend.push({
                    packet: packet
                });
            else {
                this.fragmentizePacket(packet).forEach(function(fragment) {
                    this.toSend.push({
                        packet: fragment
                    });
                }, this);
            }
        }
    }
    this.send = function(srcIp, dstIp, fromProtocolNumber, data) {          
        if (data.getSize() > IPv4.maxFragmentLength - IPv4.headerSize) {
            logf(this, "datagram exceeds maximum allowed for ipv4 length => datagram dropped: %s", data.toString());
        }
        else if (!this.checkSrcIpIsValid(srcIp)) {
            logf(this, "invalid srcIp %s => datagram isn't sent: %s", ipIntToString(srcIp), data.toString());
        } 
        else if ((IPv4.isLoopbackIp(srcIp) || IPv4.isLoopbackIp(dstIp)) && (!IPv4.isLoopbackIp(srcIp) || !IPv4.isLoopbackIp(dstIp))) {
            logf(this, "it isn't allowed to send datagrams from localhost to non-localhost and vice versa address => datagram dropped: %s", data.toString());
        }
        else if (!this.hasIp(srcIp)) {
            logf(this, "srcIp %s should be valid ip address of one of the device's netIface => datagram dropped: %s", ipIntToString(srcIp), data.toString());
        } 
        else {
            var packet = new IPv4Packet(srcIp, dstIp, fromProtocolNumber, this.getInnerUIDForFragmentedPackets(), IPv4.headerSize + data.getSize(), 0, 0, data);
            
            if (packet.getSize() <= IPv4.maxTransmissionUnit)
                this.toSend.push({
                    packet: packet
                });
            else {
                this.fragmentizePacket(packet).forEach(function(fragment) {
                    this.toSend.push({
                        packet: fragment
                    });
                }, this);
            }
        }
    }
    this.doSendAction = function() {
        while (!this.toSend.isEmpty() && this.sendingTimeExpired(this.toSend.peek())) {
            logf(this, "packet's sending timeout expired => packet dropped: %s", this.toSend.peek().packet.toString());
            this.toSend.pop();
        }
        if (this.toSend.isEmpty())
            return false;

        var args = this.toSend.pop();
        var packet = args.packet;
        var dstIp = packet.dstIp;
        var srcIp = packet.srcIp;
              
        if (IPv4.isLoopbackIp(dstIp)) {
            //loopback
            this.handleReceivedPacket(packet);
        }
        else if (this.hasIp(dstIp)) {
            //dstIp is one of device's ip
            this.handleReceivedPacket(packet);
        }
        else {            
            var path = this.owner.routingTable.getPath(dstIp);
            if (path == undefined) {
                logf(this, "path to %s hasn't been found => packet dropped: %s", ipIntToString(dstIp), packet.toString());
                return;
            }
            
            var nextHopIp;
            if (path.gateway == 0) {
                //destination have to be in current network for current netIface
                nextHopIp = dstIp;
            }
            else {
                nextHopIp = path.gateway;
            }
            
            var dstMac;
            if (IPv4.isBroadcastIpForNetIface(path.netIface, dstIp))
                dstMac = Ethernet.broadcastMac;
            else
                dstMac = this.owner.arpTable.determineMac(nextHopIp, path.netIface);
                
            if (dstMac != undefined) {            
                logf(this, "sent packet %s through %s", packet.toString(), path.netIface.getObjectName());
                this.owner.protocolHandlers[IPv4.lowerProtocol].send(path.netIface, dstMac, IPv4.protocolNumberForEthernet, packet);
            }
            else {
                //logf(this, "dstMac not found in ARPTable => packet %s is pushed into queue for further sending", packet.toString());

                var resendTime = args.resendTime;
                if (resendTime == undefined)
                    resendTime = Executor.currentTick
                    
                //repush in toSend queue                    
                this.toSend.push({
                    packet: packet, 
                    resendTime: resendTime
                });
                
                this.owner.protocolHandlers["ARP"].send(path.netIface, ARP.operations.request, srcIp, nextHopIp);
            }
        }
        
        
        //how to send broadcast?
    }
    this.handleReceivedPacket = function(packet) {
        var upperProtocol = this.owner.protocolHandlers[IPv4.protocols[packet.protocolNumber]];
        if (upperProtocol) {            
            if (packet.fragmentOffset != 0 || packet.moreFragments) {
                // datagram is need to be assembled before throw up
                if (!this.receivedFragmentedPackets[packet.fragmentUniqueKey])
                    this.receivedFragmentedPackets[packet.fragmentUniqueKey] = {fragments: [], firstFragmentReceivedTick: Executor.currentTick};
                
                this.receivedFragmentedPackets[packet.fragmentUniqueKey].fragments[packet.fragmentOffset] = packet;
                var datagram = this.tryToAssembleDatagram(packet.fragmentUniqueKey);
            }
            else
                var datagram = packet.data;

            if (datagram) {                
                if (datagram.getSize() > IPv4.maxDatagramTotalSize) {
                    logf(this, "datagram exceeds maximum allowed length => packet dropped: %s", packet.toString());
                }
                else {
                    upperProtocol.receive(packet.srcIp, packet.dstIp, datagram);
                }
            }
        }
        else {
            logf(this, "the device doesn't support appropriate protocol => packet dropped: %s", packet.toString());
        }
    }
    this.checkSrcIpIsValid = function(ip) {
        return !IPv4.isThisNetworkIp(ip) && !IPv4.isLimitedBroadcastIp(ip) && !IPv4.isMulticastIp(ip);
    }
    this.hasIp = function(ip) {
        var res = false;
        this.owner.netIfaces.forEach(function(netIface) {
            if (netIface.hasIp(ip))
                res = true;
        });
        return res;
    }
    this.tryToAssembleDatagram = function(key) {
        var offset = 0;
        var arr = this.receivedFragmentedPackets[key].fragments;
        while (arr[offset]) {
            if (!arr[offset].moreFragments) {
                return this.assembleDatagram(key);
            }
            offset += arr[offset].fragmentLength;
        }
    }
    this.assembleDatagram = function(key) {
        var arr = this.receivedFragmentedPackets[key].fragments;
        var datagram = clone(arr[0].data);
        var offset = arr[0].fragmentLength;
        
        while (arr[offset]) {
            datagram.data += arr[offset].data;
            if (!arr[offset].moreFragments)
                break;
            offset += arr[offset].fragmentLength;
        }
        delete this.receivedFragmentedPackets[key];
        return datagram;
    }
    this.fragmentizePacket = function(packet) {
        var fragments = [];
        var length = 0;
        var offset = 0;
        var data = packet.data;
        var packetId = packet.packetId;
        
        if (packet.fragmentOffset == 0) {
            //head fragment - consists of header + data
            data = data.data;
            length = Math.min(IPv4.maxTransmissionUnit - UDP.headerSize - IPv4.headerSize, data.length);
                        
            var fragment = packet.clonePacketByHeader(
                length + UDP.headerSize, 0, 1, new UDPDatagram(packet.data.srcPort, packet.data.dstPort, data.slice(0, length))
            );
            fragments.push(fragment);
            offset += length;
        }
            
        while (data.length > offset) {
            length = Math.min(IPv4.maxTransmissionUnit - IPv4.headerSize, data.length - offset);
            fragments.push(packet.clonePacketByHeader(
                length, packet.fragmentOffset + offset + UDP.headerSize, 1, data.slice(offset, offset + length)
            ))
            offset += length;
        }
        fragments[fragments.length - 1].moreFragments = packet.moreFragments;
        
        return fragments;
    }
    this.sendingTimeExpired = function(objToSend) {
        return objToSend.resendTime != undefined ? Executor.currentTick - objToSend.resendTime > IPv4.timeoutToSendPacket : false;
    }
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
    }
    this.doElementaryAction = function() {
        this.releaseTimedOutFragmentedPackets();
        return this.doSendAction();
    }
}
    

var IPv4Packet = function(srcIp, dstIp, protocolNumber, packetId, fragmentLength, fragmentOffset, moreFragments, data) {
    if (packetId == undefined) {
        window.alert('forgot to set packet id');
    }

    this.srcIp = srcIp;
    this.dstIp = dstIp;
    this.protocolNumber = protocolNumber;
    this.packetId = packetId;
    this.fragmentLength = fragmentLength;
    this.fragmentOffset = fragmentOffset;
    this.moreFragments = moreFragments;
    this.data = data;

    //methods
    this.toString = function() {
        return sprintf("[%s: srcIp=%s, dstIp=%s, protNumber=%s, packetId=%s, length=%s, offset=%s, mf=%s, data=%s]", IPv4.protName,
            ipIntToString(this.srcIp), ipIntToString(this.dstIp), this.protocolNumber,
            this.packetId, this.fragmentLength, this.fragmentOffset, this.moreFragments, this.data.toString()
        );
    }
    this.getSize = function() {
        var size = 0;
        if (typeof(this.data) == "object") {
            size = this.data.getSize();
        } else {
            assertf(typeof(this.data) == "string", "IPv4Packet: unknown type of data")
            size = this.data.length;
        }
        return size + IPv4.headerSize;
    }
    this.getFragmentUniqueKey = function() {
        return sprintf("%d_%d_%d_%d", this.packetId, this.dstIp, this.srcIp, this.protocolNumber);
    }
    this.clonePacketByHeader = function(fragmentLength, fragmentOffset, moreFragments, data) {
        return new IPv4Packet(
            this.srcIp, this.dstIp, this.protocolNumber, this.packetId,
            fragmentLength, fragmentOffset, moreFragments, data
        );
    }

    //initialization
    if (this.fragmentOffset != 0 || this.moreFragments) {
        this.fragmentUniqueKey = this.getFragmentUniqueKey();
    }
}
