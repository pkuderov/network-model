//var SubnetInfo = new function() {
//    this.hosts;
//    
//    //methods
//    this.getObjectName = function() {
//        return 'SubnetInfo';
//    }
//    this.showSubnetDetails = function(hosts) {
//        this.hosts = hosts;
//        if (!this.checkHostsAreConnected(hosts))
//            return;
//            
//        this.subnetFieldset = this.appendSubnetFieldset(Visualizer.fbDetail);
//        
//        var ddNetIface = this.subnetFieldset.dropdownNetIfaces;
//        ddNetIface.item = ddNetIface.item.data(host.netIfaces);
//        ddNetIface.item.enter().append('li')
//            .on('mouseenter', this.hMouseEnterDropdownItem)
//            .on('mouseleave', this.hMouseLeaveDropdownItem)
//            .on('mouseup', this.hMouseUpOnNetIfaceItem)
//            .attr('class', 'dropdown-item')
//            .text(VisInfo.getNetIfaceName);
//    }
//    this.appendIpFieldset = function(container) {
//        var fieldset = container.append('fieldset');
//        fieldset.append('legend').text('Ip addresses:');
//        
//        var dropdownNetIfaces = VisInfo.appendDropDown(fieldset, 'Select net interface');
//        var dropdownIpAddresses = VisInfo.appendDropDown(fieldset, 'Select IP', true);
//        
//        var btnRemoveIp = fieldset.append('input')
//            .attr('type', 'button')
//            .attr('value', 'Remove IP')
//            .attr('disabled', 'disabled');
//        var inputIpNetmask = fieldset.append('input')
//            .attr('type', 'text')
//            .attr('placeholder', 'X.X.X.X/netmask')
//            .attr('class', 'input-text')
//            .style('width', 120);
//        var btnAddIp = fieldset.append('input')
//            .attr('type', 'button')
//            .attr('value', 'Add IP')
//            .attr('disabled', 'disabled');
//        
//        return {
//            fieldset: fieldset,
//            dropdownNetIfaces: dropdownNetIfaces,
//            dropdownIpAddresses: dropdownIpAddresses,
//            btnRemoveIp: btnRemoveIp,
//            inputIpNetmask: inputIpNetmask,
//            btnAddIp: btnAddIp
//        };
//    }
//    this.loadIpList = function(netIface) {            
//        var ddIp = this.ipFieldset.dropdownIpAddresses;
//               
//        ddIp.item = ddIp.item.data(netIface.addresses);
//        ddIp.item.enter().append('li')
//            .on('mouseup', this.hMouseUpOnIpAddressItem) 
//            .attr('class', 'dropdown-item')
//            .text(addressObjToString);
//            
//        ddIp.item.exit().remove();
//        
//        if (netIface.addresses.length == 0)
//            VisInfo.setDisabledColor(ddIp.pOutput, VisInfo.colorDisabled);
//        else
//            VisInfo.setDisabledColor(ddIp.pOutput, null);
//            
//        ddIp.pOutput.text(ddIp.pOutput.node().initialText);
//    }
//    this.checkHostsAreConnected = function(hosts) {
//        var color = [];
//        for (var i = 0; i < Visualizer.nodesData.length; i++ ) {
//            var node = Visualizer.nodesData[i];
//            if (node.obj instanceof Router) {
//                var j = hosts.indexOf(node.obj);
//                color.push({ host: node.obj, c: j >= 0 });
//            }
//        } 
//        
//        var stack = new Queue(this, 'bfs stack', 50, true);
//        stack.push(hosts[0]);
//        var netIfaces = [];
//        
//        while (!stack.isEmpty()) {
//            var host = stack.pop();
//            
//            if (host 
//        }
//        
//        this.bfs(stack, color, netIfaces);
//    }
//    // ------------- EVENT HANDLERS -----------------
//    this.hMouseUpOnNetIfaceItem = function(netIface) { 
//        VisInfo.selectDropdownItem(IpInfo.ipFieldset.dropdownNetIfaces, VisInfo.getNetIfaceName(netIface)); 
//        
//        IpInfo.ipFieldset.btnAddIp
//            .on('click', IpInfo.hAddIp)
//            .property('netIface', netIface)
//            .attr('disabled', null);
//            
//        IpInfo.ipFieldset.btnRemoveIp
//            .property('netIface', netIface);
//            
//        IpInfo.loadIpList(netIface); 
//    }
//    this.hMouseUpOnIpAddressItem = function(address) { 
//        VisInfo.selectDropdownItem(IpInfo.ipFieldset.dropdownIpAddresses, addressObjToString(address)); 
//        
//        IpInfo.ipFieldset.btnRemoveIp
//            .on('click', IpInfo.hRemoveIp)
//            .property('address', address)
//            .attr('disabled', null);
//    }
//    this.hAddIp = function() {
//        var input = IpInfo.ipFieldset.inputIpNetmask;
//        var address = addressStringToObj(input.property('value'));
//        
//        VisInfo.setAndResetWithDelay(input, 'border-color', (address.errMsg) ? 'red' : 'lightgreen', null, 1000);
//        
//        if (!address.errMsg) {
//            this.netIface.addIp(address.ip, address.netmask);
//            IpInfo.loadIpList(this.netIface);
//        }
//    }
//    this.hRemoveIp =  function() { 
//        this.netIface.removeIp(this.address.ip);
//                    
//        IpInfo.loadIpList(this.netIface);
//    }
//    this.hMouseEnterDropdownItem = function(netIface) {
//        if (netIface instanceof LoopbackNetIface)
//            return;
//        VisInfo.markLinkByColor(netIface.lowerObject.toSendTMDirection.owner, 'green');
//    }    
//    this.hMouseLeaveDropdownItem = function(netIface) {
//        if (netIface instanceof LoopbackNetIface)
//            return;
//        VisInfo.markLinkByColor(netIface.lowerObject.toSendTMDirection.owner, null);
//    }
//}
