var SubnetInfo = new function() {
<<<<<<< HEAD
    this.hosts;
    
    //methods
    this.getObjectName = function() {
        return 'SubnetInfo';
    }
    this.showSubnetDetails = function(hosts) {
        this.hosts = hosts;
        this.netIfaces = this.checkHostsAreConnected(hosts);
        if (this.netIfaces.length == 0)
            return;
            
        this.addresses = this.getSubnets();
        this.subnetFieldset = this.appendSubnetFieldset(Visualizer.fbDetail);
        this.loadSubnetList();
    }
    this.appendSubnetFieldset = function(container) {
        var fieldset = container.append('fieldset');
        fieldset.append('legend').text('Subnet creation:');
        
        var dropdownSubnets = VisInfo.appendDropDown(fieldset, 'Select subnet');
        
        var btnRemoveSubnet = fieldset.append('input')
            .on('click', this.hRemoveSubnet)
            .attr('type', 'button')
            .attr('value', 'Remove subnet')
            .attr('disabled', 'disabled');
            
        fieldset.append('p')
            .text('Type first ip/netmask for new subnet');
            
        var inputIpNetmask = fieldset.append('input')
            .attr('type', 'text')
            .attr('placeholder', 'X.X.X.X/netmask')
            .attr('class', 'input-text')
            .style('width', 120);
        var btnAddSubnet = fieldset.append('input')
            .on('click', this.hAddSubnet)
            .attr('type', 'button')
            .attr('value', 'Add subnet');
        
        return {
            fieldset: fieldset,
            dropdownSubnets: dropdownSubnets,
            btnRemoveSubnet: btnRemoveSubnet,
            inputIpNetmask: inputIpNetmask,
            btnAddSubnet: btnAddSubnet
        };
    }
    this.loadSubnetList = function() {
        var ddSubnets = this.subnetFieldset.dropdownSubnets;
                       
        ddSubnets.item = ddSubnets.item.data(this.addresses);
        ddSubnets.item.enter().append('li')
            .on('mouseup', this.hMouseUpOnSubnetItem)
            .attr('class', 'dropdown-item')
            .text(addressObjToString);
            
        ddSubnets.item.exit().remove();
        
        this.subnetFieldset.btnRemoveSubnet.attr('disabled', 'disabled');
        
        if (this.addresses.length == 0)
            VisInfo.setDisabledColor(ddSubnets.pOutput, VisInfo.colorDisabled);
        else
            VisInfo.setDisabledColor(ddSubnets.pOutput, null);
            
        ddSubnets.pOutput.text(ddSubnets.pOutput.node().initialText);
    }
    this.getSubnets = function() {
        var netIfaces = this.netIfaces;
        var addresses = [];
        for (var i = 0; i < netIfaces[0].addresses.length; i++) {
            var address = netIfaces[0].addresses[i];
            
            addresses.push({ 
                ip : getCanonicalIp(address.ip, address.netmask), 
                netmask: address.netmask 
            });
        }
        
        for (var i = 1; i < netIfaces.length; i++) {
            var newAddresses = [];
            for (var j = 0; j < netIfaces[i].addresses.length; j++) {
                var a = netIfaces[i].addresses[j];
                var ip = getCanonicalIp(a.ip, a.netmask);
                var netmask = a.netmask;
                
                for (var k = 0; k < addresses.length; k++) {
                    if (addresses[k].netmask == netmask && addresses[k].ip == ip)
                        newAddresses.push(addresses[k]);
                }
            }
            
            addresses = newAddresses;
            if (addresses.length == 0)
                break;
        }
        
        return addresses;
    }
    this.checkHostsAreConnected = function(hosts) {
        var color = [];
        var toColor = hosts.length;
        for (var i = 0; i < Visualizer.nodesData.length; i++ ) {
            var node = Visualizer.nodesData[i];
            color[node.obj.deviceName] = { host: node.obj, c: hosts.indexOf(node.obj) >= 0 ? 1 : 0 };
        } 
        
        var stack = new Queue(this, 'bfs queue', 25, true);
        stack.push({ name: hosts[0].deviceName, fromPort: null, toPort: null, prevPort: null });
        
        var ports = [];
        
        while (!stack.isEmpty()) {
            var obj = stack.pop();
            
            if (color[obj.name].c == 1) {
                color[obj.name].c = -1;
                toColor --;
            }
                
            var c = color[obj.name].c
            var host = color[obj.name].host;
            if (c != 0) {
                if (obj.fromPort && !(ports.indexOf(obj.fromPort) >= 0)) ports.push(obj.fromPort);
                if (obj.toPort && !(ports.indexOf(obj.toPort) >= 0)) ports.push(obj.toPort);
            }
            
            for (var i = 0; i < host.ports.length; i++) {
                var toPort = host.ports[i].toSendTMDirection.toPort;
                 
                if (obj.prevPort != toPort) {
                    stack.push({
                        name: toPort.owner.deviceName,
                        fromPort: c == 0 ? obj.fromPort : host.ports[i],
                        toPort: toPort,
                        prevPort: host.ports[i]
                    });
                }
            }
        }
        
        if (toColor != 0)
            return;
        
        var netIfaces = [];
        for (var i = 0; i < ports.length; i++)
            if (ports[i].upperObject instanceof NetIface) netIfaces.push(ports[i].upperObject);
            
        return netIfaces;
    }
    this.addSubnet = function(address) {
        var ip = address.ip,
            netmask = address.netmask;
            
        for (var i = 0; i < this.netIfaces.length; i++) {
            this.netIfaces[i].addIp(ip, netmask);
            ip++;
        }
    }
    this.removeSubnet = function(address) {
        address = { ip: getCanonicalIp(address.ip, address.netmask), netmask: address.netmask };
        
        for (var i = 0; i < this.netIfaces.length; i++) {
            var netIface = this.netIfaces[i];
            
            for (var j = 0; j < netIface.addresses.length; j++) {
                var netmask = netIface.addresses[j].netmask;
                var ip = netIface.addresses[j].ip;

                if (address.netmask == netmask && address.ip == getCanonicalIp(ip, netmask))
                    netIface.removeIp(ip);
            }
        }
    }
    // ------------- EVENT HANDLERS -----------------
    this.hMouseUpOnSubnetItem = function(address) { 
        VisInfo.selectDropdownItem(SubnetInfo.subnetFieldset.dropdownSubnets, addressObjToString(address)); 
        SubnetInfo.address = address;
                    
        SubnetInfo.subnetFieldset.btnRemoveSubnet.attr('disabled', null);            
    }
    this.hAddSubnet = function() {
        var input = SubnetInfo.subnetFieldset.inputIpNetmask;
        var address = addressStringToObj(input.property('value'));
        
        var valid = address != null;
        if (valid) {        
            if (getCanonicalIp(address.ip, address.netmask) == address.ip)
                address.ip++;
            
            var possible = getMask(32 - netmaskFullToShort(address.netmask));
            var used = (possible & address.ip) - 1;

            valid = valid && SubnetInfo.netIfaces.length < (possible - used);
        }        
        
        VisInfo.setAndResetWithDelay(input, 'border-color', (!valid) ? 'red' : 'lightgreen', null, 1000);
        
        if (valid) {
            SubnetInfo.addresses.push(address);
            SubnetInfo.addSubnet(address);
            SubnetInfo.loadSubnetList();
        }
    }
    this.hRemoveSubnet =  function() {
        var i = SubnetInfo.addresses.indexOf(SubnetInfo.address);
        if (i >= 0) {
            SubnetInfo.addresses.splice(i, 1);
            SubnetInfo.removeSubnet(SubnetInfo.address);
            SubnetInfo.address = undefined;          
            SubnetInfo.loadSubnetList();
        }
    }
=======
   this.hosts;
   
   //methods
   this.getObjectName = function() {
       return 'SubnetInfo';
   }
   this.showSubnetDetails = function(hosts) {
       this.hosts = hosts;
       if (!this.checkHostsAreConnected(hosts))
           return;
           
       this.subnetFieldset = this.appendSubnetFieldset(Visualizer.fbDetail);
       
       var ddNetIface = this.subnetFieldset.dropdownNetIfaces;
       ddNetIface.item = ddNetIface.item.data(host.netIfaces);
       ddNetIface.item.enter().append('li')
           .on('mouseenter', this.hMouseEnterDropdownItem)
           .on('mouseleave', this.hMouseLeaveDropdownItem)
           .on('mouseup', this.hMouseUpOnNetIfaceItem)
           .attr('class', 'dropdown-item')
           .text(VisInfo.getNetIfaceName);
   }
   this.appendIpFieldset = function(container) {
       var fieldset = container.append('fieldset');
       fieldset.append('legend').text('Ip addresses:');
       
       var dropdownNetIfaces = VisInfo.appendDropDown(fieldset, 'Select net interface');
       var dropdownIpAddresses = VisInfo.appendDropDown(fieldset, 'Select IP', true);
       
       var btnRemoveIp = fieldset.append('input')
           .attr('type', 'button')
           .attr('value', 'Remove IP')
           .attr('disabled', 'disabled');
       var inputIpNetmask = fieldset.append('input')
           .attr('type', 'text')
           .attr('placeholder', 'X.X.X.X/netmask')
           .attr('class', 'input-text')
           .style('width', 120);
       var btnAddIp = fieldset.append('input')
           .attr('type', 'button')
           .attr('value', 'Add IP')
           .attr('disabled', 'disabled');
       
       return {
           fieldset: fieldset,
           dropdownNetIfaces: dropdownNetIfaces,
           dropdownIpAddresses: dropdownIpAddresses,
           btnRemoveIp: btnRemoveIp,
           inputIpNetmask: inputIpNetmask,
           btnAddIp: btnAddIp
       };
   }
   this.loadIpList = function(netIface) {            
       var ddIp = this.ipFieldset.dropdownIpAddresses;
              
       ddIp.item = ddIp.item.data(netIface.addresses);
       ddIp.item.enter().append('li')
           .on('mouseup', this.hMouseUpOnIpAddressItem) 
           .attr('class', 'dropdown-item')
           .text(addressObjToString);
           
       ddIp.item.exit().remove();
       
       if (netIface.addresses.length == 0)
           VisInfo.setDisabledColor(ddIp.pOutput, VisInfo.colorDisabled);
       else
           VisInfo.setDisabledColor(ddIp.pOutput, null);
           
       ddIp.pOutput.text(ddIp.pOutput.node().initialText);
   }
   this.checkHostsAreConnected = function(hosts) {
        var color = [];
        var toColot = hosts.length;
        for (var i = 0; i < Visualizer.nodesData.length; i++ ) {
            var node = Visualizer.nodesData[i];
            if (node.obj instanceof Router) {
                color[node.obj.deviceName] = { host: node.obj, c: hosts.indexOf(node.obj) >= 0 ? 1 : 0 };
            }
        } 

        var stack = new Queue(this, 'bfs stack', 50, true);
        stack.push({ name: hosts[0].deviceName, netIfaceFrom: null });
        var netIfaces = [];

        while (!stack.isEmpty()) {
            var obj = stack.pop();
            if (color[obj.name].c == -1) {
                netIfaces.push(obj.netIfaceFrom);
            }
            else if (color[obj.name].c == 0) {
                var host = color[obj.name].host;
                
                for (var i = 0; i < host.ports.length; i++) {
                    stack.push( {
                        name: host.ports[i].toSendTMDirection.toPort.owner.deviceName,
                        netIfaceFrom: netIfaceFrom
                    });
                }
            }
            else if (color[obj.name].c == 1) {
                color[obj.name].c = -1;
                toColot --;
                var host = color[obj.name].host;
                
                for (var i = 0; i < host.netIfaces.length; i++) {
                    stack.push( {
                        name: host.deviceName,
                        netIfaceFrom: netIfaces[i]
                    });
                }
            }
        }
       
       this.bfs(stack, color, netIfaces);
   }
   // ------------- EVENT HANDLERS -----------------
   this.hMouseUpOnNetIfaceItem = function(netIface) { 
       VisInfo.selectDropdownItem(IpInfo.ipFieldset.dropdownNetIfaces, VisInfo.getNetIfaceName(netIface)); 
       
       IpInfo.ipFieldset.btnAddIp
           .on('click', IpInfo.hAddIp)
           .property('netIface', netIface)
           .attr('disabled', null);
           
       IpInfo.ipFieldset.btnRemoveIp
           .property('netIface', netIface);
           
       IpInfo.loadIpList(netIface); 
   }
   this.hMouseUpOnIpAddressItem = function(address) { 
       VisInfo.selectDropdownItem(IpInfo.ipFieldset.dropdownIpAddresses, addressObjToString(address)); 
       
       IpInfo.ipFieldset.btnRemoveIp
           .on('click', IpInfo.hRemoveIp)
           .property('address', address)
           .attr('disabled', null);
   }
   this.hAddIp = function() {
       var input = IpInfo.ipFieldset.inputIpNetmask;
       var address = addressStringToObj(input.property('value'));
       
       VisInfo.setAndResetWithDelay(input, 'border-color', (address.errMsg) ? 'red' : 'lightgreen', null, 1000);
       
       if (!address.errMsg) {
           this.netIface.addIp(address.ip, address.netmask);
           IpInfo.loadIpList(this.netIface);
       }
   }
   this.hRemoveIp =  function() { 
       this.netIface.removeIp(this.address.ip);
                   
       IpInfo.loadIpList(this.netIface);
   }
   this.hMouseEnterDropdownItem = function(netIface) {
       if (netIface instanceof LoopbackNetIface)
           return;
       VisInfo.markLinkByColor(netIface.lowerObject.toSendTMDirection.owner, 'green');
   }    
   this.hMouseLeaveDropdownItem = function(netIface) {
       if (netIface instanceof LoopbackNetIface)
           return;
       VisInfo.markLinkByColor(netIface.lowerObject.toSendTMDirection.owner, null);
   }
>>>>>>> 3d4ba882b5a2066f1a1a472ddc74044cbbbf9d48
}
