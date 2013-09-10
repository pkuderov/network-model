var SendInfo = new function() { 

    this.showSendDetails = function(fromHost, toHost) {
        this.fromHost = fromHost;
        this.toHost = toHost;
        
        this.sendFieldset = this.appendSendFieldset(Visualizer.fbDetail);  
        
        if (fromHost)
            this.loadIpList(this.sendFieldset.dropdownFromHost, fromHost);
            
        if (toHost)
            this.loadIpList(this.sendFieldset.dropdownToHost, toHost);
    }
    this.appendSendFieldset = function(container) {
        var fieldset = container.append('fieldset');
        fieldset.append('legend').text('Send details:');
        
        var dropdownFromHost = VisInfo.appendDropDown(fieldset, 'Select source IP');
        if (this.toHost) {
            var dropdownToHost = VisInfo.appendDropDown(fieldset, 'Select target IP');
        }
            
        var inputFromIp = fieldset.append('input')
            .attr('type', 'text')
            .attr('placeholder', 'Source IP')
            .attr('class', 'input-text')
            .style('width', 100);
        var inputFromPort = fieldset.append('input')
            .attr('type', 'text')
            .attr('placeholder', 'port')
            .attr('class', 'input-text')
            .attr('value', '8080')
            .style('width', 40);

        var inputToIp = fieldset.append('input')
            .attr('type', 'text')
            .attr('placeholder', 'Target IP')
            .attr('class', 'input-text')
            .style('width', 100);
        var inputToPort = fieldset.append('input')
            .attr('type', 'text')
            .attr('placeholder', 'port')
            .attr('class', 'input-text')
            .attr('value', '8080')
            .style('width', 40);
            
        var inputMessage = fieldset.append('input')
            .attr('type', 'text')
            .attr('placeholder', 'Message')
            .attr('class', 'input-text');
            
        var inputXTimes = fieldset.append('input')
            .attr('type', 'text')
            .attr('placeholder', 'xTimes')
            .attr('class', 'input-text')
            .attr('value', '1')
            .style('width', 50);
        var inputTicksDelay = fieldset.append('input')
            .attr('type', 'text')
            .attr('placeholder', 'Ticks delay')
            .attr('class', 'input-text')
            .attr('value', '1')
            .style('width', 80);
            
        var btnSend = fieldset.append('input')
            .attr('type', 'button')
            .attr('value', 'Send message')
            .on('click', this.hSend);
        
        return {
            fieldset: fieldset,
            dropdownFromHost: dropdownFromHost,
            dropdownToHost: dropdownToHost,
            inputFromIp: inputFromIp,
            inputFromPort: inputFromPort,
            inputToIp: inputToIp,
            inputToPort: inputToPort,
            inputMessage: inputMessage,
            inputXTimes: inputXTimes,
            inputTicksDelay: inputTicksDelay,
            btnSend: btnSend
        };
    }
    this.loadIpList = function(container, host) {
        var items = [];
        for (var i = 0; i < host.netIfaces.length; i++) {
            var netIface = host.netIfaces[i];
            items.push({ obj: netIface, str: VisInfo.getNetIfaceName(netIface) });
            for (var j = 0; j < netIface.addresses.length; j++) {
                var ip = netIface.addresses[j].ip;
                items.push({ obj: ip, str: ipIntToString(ip) });
            }
        }
               
        container.item = container.item.data(items);
        container.item.enter().append('li')
            .on('mouseenter', this.hMouseEnterItem)
            .on('mouseleave', this.hMouseLeaveItem)
            .on('mouseup', function(d) { SendInfo.hMouseUpOnIpItem(container, d); })
            .attr('class', 'dropdown-item')
            .text(function(d) { return d.str; })
            .style('font-weight', function(d) { return (d.obj instanceof NetIface) ? 'bold' : null; });
            
        container.item.exit().remove();
        
        if (items.length == 0)
            VisInfo.setDisabledColor(container.pOutput, VisInfo.colorDisabled);
        else
            VisInfo.setDisabledColor(container.pOutput, null);
            
        container.pOutput.text(container.pOutput.node().initialText);
    }
    // ------------- EVENT HANDLERS -----------------
    this.hMouseUpOnIpItem = function(container, d) { 
        if (d.obj instanceof NetIface)
            return;
            
        var ip = d.obj;
        VisInfo.selectDropdownItem(container, ipIntToString(ip)); 
        
        if (container == SendInfo.dropdownFromHost) {
            SendInfo.sendFieldset.inputFromIp
                .text('fromIp', ip);
        }
        else {
            SendInfo.sendFieldset.btnSend
                .property('toIp', ip);
        }
    }
    this.hSend = function() {
        var fieldset = SendInfo.sendFieldset;
        
        var fromIp = ipStringToInt(fieldset.inputFromIp.property('value')); 
        var fromPort = (+fieldset.inputFromPort.property('value'));   
                
        var toIp = ipStringToInt(fieldset.inputToIp.property('value'));     
        var toPort = (+fieldset.inputToPort.property('value')); 
        
        var message = fieldset.inputMessage.property('value');
        
        var xTimes = (+fieldset.inputXTimes.property('value'));
        var ticksDelay = (+fieldset.inputTicksDelay.property('value'));
        
        VisInfo.setAndResetWithDelay(fieldset.inputFromIp, 'border-color', (fromIp.errMsg) ? 'red' : 'lightgreen', null, 1000);
        VisInfo.setAndResetWithDelay(fieldset.inputToIp, 'border-color', (toIp.errMsg) ? 'red' : 'lightgreen', null, 1000);
        
        if (!fromIp.errMsg && !toPort.errMsg) {
            SendInfo.fromHost.protocolHandlers.UDP.send(fromIp, fromPort, toIp, toPort, message);
        }
    }
    this.hMouseEnterDropdownItem = function(d) {
        var netIface = d.obj;
        
        if (!(netIface instanceof NetIface))
            return;
        if (netIface instanceof LoopbackNetIface)
            return;
        VisInfo.markLinkByColor(netIface.lowerObject.toSendTMDirection.owner, 'green');
    }    
    this.hMouseLeaveDropdownItem = function(d) {
        var netIface = d.obj;
        
        if (!(netIface instanceof NetIface))
            return;
        if (netIface instanceof LoopbackNetIface)
            return;
        VisInfo.markLinkByColor(netIface.lowerObject.toSendTMDirection.owner, null);
    }
}
